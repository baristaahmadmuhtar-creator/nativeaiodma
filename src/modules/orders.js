'use strict';
const crypto = require('node:crypto');
const { requireValue } = require('../shared/errors');
const { priceCart } = require('./pricing');
const { idempotent, audit, emit } = require('./transactions');

async function catalog(client, tenantId, lock = false) {
  const rows = await client.query(`SELECT * FROM catalog_items WHERE tenant_id=$1 AND NOT archived ORDER BY id${lock ? ' FOR UPDATE' : ''}`, [tenantId]);
  return rows.rows.map(r => ({ ...r.content, id: r.id, available: r.available, stock: r.stock, version: r.version }));
}

function orderView(row) {
  const s = row.snapshot;
  return { id: row.id, orderNumber: row.id.slice(0,8).toUpperCase(), merchantId: row.tenant_id,
    tableNum: row.table_id, table: `Meja ${row.table_id}`, items: s.items,
    subtotal: s.subtotalMinor / 100, tax: s.taxMinor / 100, total: s.totalMinor / 100,
    ...s, paymentMethod: s.paymentMethod, paymentStatus: row.payment_status.toUpperCase(), status: row.status,
    version: row.version, createdAt: row.created_at, updatedAt: row.updated_at };
}

function createOrders(db) {
  async function getCart(client, principal, lock = false) {
    await client.query('INSERT INTO carts(tenant_id,session_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [principal.tenant_id, principal.id]);
    return (await client.query(`SELECT * FROM carts WHERE tenant_id=$1 AND session_id=$2${lock ? ' FOR UPDATE' : ''}`,
      [principal.tenant_id, principal.id])).rows[0];
  }
  async function tenant(client, id) {
    const row = (await client.query('SELECT * FROM tenants WHERE id=$1 FOR SHARE', [id])).rows[0];
    requireValue(row?.published && !row.config.orderingPaused, 'ORDERING_CLOSED', 'Outlet belum menerima pesanan.', 409);
    return { ...row.config, ...row, ...{ taxRate: row.config.taxRate || 0, serviceRate: row.config.serviceRate || 0 } };
  }
  async function replaceCart(principal, body, key) {
    return db.transaction(principal.tenant_id, c => idempotent(c, principal, 'cart', key, body, async () => {
      const cart = await getCart(c, principal, true);
      requireValue(body.expectedVersion === cart.version, 'CART_STALE', 'Keranjang telah berubah. Muat ulang.', 409);
      requireValue(Array.isArray(body.lines) && body.lines.length <= 50, 'INVALID_CART', 'Keranjang tidak valid.');
      const t = await tenant(c, principal.tenant_id);
      requireValue(body.lines.every(l => Number.isInteger(l.qty) && l.qty <= 99), 'INVALID_QUANTITY', 'Maksimal 99 item per baris.');
      if (body.lines.length) priceCart({ tenant: t, catalog: await catalog(c, t.id), lines: body.lines });
      const lines = body.lines.map(line => ({ menuId: line.menuId, qty: line.qty, optionIds: line.optionIds || [] }));
      return (await c.query('UPDATE carts SET lines=$3,version=version+1 WHERE tenant_id=$1 AND session_id=$2 RETURNING *',
        [t.id, principal.id, JSON.stringify(lines)])).rows[0];
    }));
  }
  async function quote(principal, body) {
    return db.transaction(principal.tenant_id, async c => {
      const cart = await getCart(c, principal, true);
      requireValue(cart.lines.length > 0, 'EMPTY_CART', 'Keranjang masih kosong.');
      requireValue(cart.version === body.expectedVersion, 'CART_STALE', 'Keranjang telah berubah.', 409);
      const t = await tenant(c, principal.tenant_id);
      let promo;
      if (body.promoCode) {
        promo = (await c.query("SELECT content FROM tenant_resources WHERE tenant_id=$1 AND kind='promo' AND id=$2", [t.id, body.promoCode])).rows[0]?.content;
        requireValue(promo, 'PROMO_INVALID', 'Promo tidak ditemukan.');
      }
      const items = await catalog(c, t.id);
      const priced = priceCart({ tenant: t, catalog: items, lines: cart.lines, promo, now: Date.now() });
      requireValue(priced.totalMinor > 0, 'ZERO_TOTAL_UNSUPPORTED', 'Pesanan tanpa biaya perlu diproses langsung oleh kasir.');
      const snapshot = { ...priced, currency: t.currency, lines: cart.lines,
        catalogVersions: Object.fromEntries(cart.lines.map(l => [l.menuId, items.find(i => i.id === l.menuId).version])), promoCode: body.promoCode || null };
      const result = (await c.query(`INSERT INTO quotes(tenant_id,id,session_id,cart_version,tenant_version,snapshot,expires_at)
        VALUES($1,$2,$3,$4,$5,$6,now()+interval '5 minutes') RETURNING *`,
      [t.id, crypto.randomUUID(), principal.id, cart.version, t.version, JSON.stringify(snapshot)])).rows[0];
      return { id: result.id, ...snapshot, expiresAt: result.expires_at, cartVersion: cart.version };
    });
  }
  async function submit(principal, body, key) {
    return db.transaction(principal.tenant_id, c => idempotent(c, principal, 'order', key, body, async () => {
      requireValue(body.confirmed === true, 'CONFIRMATION_REQUIRED', 'Konfirmasi ringkasan pesanan terlebih dahulu.');
      requireValue(['CASH','MANUAL_TRANSFER'].includes(body.paymentMethod), 'PAYMENT_UNAVAILABLE', 'Metode pembayaran belum tersedia.');
      requireValue(!body.paymentStatus, 'PAYMENT_STATUS_FORBIDDEN', 'Status pembayaran ditetapkan kasir.');
      const t = await tenant(c, principal.tenant_id);
      const q = (await c.query('SELECT * FROM quotes WHERE tenant_id=$1 AND id=$2 AND session_id=$3 FOR UPDATE', [t.id, body.quoteId, principal.id])).rows[0];
      requireValue(q && new Date(q.expires_at) > new Date(), 'QUOTE_EXPIRED', 'Ringkasan kedaluwarsa. Periksa harga terbaru.', 409);
      const cart = await getCart(c, principal, true);
      requireValue(q.cart_version === cart.version && q.tenant_version === t.version, 'QUOTE_STALE', 'Pesanan atau harga telah berubah.', 409);
      const items = await catalog(c, t.id, true);
      requireValue(q.snapshot.lines.every(l => {
        const i = items.find(item => item.id === l.menuId);
        return i && i.available && i.version === q.snapshot.catalogVersions[l.menuId];
      }), 'QUOTE_STALE', 'Ketersediaan atau harga menu telah berubah.', 409);
      for (const item of items.filter(i => i.stock !== null)) {
        const qty = q.snapshot.lines.filter(l => l.menuId === item.id).reduce((n,l) => n + l.qty,0);
        requireValue(qty <= item.stock, 'STOCK_UNAVAILABLE', 'Stok tidak mencukupi.', 409);
        if (qty) await c.query('UPDATE catalog_items SET stock=stock-$3 WHERE tenant_id=$1 AND id=$2', [t.id,item.id,qty]);
      }
      // Promo limits are validated inside the same tenant transaction before redemption.
      if (q.snapshot.promoCode) {
        const promo = (await c.query("SELECT * FROM tenant_resources WHERE tenant_id=$1 AND kind='promo' AND id=$2 FOR UPDATE", [t.id,q.snapshot.promoCode])).rows[0];
        requireValue(promo && promo.content.active !== false, 'PROMO_EXPIRED', 'Promo tidak lagi tersedia.', 409);
        const recalculated = priceCart({ tenant: t, catalog: items, lines: q.snapshot.lines, promo: promo.content, now: Date.now() });
        requireValue(recalculated.totalMinor === q.snapshot.totalMinor, 'QUOTE_STALE', 'Promo telah berubah.', 409);
        requireValue(!promo.content.limit || (promo.content.redemptions || 0) < promo.content.limit, 'PROMO_LIMIT', 'Kuota promo habis.', 409);
        await c.query("UPDATE tenant_resources SET content=jsonb_set(content,'{redemptions}',to_jsonb($3::integer)),version=version+1 WHERE tenant_id=$1 AND kind='promo' AND id=$2",
          [t.id,q.snapshot.promoCode,(promo.content.redemptions || 0)+1]);
      }
      const row = (await c.query(`INSERT INTO orders(tenant_id,id,session_id,quote_id,table_id,snapshot)
        VALUES($1,$2,$3,$4,$5,$6) RETURNING *`, [t.id,crypto.randomUUID(),principal.id,q.id,principal.table_id,
        JSON.stringify({ ...q.snapshot, paymentMethod: body.paymentMethod })])).rows[0];
      await c.query("UPDATE carts SET lines='[]',version=version+1 WHERE tenant_id=$1 AND session_id=$2", [t.id,principal.id]);
      const order = orderView(row);
      await audit(c,principal,'ORDER_CREATED',row.id,{ totalMinor: q.snapshot.totalMinor });
      await emit(c,t.id,'ORDER_CREATED',{order},principal.id);
      return order;
    }));
  }
  async function transition(principal, id, body, key) {
    return db.transaction(principal.tenant_id, c => idempotent(c,principal,'order-status',key,{id,...body},async () => {
      const o = (await c.query('SELECT * FROM orders WHERE tenant_id=$1 AND id=$2 FOR UPDATE',[principal.tenant_id,id])).rows[0];
      requireValue(o,'NOT_FOUND','Pesanan tidak ditemukan.',404);
      requireValue(o.version === body.expectedVersion,'ORDER_STALE','Status telah berubah.',409);
      const allowed = { received:['accepted','rejected','cancelled'], accepted:['preparing','cancelled'], preparing:['ready','cancelled'], ready:['served','cancelled'], served:['completed'] };
      requireValue(allowed[o.status]?.includes(body.status),'INVALID_TRANSITION','Perubahan status tidak diizinkan.',409);
      if (['cancelled','rejected'].includes(body.status)) {
        requireValue(['owner','manager'].includes(principal.role) && typeof body.reason === 'string' && body.reason.trim().length >= 3,'REASON_REQUIRED','Manager dan alasan diperlukan.',403);
        if (['received','accepted'].includes(o.status)) {
          for (const line of o.snapshot.lines) await c.query('UPDATE catalog_items SET stock=stock+$3 WHERE tenant_id=$1 AND id=$2 AND stock IS NOT NULL',[principal.tenant_id,line.menuId,line.qty]);
        }
      }
      if (['preparing','completed'].includes(body.status)) {
        requireValue(o.payment_status === 'paid','PAYMENT_REQUIRED','Pembayaran perlu diverifikasi dahulu.',409);
      }
      const row = (await c.query('UPDATE orders SET status=$3,version=version+1,updated_at=now() WHERE tenant_id=$1 AND id=$2 RETURNING *',[principal.tenant_id,id,body.status])).rows[0];
      await audit(c,principal,'ORDER_STATUS_CHANGED',id,{from:o.status,to:body.status,reason:body.reason});
      await emit(c,principal.tenant_id,'ORDER_STATUS_CHANGED',{order:orderView(row)},o.session_id);
      return orderView(row);
    }));
  }
  async function payment(principal, id, body, key) {
    return db.transaction(principal.tenant_id,c => idempotent(c,principal,'payment',key,{id,...body},async () => {
      const o = (await c.query('SELECT * FROM orders WHERE tenant_id=$1 AND id=$2 FOR UPDATE',[principal.tenant_id,id])).rows[0];
      requireValue(o,'NOT_FOUND','Pesanan tidak ditemukan.',404);
      requireValue(body.expectedVersion === o.version,'ORDER_STALE','Status telah berubah.',409);
      requireValue(!['cancelled','rejected'].includes(o.status),'ORDER_CLOSED','Pesanan telah ditutup.',409);
      requireValue(o.payment_status === 'unpaid' && body.amountMinor === o.snapshot.totalMinor,'PAYMENT_CONFLICT','Jumlah atau status pembayaran tidak cocok.',409);
      requireValue(typeof body.reference === 'string' && body.reference.trim().length >= 3 && body.reference.length <= 200,'REFERENCE_REQUIRED','Catatan verifikasi diperlukan.');
      await c.query(`INSERT INTO payment_events(tenant_id,id,order_id,kind,amount_minor,actor_id,reference)
        VALUES($1,$2,$3,'settlement',$4,$5,$6)`,[principal.tenant_id,crypto.randomUUID(),id,body.amountMinor,principal.user_id,body.reference]);
      const row = (await c.query("UPDATE orders SET payment_status='paid',version=version+1,updated_at=now() WHERE tenant_id=$1 AND id=$2 RETURNING *",[principal.tenant_id,id])).rows[0];
      await audit(c,principal,'PAYMENT_SETTLED',id,{amountMinor:body.amountMinor,reference:body.reference});
      await emit(c,principal.tenant_id,'ORDER_PAID',{order:orderView(row)},o.session_id);
      return orderView(row);
    }));
  }
  return { getCart, replaceCart, quote, submit, transition, payment };
}

module.exports = { createOrders, catalog, orderView };

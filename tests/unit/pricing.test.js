'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { priceCart, toMinorUnits, fromMinorUnits, currencyScale } = require('../../src/modules/pricing');

function fixture() {
  return {
    tenant: { currency: 'BND', taxRate: 0, serviceRate: 0 },
    catalog: [{ id: 'coffee', name: 'Coffee', price: '4.50', available: true,
      modifierGroups: [{ id: 'extras', min: 0, max: 2, options: [
        { id: 'milk', name: 'Oat milk', price: '0.75' },
        { id: 'shot', name: 'Extra shot', price: '1.00' }
      ] }] }],
    lines: [{ menuId: 'coffee', qty: 2, optionIds: ['milk'] }]
  };
}

function fails(input, code) {
  assert.throws(() => priceCart(input), error => {
    assert.equal(error.status, 422);
    assert.equal(error.code, code);
    assert.equal(typeof error.message, 'string');
    assert.ok(error.message.length);
    return true;
  });
}

test('FIN-07 BND fixture and canonical names ignore forged financial fields', () => {
  const input = fixture();
  Object.assign(input.lines[0], { name: 'Free coffee', price: 0, unitPriceMinor: 0, totalMinor: 0, discount: 100 });
  const result = priceCart(input);
  assert.deepEqual(result, {
    currency: 'BND', scale: 100, subtotalMinor: 1050, discountMinor: 0,
    serviceMinor: 0, taxMinor: 0, totalMinor: 1050,
    items: [{ menuId: 'coffee', name: 'Coffee', qty: 2, optionIds: ['milk'],
      modifiers: [{ id: 'milk', groupId: 'extras', name: 'Oat milk', priceMinor: 75 }],
      unitPriceMinor: 525, lineTotalMinor: 1050 }]
  });
});

test('FIN-07 IDR fixture retains internal hundredths', () => {
  const input = fixture();
  input.tenant = { currency: 'IDR', taxRate: 10, serviceRate: 0 };
  input.catalog[0].price = 25000;
  input.lines[0].optionIds = [];
  input.promo = { type: 'percent', value: 10, active: true };
  const result = priceCart(input);
  assert.equal(result.subtotalMinor, 5000000);
  assert.equal(result.discountMinor, 500000);
  assert.equal(result.taxMinor, 450000);
  assert.equal(result.totalMinor, 4950000);
  assert.equal(fromMinorUnits(result.totalMinor, 'IDR'), '49500.00');
});

test('discount then service then exclusive tax on net plus rounded service', () => {
  const input = fixture();
  input.catalog[0].price = 100;
  input.lines = [{ menuId: 'coffee', qty: 1 }];
  input.tenant.serviceRate = 10;
  input.tenant.taxRate = 10;
  input.promo = { type: 'fixed', value: 10, minSpend: 100, active: true };
  const result = priceCart(input);
  assert.deepEqual([result.subtotalMinor, result.discountMinor, result.serviceMinor, result.taxMinor, result.totalMinor],
    [10000, 1000, 900, 990, 10890]);
});

test('round half-up at catalog price and charge boundaries, preserving line reconciliation', () => {
  assert.equal(toMinorUnits('1.005', 'BND'), 101);
  assert.equal(toMinorUnits('2.675', 'BND'), 268);
  const input = fixture();
  input.catalog[0].price = '0.025';
  input.catalog[0].modifierGroups[0].options[0].price = '0.005';
  input.tenant.serviceRate = '12.5';
  input.tenant.taxRate = '50';
  const result = priceCart(input);
  assert.equal(result.items[0].unitPriceMinor, 4);
  assert.equal(result.subtotalMinor, 8);
  assert.equal(result.serviceMinor, 1);
  assert.equal(result.taxMinor, 5);
  assert.equal(result.totalMinor, 14);
  input.promo = { type: 'percent', value: '6.25', active: true };
  assert.equal(priceCart(input).discountMinor, 1);
});

test('promo caps, minimum spend and zero total', () => {
  const input = fixture();
  for (const type of ['percent', 'fixed']) {
    input.promo = { type, value: 100, maxDiscount: 2, minSpend: '10.50', active: true };
    assert.equal(priceCart(input).discountMinor, 200);
    input.promo.maxDiscount = 0;
    assert.equal(priceCart(input).discountMinor, 0);
  }
  input.promo = { type: 'fixed', value: 100, active: true };
  assert.equal(priceCart(input).totalMinor, 0);
  input.promo.minSpend = '10.51';
  fails(input, 'PROMO_MIN_SPEND');
});

test('scheduled promo uses explicit server time, inclusive start and exclusive end', () => {
  const input = fixture();
  input.promo = { type: 'percent', value: 10, active: true,
    startsAt: '2026-09-20T08:00:00+08:00', endsAt: '2026-09-21T00:00:00Z' };
  fails(input, 'INVALID_PROMO_TIME');
  input.now = '2026-09-19T23:59:59Z';
  fails(input, 'PROMO_NOT_STARTED');
  input.now = '2026-09-20T00:00:00Z';
  assert.equal(priceCart(input).discountMinor, 105);
  input.now = Date.parse('2026-09-21T00:00:00Z') - 1;
  assert.equal(priceCart(input).discountMinor, 105);
  input.now += 1;
  fails(input, 'PROMO_EXPIRED');
  input.promo.endsAt = input.promo.startsAt;
  fails(input, 'INVALID_PROMO_TIME');
  input.promo.startsAt = '2026-09-20T00:00:00';
  fails(input, 'INVALID_PROMO_TIME');
});

test('snapshots are detached, deeply frozen and deterministic without mutating inputs', () => {
  const input = fixture();
  input.lines[0].optionIds = ['shot', 'milk'];
  const before = structuredClone(input);
  const result = priceCart(input);
  assert.deepEqual(input, before);
  input.lines[0].optionIds.reverse();
  assert.deepEqual(priceCart(input), result);
  input.catalog[0].name = 'Changed';
  input.catalog[0].modifierGroups[0].options[0].name = 'Changed milk';
  assert.equal(result.items[0].name, 'Coffee');
  assert.equal(result.items[0].modifiers[0].name, 'Oat milk');
  for (const value of [result, result.items, result.items[0], result.items[0].optionIds,
    result.items[0].modifiers, result.items[0].modifiers[0]]) assert.ok(Object.isFrozen(value));
  assert.throws(() => { result.items[0].unitPriceMinor = 0; }, TypeError);
});

test('invalid quantities are never coerced', () => {
  for (const qty of [0, -1, 1.1, '2', null, undefined, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    const input = fixture();
    input.lines[0].qty = qty;
    fails(input, 'INVALID_QUANTITY');
  }
});

test('reject unknown items, stock false, foreign options, duplicate and invalid selections', () => {
  const cases = [
    [x => { x.lines[0].menuId = 'missing'; }, 'UNKNOWN_ITEM'],
    [x => { x.catalog[0].available = false; }, 'ITEM_UNAVAILABLE'],
    [x => { x.lines[0].optionIds = ['missing']; }, 'UNKNOWN_OPTION'],
    [x => { x.lines[0].optionIds = ['milk', 'milk']; }, 'DUPLICATE_OPTION'],
    [x => { x.lines[0].optionIds = 'milk'; }, 'INVALID_OPTIONS'],
    [x => { x.lines[0].optionIds = [null]; }, 'INVALID_OPTIONS'],
    [x => { x.catalog[0].modifierGroups[0].min = 1; x.lines[0].optionIds = []; }, 'INVALID_SELECTION'],
    [x => { x.catalog[0].modifierGroups[0].max = 1; x.lines[0].optionIds = ['milk', 'shot']; }, 'INVALID_SELECTION'],
    [x => { x.catalog[0].modifierGroups[0].options[0].available = false; }, 'OPTION_UNAVAILABLE'],
    [x => { x.catalog.push(structuredClone(x.catalog[0])); }, 'INVALID_CATALOG'],
    [x => { x.catalog[0].modifierGroups[0].options[1].id = 'milk'; }, 'INVALID_CATALOG'],
    [x => { x.catalog[0].modifierGroups[0].min = -1; }, 'INVALID_CATALOG']
  ];
  for (const [mutate, code] of cases) { const input = fixture(); mutate(input); fails(input, code); }
  const input = fixture();
  input.catalog.push({ id: 'tea', name: 'Tea', price: 1, available: true });
  input.lines[0].menuId = 'tea';
  fails(input, 'UNKNOWN_OPTION');
});

test('currency, amount, rate, promo and tax mode validation', () => {
  for (const currency of ['USD', 'bnd', '', null]) {
    const input = fixture(); input.tenant.currency = currency; fails(input, 'INVALID_CURRENCY');
  }
  for (const value of [-1, '-0.01', NaN, Infinity, '', ' ', '0x10', true, null, {}, []]) {
    const input = fixture(); input.catalog[0].price = value; fails(input, 'INVALID_AMOUNT');
  }
  for (const field of ['taxRate', 'serviceRate']) {
    const input = fixture(); input.tenant[field] = 101; fails(input, 'INVALID_RATE');
  }
  for (const [promo, code] of [
    [{ type: 'percent', value: 101, active: true }, 'INVALID_RATE'],
    [{ type: 'fixed', value: -1, active: true }, 'INVALID_AMOUNT'],
    [{ type: 'fixed', value: 1, active: false }, 'PROMO_INACTIVE'],
    [{ type: 'stacked', value: 1, active: true }, 'INVALID_PROMO']
  ]) { const input = fixture(); input.promo = promo; fails(input, code); }
  const input = fixture(); input.tenant.taxInclusive = true; fails(input, 'UNSUPPORTED_TAX_MODE');
});

test('safe integer limits cover conversion, unit, line, subtotal and final total', () => {
  assert.equal(toMinorUnits('90071992547409.91', 'BND'), Number.MAX_SAFE_INTEGER);
  assert.equal(fromMinorUnits(Number.MAX_SAFE_INTEGER, 'IDR'), '90071992547409.91');
  assert.throws(() => toMinorUnits('90071992547409.92', 'BND'), { code: 'UNSAFE_AMOUNT', status: 422 });
  for (const value of [-1, 0.5, '100', Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => fromMinorUnits(value, 'BND'), { code: 'UNSAFE_AMOUNT', status: 422 });
  }
  const input = fixture();
  input.catalog[0].price = '90071992547409.91';
  input.lines[0].qty = 1;
  fails(input, 'UNSAFE_AMOUNT'); // Modifier makes unit unsafe.
  input.lines[0].optionIds = [];
  input.lines[0].qty = 2;
  fails(input, 'UNSAFE_AMOUNT');
  input.lines[0].qty = 1;
  input.lines.push({ ...input.lines[0] });
  fails(input, 'UNSAFE_AMOUNT');
  input.lines.pop();
  input.tenant.taxRate = 1;
  fails(input, 'UNSAFE_AMOUNT');
});

test('empty cart, zero prices and multiple lines reconcile', () => {
  const input = fixture(); input.lines = [];
  assert.equal(priceCart(input).totalMinor, 0);
  input.catalog[0].price = 0;
  input.lines = [{ menuId: 'coffee', qty: 1 }, { menuId: 'coffee', qty: 3, optionIds: ['milk'] }];
  const result = priceCart(input);
  assert.equal(result.totalMinor, 225);
  assert.equal(result.subtotalMinor, result.items.reduce((sum, item) => sum + item.lineTotalMinor, 0));
  for (const currency of ['BND', 'IDR']) {
    assert.equal(currencyScale(currency), 100);
    assert.equal(fromMinorUnits(toMinorUnits('0.10', currency), currency), '0.10');
  }
});

test('malformed request shapes return structured validation errors', () => {
  for (const input of [undefined, null, [], {}, { tenant: null }, { ...fixture(), lines: null },
    { ...fixture(), catalog: {} }, { ...fixture(), lines: [null] },
    { ...fixture(), lines: new Array(1) }]) fails(input, 'INVALID_INPUT');
});

test('required selections are enforced independently for each modifier group', () => {
  const input = fixture();
  input.catalog[0].modifierGroups.push({ id: 'size', min: 1, max: 1,
    options: [{ id: 'small', name: 'Small', price: 0 }, { id: 'large', name: 'Large', price: 1 }] });
  fails(input, 'INVALID_SELECTION');
  input.lines[0].optionIds.push('small');
  assert.equal(priceCart(input).totalMinor, 1050);
  input.lines[0].optionIds.push('large');
  fails(input, 'INVALID_SELECTION');
});

test('cent-based charges reconcile across a range of rounding boundaries', () => {
  for (let cents = 1; cents <= 100; cents++) {
    const input = fixture();
    input.catalog[0].price = fromMinorUnits(cents, 'BND');
    input.lines = [{ menuId: 'coffee', qty: 3 }];
    input.promo = { type: 'percent', value: 10, active: true };
    input.tenant.serviceRate = 5;
    input.tenant.taxRate = 10;
    const result = priceCart(input);
    // Independent integer arithmetic oracle for these bounded fixtures.
    const subtotal = cents * 3;
    const discount = Math.floor((subtotal * 10 + 50) / 100);
    const service = Math.floor(((subtotal - discount) * 5 + 50) / 100);
    const tax = Math.floor(((subtotal - discount + service) * 10 + 50) / 100);
    assert.deepEqual([result.subtotalMinor, result.discountMinor, result.serviceMinor, result.taxMinor, result.totalMinor],
      [subtotal, discount, service, tax, subtotal - discount + service + tax]);
  }
});

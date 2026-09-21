'use strict';

const Decimal = require('decimal.js').clone({ precision: 100, rounding: 4 });
const MAX_MINOR = new Decimal(Number.MAX_SAFE_INTEGER);

function reject(code, message) {
  const error = new Error(message);
  error.code = code;
  error.status = 422;
  throw error;
}

function currencyScale(currency) {
  if (currency !== 'BND' && currency !== 'IDR') {
    reject('INVALID_CURRENCY', 'Currency must be BND or IDR.');
  }
  return 100;
}

function decimal(value, field) {
  if ((typeof value !== 'string' && typeof value !== 'number') ||
      (typeof value === 'number' && (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER)) ||
      String(value).length > 64 || !/^\d+(?:\.\d+)?$/.test(String(value))) {
    reject('INVALID_AMOUNT', `${field} must be a nonnegative decimal number or decimal string.`);
  }
  return new Decimal(value);
}

function safeMinor(value, field) {
  const rounded = value.toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  if (!rounded.isFinite() || rounded.isNegative() || rounded.gt(MAX_MINOR)) {
    reject('UNSAFE_AMOUNT', `${field} exceeds the safe minor-unit range.`);
  }
  return rounded.toNumber();
}

function toMinorUnits(value, currency) {
  const amount = decimal(value, 'Amount').times(currencyScale(currency));
  if (amount.gt(MAX_MINOR)) reject('UNSAFE_AMOUNT', 'Amount exceeds the safe minor-unit range.');
  return safeMinor(amount, 'Amount');
}

// Return an exact decimal string, avoiding a lossy floating-point round trip.
function fromMinorUnits(value, currency) {
  const scale = currencyScale(currency);
  if (!Number.isSafeInteger(value) || value < 0) {
    reject('UNSAFE_AMOUNT', 'Minor units must be a nonnegative safe integer.');
  }
  return new Decimal(value).div(scale).toFixed(2);
}

function record(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    reject('INVALID_INPUT', `${field} must be an object.`);
  }
}

function validId(value) {
  return (typeof value === 'string' && value.trim().length > 0) ||
    (Number.isSafeInteger(value) && value >= 0);
}

function named(value, field) {
  record(value, field);
  if (!validId(value.id) || typeof value.name !== 'string' || !value.name.trim()) {
    reject('INVALID_CATALOG', `${field} must have a valid ID and name.`);
  }
}

function rate(value, field) {
  const result = decimal(value, field);
  if (result.gt(100)) reject('INVALID_RATE', `${field} must be between 0 and 100 percent.`);
  return result;
}

function timestamp(value, field) {
  // Require an explicit timezone for strings; never depend on the host timezone.
  const instant = typeof value === 'number' ? value :
    typeof value === 'string' && /T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? Date.parse(value) : NaN;
  if (!Number.isSafeInteger(instant) || Math.abs(instant) > 8640000000000000) {
    reject('INVALID_PROMO_TIME', `${field} must be epoch milliseconds or an ISO timestamp with timezone.`);
  }
  return instant;
}

function discountFor(promo, subtotal, currency, now) {
  if (promo === undefined || promo === null) return 0;
  record(promo, 'Promo');
  if (promo.active !== true) reject('PROMO_INACTIVE', 'Promo is not active.');
  if (promo.type !== 'percent' && promo.type !== 'fixed') reject('INVALID_PROMO', 'Unknown promo type.');
  const value = promo.type === 'percent' ? rate(promo.value, 'Promo percent') : toMinorUnits(promo.value, currency);
  const minimum = promo.minSpend === undefined ? 0 : toMinorUnits(promo.minSpend, currency);
  const cap = promo.maxDiscount === undefined ? subtotal : toMinorUnits(promo.maxDiscount, currency);
  const starts = promo.startsAt == null ? null : timestamp(promo.startsAt, 'Promo startsAt');
  const ends = promo.endsAt == null ? null : timestamp(promo.endsAt, 'Promo endsAt');
  if (starts !== null && ends !== null && starts >= ends) reject('INVALID_PROMO_TIME', 'Promo start must precede end.');
  if (starts !== null || ends !== null) {
    const instant = timestamp(now, 'Server now');
    if (starts !== null && instant < starts) reject('PROMO_NOT_STARTED', 'Promo has not started.');
    if (ends !== null && instant >= ends) reject('PROMO_EXPIRED', 'Promo has expired.');
  }
  if (subtotal < minimum) reject('PROMO_MIN_SPEND', 'Subtotal does not meet promo minimum spend.');
  const requested = promo.type === 'percent' ? new Decimal(subtotal).times(value).div(100) : new Decimal(value);
  return safeMinor(Decimal.min(requested, cap, subtotal), 'Discount');
}

/**
 * Trusted server inputs: tenant, catalog, promo and optional now (epoch ms/ISO).
 * Client lines supply only menuId, qty and optionIds; other line fields are ignored.
 * Prices/promo fixed values are major units; rates are percentages (10 = 10%).
 * Round each catalog price to minor units, then discount, service and tax half-up.
 * Service is on discounted subtotal; exclusive tax is on net plus service.
 * Inclusive tax/custom bases are not supported. Quote TTL/version checks, stock
 * reservation, atomic promo redemption/limits and settlement belong to callers.
 */
function priceCart(input) {
  record(input, 'Pricing input');
  const { tenant, catalog, lines, promo, now } = input;
  record(tenant, 'Tenant');
  const { currency } = tenant;
  const scale = currencyScale(currency);
  if (tenant.taxInclusive === true || (tenant.taxMode !== undefined && tenant.taxMode !== 'exclusive')) {
    reject('UNSUPPORTED_TAX_MODE', 'Only exclusive tax is supported.');
  }
  const taxRate = rate(tenant.taxRate, 'Tax rate');
  const serviceRate = rate(tenant.serviceRate, 'Service rate');
  if (!Array.isArray(catalog) || !Array.isArray(lines)) reject('INVALID_INPUT', 'Catalog and lines must be arrays.');
  const menu = new Map();
  for (const item of catalog) {
    named(item, 'Catalog item');
    if (menu.has(item.id)) reject('INVALID_CATALOG', 'Duplicate catalog item ID.');
    menu.set(item.id, item);
  }

  let subtotal = new Decimal(0);
  const items = Array.from(lines).map((line, index) => {
    record(line, `Line ${index}`);
    if (!validId(line.menuId) || !menu.has(line.menuId)) reject('UNKNOWN_ITEM', `Line ${index} has an unknown menuId.`);
    if (!Number.isSafeInteger(line.qty) || line.qty < 1) reject('INVALID_QUANTITY', `Line ${index} qty must be a positive safe integer.`);
    const item = menu.get(line.menuId);
    if (item.available !== true) reject('ITEM_UNAVAILABLE', `Menu item ${item.id} is unavailable.`);
    const ids = line.optionIds === undefined ? [] : line.optionIds;
    if (!Array.isArray(ids) || ids.some(id => !validId(id))) reject('INVALID_OPTIONS', `Line ${index} optionIds must be an array of IDs.`);
    if (new Set(ids).size !== ids.length) reject('DUPLICATE_OPTION', `Line ${index} contains duplicate options.`);
    const groups = item.modifierGroups === undefined ? [] : item.modifierGroups;
    if (!Array.isArray(groups)) reject('INVALID_CATALOG', 'Modifier groups must be an array.');
    const options = new Map();
    const groupIds = new Set();
    for (const group of groups) {
      record(group, 'Modifier group');
      if (!validId(group.id) || groupIds.has(group.id) || !Array.isArray(group.options) ||
          !Number.isSafeInteger(group.min) || !Number.isSafeInteger(group.max) ||
          group.min < 0 || group.max < group.min || group.max > group.options.length) {
        reject('INVALID_CATALOG', 'Modifier group IDs and selection bounds must be valid.');
      }
      groupIds.add(group.id);
      for (const option of group.options) {
        named(option, 'Modifier option');
        if (options.has(option.id)) reject('INVALID_CATALOG', 'Option IDs must be unique within a menu item.');
        options.set(option.id, { option, groupId: group.id });
      }
    }
    for (const id of ids) {
      if (!options.has(id)) reject('UNKNOWN_OPTION', `Line ${index} has an option outside its menu item.`);
    }
    const selected = new Set(ids);
    for (const group of groups) {
      const count = group.options.filter(option => selected.has(option.id)).length;
      if (count < group.min || count > group.max) reject('INVALID_SELECTION', `Modifier group ${group.id} requires ${group.min} to ${group.max} selections.`);
    }
    let unit = new Decimal(toMinorUnits(item.price, currency));
    // Catalog order makes the snapshot stable even if client option order changes.
    const modifiers = [];
    for (const [id, { option, groupId }] of options) {
      if (!selected.has(id)) continue;
      if (option.available === false) reject('OPTION_UNAVAILABLE', `Modifier ${id} is unavailable.`);
      const priceMinor = toMinorUnits(option.price, currency);
      unit = unit.plus(priceMinor);
      modifiers.push(Object.freeze({ id, groupId, name: option.name, priceMinor }));
    }
    const unitPriceMinor = safeMinor(unit, 'Unit price');
    const lineTotalMinor = safeMinor(unit.times(line.qty), 'Line total');
    subtotal = subtotal.plus(lineTotalMinor);
    return Object.freeze({ menuId: item.id, name: item.name, qty: line.qty,
      optionIds: Object.freeze(modifiers.map(option => option.id)),
      modifiers: Object.freeze(modifiers), unitPriceMinor, lineTotalMinor });
  });
  const subtotalMinor = safeMinor(subtotal, 'Subtotal');
  const discountMinor = discountFor(promo, subtotalMinor, currency, now);
  const net = subtotal.minus(discountMinor);
  const serviceMinor = safeMinor(net.times(serviceRate).div(100), 'Service');
  const taxBasis = net.plus(serviceMinor);
  const taxMinor = safeMinor(taxBasis.times(taxRate).div(100), 'Tax');
  const totalMinor = safeMinor(taxBasis.plus(taxMinor), 'Total');
  return Object.freeze({ currency, scale, items: Object.freeze(items), subtotalMinor,
    discountMinor, serviceMinor, taxMinor, totalMinor });
}

module.exports = { priceCart, toMinorUnits, fromMinorUnits, currencyScale };

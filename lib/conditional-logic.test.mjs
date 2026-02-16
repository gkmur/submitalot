import test from 'node:test';
import assert from 'node:assert/strict';
import { getFieldsToClear, scrubOrphanedFields } from './conditional-logic.ts';

const INVENTORY_VARIANT_FIELDS = [
  'pricingStrengthSurplus',
  'brandDemandSurplus',
  'locationSurplus',
  'restrictionsSurplus',
  'pricingStrengthWholesale',
  'brandDemandWholesale',
  'locationWholesale',
  'restrictionsWholesale',
];

test('getFieldsToClear clears all inventory variant fields when inventoryType is missing', () => {
  const fields = getFieldsToClear('inventoryType', '');

  assert.deepEqual(new Set(fields), new Set(INVENTORY_VARIANT_FIELDS));
});

test('scrubOrphanedFields removes inventory variant values when inventoryType is absent', () => {
  const scrubbed = scrubOrphanedFields({
    pricingStrengthSurplus: 'High',
    pricingStrengthWholesale: 'Low',
  });

  assert.equal(scrubbed.pricingStrengthSurplus, undefined);
  assert.equal(scrubbed.pricingStrengthWholesale, undefined);
});

test('scrubOrphanedFields clears price column children when priceColumns is null', () => {
  const scrubbed = scrubOrphanedFields({
    priceColumns: null,
    sellerPriceColumn: 'Seller Price',
    buyerPriceColumn: 'Buyer Price',
    flatOrReference: 'Reference',
    referencePriceColumn: 'MSRP',
    increaseOrDecrease: 'Increase',
  });

  assert.equal(scrubbed.sellerPriceColumn, undefined);
  assert.equal(scrubbed.buyerPriceColumn, undefined);
  assert.equal(scrubbed.flatOrReference, undefined);
  assert.equal(scrubbed.referencePriceColumn, undefined);
  assert.equal(scrubbed.increaseOrDecrease, undefined);
});

test('scrubOrphanedFields clears inventory variant fields when inventoryType is non-string', () => {
  const scrubbed = scrubOrphanedFields({
    inventoryType: 123,
    pricingStrengthSurplus: 'High',
    pricingStrengthWholesale: 'Low',
    brandDemandSurplus: 'High',
    brandDemandWholesale: 'Low',
  });

  assert.equal(scrubbed.pricingStrengthSurplus, undefined);
  assert.equal(scrubbed.pricingStrengthWholesale, undefined);
  assert.equal(scrubbed.brandDemandSurplus, undefined);
  assert.equal(scrubbed.brandDemandWholesale, undefined);
});

test('scrubOrphanedFields clears newSellerId when seller is non-string', () => {
  const scrubbed = scrubOrphanedFields({
    seller: null,
    newSellerId: 'TEMP-123',
  });

  assert.equal(scrubbed.newSellerId, undefined);
});

test('scrubOrphanedFields clears customDisaggregation when listingDisaggregation is non-string', () => {
  const scrubbed = scrubOrphanedFields({
    listingDisaggregation: 99,
    customDisaggregation: 'By color and season',
  });

  assert.equal(scrubbed.customDisaggregation, undefined);
});

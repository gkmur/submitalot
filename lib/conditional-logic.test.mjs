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

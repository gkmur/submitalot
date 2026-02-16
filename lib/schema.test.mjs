import test from 'node:test';
import assert from 'node:assert/strict';
import { itemizationSchema } from './schema.ts';

function makeValidPayload() {
  return {
    brandPartner: 'BP',
    seller: 'Seller',
    newSellerId: '',
    inventoryFile: [{ name: 'a.csv', url: 'https://example.com/a.csv', size: 1, type: 'text/csv' }],
    additionalFiles: [],
    inventoryType: 'Discount',
    productAssortment: '5: Hero SKUs and bestselling items',
    inventoryCondition: '5: Brand new with hang tags',
    overallListingRating: 5,
    pricingStrengthSurplus: '5: Greater than 90% off',
    pricingStrengthWholesale: '',
    brandDemandSurplus: '5: Internationally recognized brand with full-price wholesale presence in top retailers',
    brandDemandWholesale: '',
    locationSurplus: '5: Located in US',
    locationWholesale: '',
    restrictionsSurplus: '5: No restrictions',
    restrictionsWholesale: '',
    categoryGroups: ['Apparel'],
    inventoryExclusivity: 'Exclusive',
    paperwork: 'Release',
    tagPresets: [],
    allTags: '',
    inventoryNotes: '',
    region: 'United States',
    state: '',
    city: '',
    minimumOrder: '100 units',
    packagingType: 'Retail Ready',
    packagingDetails: '',
    inventoryAvailability: 'ATS',
    fobOrExw: 'FOB',
    leadTimeNumber: 1,
    leadTimeInterval: 'Day(s)',
    currencyType: 'USD $',
    inlandFreight: 'No',
    marginTakeRate: 10,
    priceColumns: 'None',
    sellerPriceColumn: '',
    buyerPriceColumn: '',
    flatOrReference: 'Reference',
    referencePriceColumn: 'MSRP',
    increaseOrDecrease: 'Increase',
    maxPercentOffAsking: 16,
    listingDisaggregation: 'One listing',
    customDisaggregation: '',
    stealth: false,
    restrictionsString: '',
    restrictionsCompany: [],
    restrictionsBuyerType: [],
    restrictionsRegion: [],
    p0FireListing: false,
    notes: '',
  };
}

test('schema rejects missing flatOrReference when priceColumns is None', () => {
  const payload = makeValidPayload();
  payload.flatOrReference = undefined;
  payload.referencePriceColumn = '';
  payload.increaseOrDecrease = undefined;

  const result = itemizationSchema.safeParse(payload);
  assert.equal(result.success, false);
});

test('schema rejects missing referencePriceColumn when flatOrReference is Reference', () => {
  const payload = makeValidPayload();
  payload.flatOrReference = 'Reference';
  payload.referencePriceColumn = '';
  payload.increaseOrDecrease = 'Increase';

  const result = itemizationSchema.safeParse(payload);
  assert.equal(result.success, false);
});

test('schema rejects missing increaseOrDecrease when flatOrReference is Reference', () => {
  const payload = makeValidPayload();
  payload.flatOrReference = 'Reference';
  payload.referencePriceColumn = 'MSRP';
  payload.increaseOrDecrease = undefined;

  const result = itemizationSchema.safeParse(payload);
  assert.equal(result.success, false);
});

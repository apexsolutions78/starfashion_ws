import { describe, it, expect } from 'vitest';
import { PricingEngine, PricingTierInput } from '../PricingEngine';

describe('PricingEngine Unit Tests', () => {
  const activeTiers: PricingTierInput[] = [
    { id: 't1', name: 'Tier 1 (30+)', minQuantity: 30, discountPercent: 10.0, active: true },
    { id: 't2', name: 'Tier 2 (70+)', minQuantity: 70, discountPercent: 12.0, active: true },
    { id: 't3', name: 'Tier 3 (101+)', minQuantity: 101, discountPercent: 15.0, active: true },
  ];

  it('should apply 0% discount for 29 units (below Tier 1)', () => {
    const result = PricingEngine.calculateQuote(
      [{ variantId: 'v1', baseUnitPrice: 20.0, quantity: 29 }],
      activeTiers
    );

    expect(result.qualifyingQty).toBe(29);
    expect(result.discountPercent).toBe(0);
    expect(result.appliedTier).toBeNull();
    expect(result.grossSubtotal).toBe(580.0);
    expect(result.discountTotal).toBe(0.0);
    expect(result.netSubtotal).toBe(580.0);
    expect(result.nextTier?.minQuantity).toBe(30);
    expect(result.unitsToNextTier).toBe(1);
  });

  it('should apply 10% discount for 30 units (exact Tier 1 threshold)', () => {
    const result = PricingEngine.calculateQuote(
      [{ variantId: 'v1', baseUnitPrice: 20.0, quantity: 30 }],
      activeTiers
    );

    expect(result.qualifyingQty).toBe(30);
    expect(result.discountPercent).toBe(10.0);
    expect(result.appliedTier?.id).toBe('t1');
    expect(result.grossSubtotal).toBe(600.0);
    expect(result.discountTotal).toBe(60.0);
    expect(result.netSubtotal).toBe(540.0);
    expect(result.nextTier?.minQuantity).toBe(70);
    expect(result.unitsToNextTier).toBe(40);
  });

  it('should apply 10% discount for 69 units (Tier 1 upper bound)', () => {
    const result = PricingEngine.calculateQuote(
      [{ variantId: 'v1', baseUnitPrice: 20.0, quantity: 69 }],
      activeTiers
    );

    expect(result.qualifyingQty).toBe(69);
    expect(result.discountPercent).toBe(10.0);
    expect(result.appliedTier?.id).toBe('t1');
    expect(result.grossSubtotal).toBe(1380.0);
    expect(result.discountTotal).toBe(138.0);
    expect(result.netSubtotal).toBe(1242.0);
    expect(result.unitsToNextTier).toBe(1);
  });

  it('should apply 12% discount for 70 units (exact Tier 2 threshold)', () => {
    const result = PricingEngine.calculateQuote(
      [{ variantId: 'v1', baseUnitPrice: 20.0, quantity: 70 }],
      activeTiers
    );

    expect(result.qualifyingQty).toBe(70);
    expect(result.discountPercent).toBe(12.0);
    expect(result.appliedTier?.id).toBe('t2');
    expect(result.grossSubtotal).toBe(1400.0);
    expect(result.discountTotal).toBe(168.0);
    expect(result.netSubtotal).toBe(1232.0);
    expect(result.nextTier?.minQuantity).toBe(101);
    expect(result.unitsToNextTier).toBe(31);
  });

  it('should apply 12% discount for 100 units (Tier 2 upper bound)', () => {
    const result = PricingEngine.calculateQuote(
      [{ variantId: 'v1', baseUnitPrice: 20.0, quantity: 100 }],
      activeTiers
    );

    expect(result.qualifyingQty).toBe(100);
    expect(result.discountPercent).toBe(12.0);
    expect(result.appliedTier?.id).toBe('t2');
    expect(result.grossSubtotal).toBe(2000.0);
    expect(result.discountTotal).toBe(240.0);
    expect(result.netSubtotal).toBe(1760.0);
    expect(result.unitsToNextTier).toBe(1);
  });

  it('should apply 15% discount for 101 units (exact Tier 3 threshold)', () => {
    const result = PricingEngine.calculateQuote(
      [{ variantId: 'v1', baseUnitPrice: 20.0, quantity: 101 }],
      activeTiers
    );

    expect(result.qualifyingQty).toBe(101);
    expect(result.discountPercent).toBe(15.0);
    expect(result.appliedTier?.id).toBe('t3');
    expect(result.grossSubtotal).toBe(2020.0);
    expect(result.discountTotal).toBe(303.0);
    expect(result.netSubtotal).toBe(1717.0);
    expect(result.nextTier).toBeNull();
    expect(result.unitsToNextTier).toBe(0);
  });

  it('should qualify mixed products/variants totaling 70 units for Tier 2 (12% discount)', () => {
    const result = PricingEngine.calculateQuote(
      [
        { variantId: 'v1', baseUnitPrice: 100.0, quantity: 10 }, // Gross: 1000
        { variantId: 'v2', baseUnitPrice: 50.0, quantity: 20 },  // Gross: 1000
        { variantId: 'v3', baseUnitPrice: 25.0, quantity: 40 },  // Gross: 1000
      ],
      activeTiers
    );

    expect(result.qualifyingQty).toBe(70);
    expect(result.discountPercent).toBe(12.0);
    expect(result.grossSubtotal).toBe(3000.0);
    expect(result.discountTotal).toBe(360.0);
    expect(result.netSubtotal).toBe(2640.0);
  });

  it('should correctly handle rounding to 2 decimal places', () => {
    const result = PricingEngine.calculateQuote(
      [{ variantId: 'v1', baseUnitPrice: 19.99, quantity: 35 }], // 35 * 19.99 = 699.65
      activeTiers
    );

    // 10% discount on 699.65 = 69.965 -> rounds to 69.97
    expect(result.grossSubtotal).toBe(699.65);
    expect(result.discountTotal).toBe(69.97);
    expect(result.netSubtotal).toBe(629.68);
  });
});

export interface PricingItemInput {
  variantId: string;
  sku?: string;
  articleNumber?: string;
  productName?: string;
  colorName?: string;
  sizeName?: string;
  baseUnitPrice: number;
  quantity: number;
  isEligibleForTier?: boolean;
}

export interface PricingTierInput {
  id: string;
  name: string;
  minQuantity: number;
  discountPercent: number;
  active?: boolean;
}

export interface LineItemQuote {
  variantId: string;
  sku?: string;
  articleNumber?: string;
  productName?: string;
  colorName?: string;
  sizeName?: string;
  baseUnitPrice: number;
  quantity: number;
  lineGross: number;
  lineDiscount: number;
  lineNet: number;
  isEligibleForTier: boolean;
}

export interface PricingQuoteResult {
  qualifyingQty: number;
  appliedTier: PricingTierInput | null;
  discountPercent: number;
  grossSubtotal: number;
  discountTotal: number;
  netSubtotal: number;
  nextTier: PricingTierInput | null;
  unitsToNextTier: number;
  lineItems: LineItemQuote[];
}

export class PricingEngine {
  /**
   * Calculates exact server-side wholesale pricing for a set of cart/order items against active pricing tiers.
   * Rounding policy: Half-up rounding to 2 decimal places.
   */
  public static calculateQuote(
    items: PricingItemInput[],
    tiers: PricingTierInput[]
  ): PricingQuoteResult {
    // Filter active tiers and sort descending by minQuantity
    const activeTiers = tiers
      .filter((t) => t.active !== false)
      .sort((a, b) => b.minQuantity - a.minQuantity);

    let qualifyingQty = 0;
    let eligibleGrossSubtotal = 0;
    let totalGrossSubtotal = 0;

    // Process line items
    const lineItems: LineItemQuote[] = items.map((item) => {
      const isEligible = item.isEligibleForTier !== false;
      const lineGross = this.roundCurrency(item.baseUnitPrice * item.quantity);
      totalGrossSubtotal += lineGross;

      if (isEligible) {
        qualifyingQty += item.quantity;
        eligibleGrossSubtotal += lineGross;
      }

      return {
        variantId: item.variantId,
        sku: item.sku,
        articleNumber: item.articleNumber,
        productName: item.productName,
        colorName: item.colorName,
        sizeName: item.sizeName,
        baseUnitPrice: item.baseUnitPrice,
        quantity: item.quantity,
        lineGross,
        lineDiscount: 0,
        lineNet: lineGross,
        isEligibleForTier: isEligible,
      };
    });

    // Determine qualifying tier
    const appliedTier = activeTiers.find((t) => qualifyingQty >= t.minQuantity) || null;
    const discountPercent = appliedTier ? appliedTier.discountPercent : 0.0;

    // Calculate overall order discount
    const discountTotal = this.roundCurrency(eligibleGrossSubtotal * (discountPercent / 100.0));
    const netSubtotal = this.roundCurrency(totalGrossSubtotal - discountTotal);

    // Distribute discount proportionally across eligible lines
    let remainingDiscount = discountTotal;
    const eligibleLinesCount = lineItems.filter((l) => l.isEligibleForTier).length;

    lineItems.forEach((line, index) => {
      if (!line.isEligibleForTier) {
        line.lineDiscount = 0;
        line.lineNet = line.lineGross;
        return;
      }

      if (eligibleGrossSubtotal > 0) {
        // Proportion of discount
        let lineDiscount = this.roundCurrency(
          discountTotal * (line.lineGross / eligibleGrossSubtotal)
        );
        // Adjust last eligible line for any penny rounding discrepancy
        if (index === eligibleLinesCount - 1) {
          lineDiscount = remainingDiscount;
        } else {
          remainingDiscount = this.roundCurrency(remainingDiscount - lineDiscount);
        }
        line.lineDiscount = lineDiscount;
        line.lineNet = this.roundCurrency(line.lineGross - lineDiscount);
      }
    });

    // Calculate progress to next tier
    const ascTiers = [...activeTiers].sort((a, b) => a.minQuantity - b.minQuantity);
    const nextTier = ascTiers.find((t) => t.minQuantity > qualifyingQty) || null;
    const unitsToNextTier = nextTier ? nextTier.minQuantity - qualifyingQty : 0;

    return {
      qualifyingQty,
      appliedTier,
      discountPercent,
      grossSubtotal: this.roundCurrency(totalGrossSubtotal),
      discountTotal,
      netSubtotal,
      nextTier,
      unitsToNextTier,
      lineItems,
    };
  }

  /**
   * Helper to round monetary amounts to 2 decimal places cleanly.
   */
  public static roundCurrency(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}

# StarFashion Wholesale Portal - Pricing Rules Documentation

## 1. Overview

The StarFashion Wholesale Portal implements a **tiered volume-based pricing system** for B2B wholesale orders. All pricing calculations are performed server-side to prevent client manipulation and ensure accuracy.

**Key Principles:**
- Server-side pricing calculation only
- Global quantity-based tiers (not per-product)
- Proportional discount distribution
- Immutable pricing snapshots in orders
- Real-time quote generation for cart display

## 2. Pricing Engine

### 2.1 Architecture

**File:** `src/services/PricingEngine.ts` (152 lines)

The PricingEngine is a **pure, stateless, static class** with no database access or side effects. It receives all necessary data as input parameters and returns a complete pricing quote.

```typescript
class PricingEngine {
  static calculateQuote(items: PricingItemInput[], tiers: PricingTierInput[]): PricingQuoteResult
  static roundCurrency(value: number): number
}
```

### 2.2 Input Types

#### PricingItemInput
```typescript
interface PricingItemInput {
  variantId: string           // Product variant identifier
  baseUnitPrice: number       // Base wholesale price (EUR)
  quantity: number            // Ordered quantity
  isEligibleForTier: boolean  // Whether item qualifies for tier discount
}
```

#### PricingTierInput
```typescript
interface PricingTierInput {
  id: string                  // Tier identifier
  name: string                // Tier name (e.g., "Tier 1 (30+)")
  minQuantity: number         // Minimum quantity for tier
  discountPercent: number     // Discount percentage (e.g., 10.0)
  active: boolean             // Whether tier is active
  sortOrder: number           // Display order
}
```

### 2.3 Output Type

#### PricingQuoteResult
```typescript
interface PricingQuoteResult {
  qualifyingQuantity: number        // Total eligible quantity
  appliedTierId: string | null     // Applied tier ID
  appliedTierName: string | null   // Applied tier name
  discountPercent: number          // Applied discount percentage
  grossSubtotal: number            // Subtotal before discount
  discountTotal: number            // Total discount amount
  netSubtotal: number              // Subtotal after discount
  lineItems: LineItemQuote[]       // Per-line breakdown
  nextTierHint: NextTierHint | null // Upsell information
}

interface LineItemQuote {
  variantId: string
  quantity: number
  baseUnitPrice: number
  lineGross: number              // quantity × baseUnitPrice
  isEligibleForTier: boolean
  lineDiscount: number           // Discount amount for this line
  lineNet: number                // lineGross - lineDiscount
}

interface NextTierHint {
  tierName: string               // Next tier name
  minQuantity: number            // Next tier threshold
  additionalQuantityNeeded: number // Units needed for next tier
}
```

## 3. Pricing Algorithm

### 3.1 Step-by-Step Process

```
Step 1: Filter Active Tiers
    ↓
Step 2: Sort Tiers by minQuantity (descending)
    ↓
Step 3: Calculate Total Eligible Quantity
    ↓
Step 4: Determine Qualifying Tier
    ↓
Step 5: Calculate Line-Level Pricing
    ↓
Step 6: Distribute Discount Proportionally
    ↓
Step 7: Handle Rounding
    ↓
Step 8: Generate Next Tier Hint
```

### 3.2 Detailed Algorithm

#### Step 1: Filter Active Tiers
```typescript
const activeTiers = tiers.filter(tier => tier.active);
```

#### Step 2: Sort Tiers by minQuantity (descending)
```typescript
const sortedTiers = activeTiers.sort((a, b) => b.minQuantity - a.minQuantity);
```

#### Step 3: Calculate Total Eligible Quantity
```typescript
const qualifyingQuantity = items
  .filter(item => item.isEligibleForTier)
  .reduce((sum, item) => sum + item.quantity, 0);
```

#### Step 4: Determine Qualifying Tier
```typescript
let appliedTier = null;
for (const tier of sortedTiers) {
  if (qualifyingQuantity >= tier.minQuantity) {
    appliedTier = tier;
    break;
  }
}
```

#### Step 5: Calculate Line-Level Pricing
```typescript
const lineItems = items.map(item => ({
  variantId: item.variantId,
  quantity: item.quantity,
  baseUnitPrice: item.baseUnitPrice,
  lineGross: item.quantity * item.baseUnitPrice,
  isEligibleForTier: item.isEligibleForTier,
  lineDiscount: 0,
  lineNet: item.quantity * item.baseUnitPrice,
}));
```

#### Step 6: Distribute Discount Proportionally
```typescript
if (appliedTier) {
  const eligibleLines = lineItems.filter(line => line.isEligibleForTier);
  const totalEligibleGross = eligibleLines.reduce((sum, line) => sum + line.lineGross, 0);
  const totalDiscount = grossSubtotal * (appliedTier.discountPercent / 100);
  
  eligibleLines.forEach((line, index) => {
    const proportion = line.lineGross / totalEligibleGross;
    line.lineDiscount = totalDiscount * proportion;
    line.lineNet = line.lineGross - line.lineDiscount;
  });
}
```

#### Step 7: Handle Rounding
```typescript
// Last eligible line absorbs rounding delta
const lastEligibleLine = eligibleLines[eligibleLines.length - 1];
const calculatedTotal = eligibleLines.reduce((sum, line) => sum + line.lineDiscount, 0);
const roundingDelta = totalDiscount - calculatedTotal;
lastEligibleLine.lineDiscount += roundingDelta;
lastEligibleLine.lineNet -= roundingDelta;
```

#### Step 8: Generate Next Tier Hint
```typescript
let nextTierHint = null;
if (appliedTier) {
  const nextTier = sortedTiers.find(tier => tier.minQuantity > qualifyingQuantity);
  if (nextTier) {
    nextTierHint = {
      tierName: nextTier.name,
      minQuantity: nextTier.minQuantity,
      additionalQuantityNeeded: nextTier.minQuantity - qualifyingQuantity,
    };
  }
}
```

## 4. Pricing Tiers

### 4.1 Default Tiers

| Tier | Name | Min Quantity | Discount |
|------|------|--------------|----------|
| Tier 1 | Tier 1 (30+) | 30 units | 10% |
| Tier 2 | Tier 2 (70+) | 70 units | 12% |
| Tier 3 | Tier 3 (101+) | 101 units | 15% |

### 4.2 Tier Qualification Rules

1. **Aggregate Quantity:** All eligible items contribute to a single qualifying quantity
2. **Eligibility Flag:** Items can be marked as ineligible via `isEligibleForTier`
3. **Global Tiers:** Tiers apply to the entire order, not per-product
4. **Highest Tier Wins:** The highest qualifying tier is applied (not cumulative)

### 4.3 Tier Examples

#### Example 1: Below Tier 1
- **Items:** 29 units total
- **Qualifying Quantity:** 29
- **Applied Tier:** None
- **Discount:** 0%

#### Example 2: Tier 1
- **Items:** 30 units total
- **Qualifying Quantity:** 30
- **Applied Tier:** Tier 1 (30+)
- **Discount:** 10%

#### Example 3: Tier 2
- **Items:** 70 units total
- **Qualifying Quantity:** 70
- **Applied Tier:** Tier 2 (70+)
- **Discount:** 12%

#### Example 4: Tier 3
- **Items:** 101 units total
- **Qualifying Quantity:** 101
- **Applied Tier:** Tier 3 (101+)
- **Discount:** 15%

## 5. Discount Distribution

### 5.1 Proportional Distribution

Discounts are distributed across eligible items **proportionally by line gross amount**.

**Formula:**
```
lineDiscount = (lineGross / totalEligibleGross) × totalDiscount
```

### 5.2 Example Calculation

**Order:**
- Item A: 20 units × €25.00 = €500.00
- Item B: 30 units × €20.00 = €600.00
- Item C: 20 units × €30.00 = €600.00 (ineligible for tier)

**Total Eligible:** 50 units (Item A + Item B)
**Applied Tier:** Tier 1 (30+) → 10% discount
**Total Gross:** €1,100.00 (Item A + Item B)
**Total Discount:** €110.00

**Distribution:**
- Item A: (€500.00 / €1,100.00) × €110.00 = €50.00
- Item B: (€600.00 / €1,100.00) × €110.00 = €60.00
- Item C: €0.00 (ineligible)

## 6. Currency Rounding

### 6.1 Rounding Method

**Half-up rounding** to 2 decimal places using `Number.EPSILON` for float precision.

```typescript
static roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
```

### 6.2 Rounding Delta Handling

When distributing discounts, rounding errors are absorbed by the **last eligible line item**.

**Example:**
- Total Discount: €33.33
- Item A: €16.665 → €16.67
- Item B: €16.665 → €16.67 (absorbs €0.01 delta)

## 7. Pricing in the Order Lifecycle

### 7.1 Cart Quote (Real-Time)

When a customer views their cart, the system:
1. Fetches cart items with variant details
2. Fetches active pricing tiers
3. Calls `PricingEngine.calculateQuote()`
4. Returns real-time pricing quote

**Endpoint:** `GET /api/v1/cart`

### 7.2 Order Submission (Re-Validation)

When an order is submitted, the system:
1. Re-fetches cart items (server-side)
2. Re-fetches active pricing tiers
3. Re-calculates pricing via `PricingEngine.calculateQuote()`
4. Validates against client-provided totals
5. Stores immutable pricing snapshots

**Endpoint:** `POST /api/v1/orders`

### 7.3 Immutable Pricing Snapshots

Orders store denormalized pricing data to ensure historical accuracy:

**Order Model Snapshots:**
- `tierIdSnapshot` - Applied tier ID
- `discountPercentSnapshot` - Applied discount percentage
- `grossSubtotal` - Subtotal before discount
- `discountTotal` - Total discount amount
- `netSubtotal` - Subtotal after discount
- `grandTotal` - Final total

**OrderItem Model Snapshots:**
- `articleNumberSnapshot` - Article number at order time
- `productNameSnapshot` - Product name at order time
- `skuSnapshot` - SKU at order time
- `colorSnapshot` - Color at order time
- `sizeSnapshot` - Size at order time
- `baseUnitPriceSnapshot` - Unit price at order time
- `lineGross` - Line total before discount
- `lineDiscount` - Line discount amount
- `lineNet` - Line total after discount

## 8. Edge Cases

### 8.1 Empty Cart
- **Behavior:** Returns quote with zero totals
- **Qualifying Quantity:** 0
- **Applied Tier:** null

### 8.2 All Items Ineligible
- **Behavior:** No discount applied
- **Qualifying Quantity:** 0
- **Applied Tier:** null

### 8.3 Single Item Order
- **Behavior:** Standard tier qualification
- **Discount Distribution:** 100% to single item

### 8.4 Very Large Quantities
- **Behavior:** Standard tier qualification
- **Rounding:** Handled by last-line absorption

### 8.5 Mixed Eligibility
- **Behavior:** Only eligible items contribute to qualifying quantity
- **Discount Distribution:** Only applied to eligible items

## 9. Testing

### 9.1 Test Coverage

**File:** `src/services/__tests__/PricingEngine.test.ts` (133 lines)

| Test | Scenario | Expected |
|------|----------|----------|
| 1 | 29 units (below Tier 1) | 0% discount |
| 2 | 30 units (exact Tier 1) | 10% discount |
| 3 | 69 units (Tier 1 upper bound) | 10% discount |
| 4 | 70 units (exact Tier 2) | 12% discount |
| 5 | 100 units (Tier 2 upper bound) | 12% discount |
| 6 | 101 units (exact Tier 3) | 15% discount |
| 7 | Mixed products (70 total) | Tier 2 with proportional discount |
| 8 | Rounding test (35 × €19.99) | Proper rounding |

### 9.2 Test Gaps

- No tests for empty cart
- No tests for all-ineligible items
- No tests for single-item orders
- No tests for very large quantities
- No tests for rounding edge cases

## 10. Configuration

### 10.1 Tier Management

Tiers are managed via the Admin interface:

**Endpoint:** `GET/PUT /api/v1/admin/pricing-tiers`

**Admin UI:** `/admin/tiers`

### 10.2 Tier Updates

When tiers are updated:
1. Old tier state is captured (beforeJson)
2. New tier state is saved (afterJson)
3. Audit log is written
4. All future orders use new tiers
5. Existing orders are unaffected (immutable snapshots)

## 11. Performance Considerations

### 11.1 Calculation Complexity

- **Time Complexity:** O(n log n) for tier sorting + O(n) for item processing
- **Space Complexity:** O(n) for line item quotes

### 11.2 Optimization Opportunities

1. **Cache Active Tiers:** Fetch and cache active tiers
2. **Pre-calculate Totals:** Cache gross subtotals
3. **Batch Processing:** Process multiple orders in parallel

## 12. Future Enhancements

### 12.1 Planned Features

1. **Per-Product Tiers:** Different tiers for different product categories
2. **Customer-Specific Pricing:** Custom pricing per customer
3. **Promotional Discounts:** Time-limited promotional pricing
4. **Bundle Pricing:** Discounts for product bundles
5. **Currency Support:** Multi-currency pricing

### 12.2 Algorithm Improvements

1. **Graceful Rounding:** More sophisticated rounding strategies
2. **Discount Caps:** Maximum discount limits
3. **Minimum Order Values:** Order minimums
4. **Step Discounts:** Different discounts at different quantity levels

---

**Document Version:** 1.0  
**Last Updated:** September 2026  
**Author:** Architecture Analysis

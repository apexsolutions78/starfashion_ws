# StarFashion Wholesale Portal - Testing Strategy

## 1. Overview

This document outlines the testing strategy for the StarFashion Wholesale Portal, including current coverage, testing gaps, and recommendations for comprehensive test implementation.

**Current Status:** Minimal test coverage (8 unit tests for PricingEngine)

**Target:** 80% code coverage with comprehensive test suite

## 2. Testing Philosophy

### 2.1 Testing Pyramid

```
                    ┌─────────────┐
                    │     E2E     │  ← Few, slow, high confidence
                    │   (10%)     │
                    ├─────────────┤
                    │ Integration │  ← Moderate, medium speed
                    │   (30%)     │
                    ├─────────────┤
                    │    Unit     │  ← Many, fast, low confidence
                    │   (60%)     │
                    └─────────────┘
```

### 2.2 Testing Principles

1. **Test Early, Test Often:** Write tests during development
2. **Test Behavior, Not Implementation:** Focus on what, not how
3. **Isolate Tests:** Each test should be independent
4. **Test Edge Cases:** Cover boundary conditions
5. **Maintain Tests:** Tests are code, maintain them

## 3. Current Test Coverage

### 3.1 Test Framework

- **Framework:** Vitest 3.0.4
- **Configuration:** `vitest.config.ts` (not present, using defaults)
- **Runner:** `npm test` or `npm run test:watch`

### 3.2 Existing Tests

**File:** `src/services/__tests__/PricingEngine.test.ts` (133 lines)

| Test | Scenario | Status |
|------|----------|--------|
| 1 | 29 units (below Tier 1) | ✅ Pass |
| 2 | 30 units (exact Tier 1) | ✅ Pass |
| 3 | 69 units (Tier 1 upper bound) | ✅ Pass |
| 4 | 70 units (exact Tier 2) | ✅ Pass |
| 5 | 100 units (Tier 2 upper bound) | ✅ Pass |
| 6 | 101 units (exact Tier 3) | ✅ Pass |
| 7 | Mixed products (70 total) | ✅ Pass |
| 8 | Rounding test (35 × €19.99) | ✅ Pass |

### 3.3 Coverage Summary

| Component | Coverage | Tests |
|-----------|----------|-------|
| PricingEngine | 100% | 8 unit tests |
| OrderService | 0% | None |
| PaymentService | 0% | None |
| LedgerService | 0% | None |
| API Routes | 0% | None |
| Frontend Components | 0% | None |
| **Overall** | ~5% | 8 tests |

## 4. Testing Gaps

### 4.1 Service Layer Gaps

#### OrderService
**Current Tests:** None

**Recommended Tests:**
1. Submit order - success flow
2. Submit order - insufficient stock
3. Submit order - credit limit exceeded
4. Submit order - empty cart
5. Submit order - inactive customer
6. Update status - valid transition
7. Update status - invalid transition
8. Update status - CONFIRMED (generates invoice)
9. Update status - CANCELLED (releases inventory)

#### PaymentService
**Current Tests:** None

**Recommended Tests:**
1. Record payment - success flow
2. Record payment - explicit allocation
3. Record payment - FIFO allocation
4. Record payment - partial payment
5. Record payment - overpayment
6. Record payment - invalid invoice
7. Invoice status updates

#### LedgerService
**Current Tests:** None

**Recommended Tests:**
1. Post transaction - INVOICE (debit)
2. Post transaction - PAYMENT (credit)
3. Post transaction - CREDIT_NOTE (credit)
4. Post transaction - ADJUSTMENT (debit/credit)
5. Get balance - success
6. Get statement - date range filtering
7. Running balance calculation

### 4.2 API Route Gaps

**Current Tests:** None

**Recommended Tests:**
1. POST /api/v1/auth/login - success
2. POST /api/v1/auth/login - invalid credentials
3. POST /api/v1/auth/logout - success
4. GET /api/v1/auth/me - authenticated
5. GET /api/v1/auth/me - unauthenticated
6. GET /api/v1/catalog/products - search
7. GET /api/v1/catalog/products - filter
8. GET /api/v1/cart - success
9. POST /api/v1/cart/items - success
10. POST /api/v1/cart/items - validation error
11. GET /api/v1/orders - customer view
12. GET /api/v1/orders - admin view
13. POST /api/v1/orders - success
14. GET /api/v1/orders/[id] - success
15. GET /api/v1/orders/[id] - tenant isolation
16. GET /api/v1/account/statement - success
17. GET/PUT /api/v1/admin/pricing-tiers - success
18. GET/POST /api/v1/admin/customers - success
19. GET/POST /api/v1/admin/payments - success
20. GET /api/v1/admin/audit-logs - success
21. PUT /api/v1/admin/orders/[id]/status - success

### 4.3 Frontend Component Gaps

**Current Tests:** None

**Recommended Tests:**
1. Login page - form submission
2. Login page - validation errors
3. Admin dashboard - data loading
4. Catalog page - product display
5. Cart page - quantity updates
6. Cart page - checkout flow
7. Orders page - order list
8. Statement page - ledger display

### 4.4 E2E Test Gaps

**Current Tests:** None

**Recommended Tests:**
1. Complete order flow (browse → cart → checkout → confirmation)
2. Admin order processing (confirm → process → ship → complete)
3. Payment recording flow
4. Customer account statement

## 5. Testing Recommendations

### 5.1 Unit Tests (Priority: High)

#### PricingEngine - Additional Tests
```typescript
describe('PricingEngine - Edge Cases', () => {
  it('should handle empty cart', () => {
    const result = PricingEngine.calculateQuote([], tiers);
    expect(result.grossSubtotal).toBe(0);
    expect(result.appliedTierId).toBeNull();
  });

  it('should handle all ineligible items', () => {
    const items = [
      { variantId: '1', baseUnitPrice: 25, quantity: 50, isEligibleForTier: false },
    ];
    const result = PricingEngine.calculateQuote(items, tiers);
    expect(result.qualifyingQuantity).toBe(0);
    expect(result.discountTotal).toBe(0);
  });

  it('should handle single item order', () => {
    const items = [
      { variantId: '1', baseUnitPrice: 25, quantity: 50, isEligibleForTier: true },
    ];
    const result = PricingEngine.calculateQuote(items, tiers);
    expect(result.appliedTierName).toBe('Tier 1 (30+)');
  });
});
```

#### OrderService - Unit Tests
```typescript
describe('OrderService', () => {
  describe('submitOrder', () => {
    it('should create order with correct totals', async () => {
      // Mock prisma, PricingEngine
      const order = await OrderService.submitOrder(customerId);
      expect(order.grandTotal).toBe(expectedTotal);
    });

    it('should reserve inventory', async () => {
      await OrderService.submitOrder(customerId);
      const inventory = await prisma.inventory.findFirst({ where: { variantId } });
      expect(inventory.reserved).toBe(quantity);
    });

    it('should clear cart', async () => {
      await OrderService.submitOrder(customerId);
      const cartItems = await prisma.cartItem.findMany({ where: { cartId } });
      expect(cartItems).toHaveLength(0);
    });
  });

  describe('updateOrderStatus', () => {
    it('should generate invoice on CONFIRMED', async () => {
      await OrderService.updateOrderStatus(orderId, 'CONFIRMED', userId);
      const invoice = await prisma.invoice.findFirst({ where: { orderId } });
      expect(invoice).toBeDefined();
    });

    it('should release inventory on CANCELLED', async () => {
      await OrderService.updateOrderStatus(orderId, 'CANCELLED', userId);
      const inventory = await prisma.inventory.findFirst({ where: { variantId } });
      expect(inventory.reserved).toBe(0);
    });
  });
});
```

### 5.2 Integration Tests (Priority: High)

#### API Route Tests
```typescript
describe('Auth API', () => {
  describe('POST /api/v1/auth/login', () => {
    it('should return token on valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@starfashion.com', password: 'Password123!' });
      expect(response.status).toBe(200);
      expect(response.body.data.token).toBeDefined();
    });

    it('should return 401 on invalid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'wrong@email.com', password: 'wrong' });
      expect(response.status).toBe(401);
    });
  });
});
```

### 5.3 E2E Tests (Priority: Medium)

#### Test Scenarios
1. **Order Flow:** Browse → Add to Cart → Checkout → Confirmation
2. **Admin Flow:** Login → Process Order → Record Payment
3. **Account Flow:** View Statement → Verify Balance

### 5.4 Frontend Component Tests (Priority: Low)

#### Test Approach
- Use React Testing Library
- Mock API calls
- Test user interactions

## 6. Testing Infrastructure

### 6.1 Test Environment

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/services/__tests__/setup.ts'],
  },
});
```

### 6.2 Test Setup

```typescript
// src/services/__tests__/setup.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Setup test database
});

afterAll(async () => {
  // Cleanup test database
  await prisma.$disconnect();
});
```

### 6.3 Mocking Strategy

**Database Mocking:**
```typescript
import { mockDeep } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';

const prisma = mockDeep<PrismaClient>();
```

**API Mocking:**
```typescript
import { vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  prisma: mockDeep<PrismaClient>(),
}));
```

## 7. Test Data Management

### 7.1 Test Database

- Use separate test database
- Reset between test suites
- Use seed data for consistent state

### 7.2 Test Fixtures

```typescript
// src/services/__tests__/fixtures.ts
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  userType: 'ADMIN',
};

export const mockCustomer = {
  id: 'test-customer-id',
  companyName: 'Test Company',
  creditLimit: 50000,
};
```

## 8. CI/CD Integration

### 8.1 GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build
```

### 8.2 Coverage Reporting

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/services/__tests__/'],
    },
  },
});
```

## 9. Testing Checklist

### 9.1 Pre-commit

- [ ] Run unit tests
- [ ] Run linter
- [ ] Check type errors

### 9.2 Pre-deployment

- [ ] Run full test suite
- [ ] Check coverage thresholds
- [ ] Run integration tests
- [ ] Run E2E tests (if available)

### 9.3 Post-deployment

- [ ] Verify health checks
- [ ] Monitor error rates
- [ ] Check performance metrics

## 10. Testing Metrics

### 10.1 Current Metrics

| Metric | Value |
|--------|-------|
| Total Tests | 8 |
| Code Coverage | ~5% |
| Test Suites | 1 |
| Passing Tests | 8 |

### 10.2 Target Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Total Tests | 100+ | 8 |
| Code Coverage | 80% | 5% |
| Test Suites | 20+ | 1 |
| E2E Scenarios | 10+ | 0 |

## 11. Testing Roadmap

### 11.1 Phase 1: Unit Tests (Week 1-2)

- [ ] PricingEngine edge cases
- [ ] OrderService unit tests
- [ ] PaymentService unit tests
- [ ] LedgerService unit tests

### 11.2 Phase 2: Integration Tests (Week 3-4)

- [ ] Auth API tests
- [ ] Catalog API tests
- [ ] Cart API tests
- [ ] Order API tests
- [ ] Admin API tests

### 11.3 Phase 3: E2E Tests (Week 5-6)

- [ ] Order flow tests
- [ ] Admin flow tests
- [ ] Account flow tests

### 11.4 Phase 4: Frontend Tests (Week 7-8)

- [ ] Login page tests
- [ ] Catalog page tests
- [ ] Cart page tests
- [ ] Orders page tests

## 12. Resources

### 12.1 Documentation

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://github.com/testing-library/jest-testing-library-best-practices)

### 12.2 Tools

- **Test Runner:** Vitest
- **Mocking:** vi.mock, vitest-mock-extended
- **Coverage:** v8 provider
- **CI/CD:** GitHub Actions

---

**Document Version:** 1.0  
**Last Updated:** September 2026  
**Author:** Architecture Analysis

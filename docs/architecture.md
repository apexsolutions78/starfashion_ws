# StarFashion Wholesale Portal - Architecture Documentation

## 1. System Overview

StarFashion Wholesale Portal is a B2B (Business-to-Business) wholesale ordering and account management system designed for fashion retail companies. The system enables customer companies to browse products, place wholesale orders, and manage their accounts, while administrators can manage products, pricing, orders, payments, and customer relationships.

## 2. Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Frontend** | React | 19.0.0 |
| **Framework** | Next.js (App Router) | 15.1.6 |
| **Styling** | Tailwind CSS | 4.0.0 |
| **Language** | TypeScript | 5.7.3 |
| **Database (Dev)** | SQLite | - |
| **Database (Prod)** | MySQL | 8.0 |
| **ORM** | Prisma | 6.3.0 |
| **Authentication** | JWT + bcryptjs | 9.0.2 / 2.4.3 |
| **Validation** | Zod | 3.24.1 |
| **Testing** | Vitest | 3.0.4 |
| **Icons** | Lucide React | 0.474.0 |

## 3. Architecture Pattern

### 3.1 Layered Architecture

The application follows a clean layered architecture pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │    Login     │  │   Admin     │  │   Portal    │         │
│  │    Pages     │  │   Pages     │  │   Pages     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                     API LAYER                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Route Handlers (app/api/v1/)            │    │
│  │  - Auth  - Catalog  - Cart  - Orders  - Admin       │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│                  BUSINESS LOGIC LAYER                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Pricing   │  │   Order     │  │   Payment   │         │
│  │   Engine    │  │   Service   │  │   Service   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│  ┌─────────────┐                                            │
│  │   Ledger    │                                            │
│  │   Service   │                                            │
│  └─────────────┘                                            │
├─────────────────────────────────────────────────────────────┤
│                    DATA ACCESS LAYER                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  Prisma ORM                          │    │
│  │  - Client Singleton  - Transactions  - Migrations   │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│                      DATABASE                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │     SQLite (Dev)  /  MySQL 8.0 (Production)         │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (Server Component)
│   ├── page.tsx                  # Root page (auto-redirect)
│   ├── globals.css               # Global styles
│   ├── login/                    # Login page
│   │   └── page.tsx
│   ├── admin/                    # Admin dashboard
│   │   ├── layout.tsx            # Admin sidebar layout
│   │   ├── dashboard/            # Executive dashboard
│   │   ├── orders/               # Order processing queue
│   │   ├── tiers/                # Pricing tier editor
│   │   ├── payments/             # Payment recording
│   │   ├── customers/            # Customer management
│   │   └── audit-logs/           # Audit trail viewer
│   ├── portal/                   # Customer portal
│   │   ├── layout.tsx            # Customer portal layout
│   │   ├── catalog/              # Product catalogue
│   │   ├── cart/                 # Shopping cart
│   │   ├── orders/               # Order history
│   │   └── statement/            # Account ledger
│   └── api/v1/                   # REST API endpoints
│       ├── auth/                 # Authentication
│       ├── catalog/              # Product catalog
│       ├── cart/                 # Cart operations
│       ├── orders/               # Order management
│       ├── account/              # Account statements
│       └── admin/                # Admin operations
├── lib/                          # Shared utilities
│   ├── auth.ts                   # JWT + bcrypt utilities
│   ├── middleware-auth.ts        # Request session extraction
│   ├── api-response.ts          # Standardized API responses
│   └── db.ts                     # Prisma client singleton
└── services/                     # Business logic
    ├── PricingEngine.ts          # Server-side pricing calculator
    ├── OrderService.ts           # Order lifecycle management
    ├── PaymentService.ts         # Payment recording + allocation
    └── LedgerService.ts          # Customer account ledger

prisma/
├── schema.prisma                 # Database schema (22 models)
├── dev.db                        # SQLite development database
└── seed.ts                       # Seed data script
```

## 4. Core Components

### 4.1 Authentication System

**File:** `src/lib/auth.ts` + `src/lib/middleware-auth.ts`

- **JWT-based authentication** with 24-hour token expiry
- **Dual delivery mechanism:** httpOnly cookies + Authorization headers
- **Password hashing:** bcrypt with cost factor 10
- **Session payload includes:** userId, email, userType (ADMIN/CUSTOMER), customerId, companyName, role

**Auth Flow:**
```
Login Request → Validate Credentials → Generate JWT → Set Cookie + Return Token
                                                          ↓
Protected Route → Extract Token (Cookie/Header) → Verify JWT → Attach Session
```

### 4.2 Pricing Engine

**File:** `src/services/PricingEngine.ts` (152 lines)

A **pure, stateless calculator** that computes wholesale pricing server-side. No database access, no side effects.

**Key Features:**
- Global pricing tiers (not per-product)
- Aggregate quantity calculation across all eligible items
- Proportional discount distribution with penny-rounding
- Real-time quote generation for cart display

**Pricing Algorithm:**
1. Filter active tiers
2. Sort tiers by minQuantity descending
3. Calculate total eligible quantity across all items
4. Find qualifying tier (highest minQuantity ≤ total quantity)
5. Distribute discount proportionally by line gross amount
6. Handle rounding on last eligible line

### 4.3 Order Service

**File:** `src/services/OrderService.ts` (280 lines)

Orchestrates the complete order lifecycle with transactional integrity.

**Order Submission Flow (10 steps):**
1. Validate customer exists and is ACTIVE
2. Fetch cart with full variant/product/inventory details
3. Check available stock (onHand - reserved) for each variant
4. Fetch active pricing tiers
5. Re-calculate pricing server-side via PricingEngine
6. Validate credit limit against current ledger balance
7. Create Order + OrderItems with immutable snapshots
8. Reserve inventory (increment reserved)
9. Clear cart items
10. Write audit log

**Order Status Flow:**
```
SUBMITTED → CONFIRMED → PROCESSING → PACKED → SHIPPED → COMPLETED
                │
                └──→ CANCELLED (releases reserved inventory)
```

### 4.4 Payment Service

**File:** `src/services/PaymentService.ts` (144 lines)

Handles payment recording and invoice settlement.

**Payment Allocation Modes:**
1. **Explicit Allocation:** Admin specifies invoice IDs and amounts
2. **Auto FIFO Allocation:** Automatically allocate to oldest unpaid invoices

**Invoice Status Updates:**
- `PAID` when balanceDue ≤ 0.01
- `PARTIALLY_PAID` when partial payment received
- `OVERDUE` when past due date (managed separately)

### 4.5 Ledger Service

**File:** `src/services/LedgerService.ts` (103 lines)

Double-entry customer account ledger with running balance.

**Transaction Types:**
- `INVOICE` (Debit) - Increases customer balance
- `PAYMENT` (Credit) - Decreases customer balance
- `CREDIT_NOTE` (Credit) - Decreases customer balance
- `ADJUSTMENT` - Can be debit or credit based on amount sign

**Running Balance:** Computed at insert time, making balance queries O(1).

## 5. Database Schema

### 5.1 Entity Relationship Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│    User      │────<│ CustomerUser │>────│ CustomerCompany  │
└─────────────┘     └──────────────┘     └─────────────────┘
       │                                          │
       │                                          ├──< Cart ──< CartItem
       │                                          │              │
       │                                          │              └──> ProductVariant
       │                                          │                      │
       │                                          ├──< Order ──< OrderItem
       │                                          │      │
       │                                          │      └──> Invoice ──< InvoiceItem
       │                                          │             │
       │                                          │             └──< PaymentAllocation >── Payment
       │                                          │
       │                                          ├──< Payment
       │                                          ├──< AccountTransaction
       │                                          └──< CreditNote
       │
       ├──< AuditLog
       └──< SystemSetting
```

### 5.2 Model Summary (22 Models)

| Domain | Models | Description |
|--------|--------|-------------|
| **Auth** | User, Role, Permission, RolePermission | User management and RBAC (defined but not enforced) |
| **Customers** | CustomerCompany, CustomerUser, Address, PaymentTerm | B2B customer entities |
| **Catalogue** | Product, Category, Collection, Color, Size, ProductVariant, ProductImage | Product hierarchy and variants |
| **Inventory** | Inventory, InventoryLocation | Stock management per variant/location |
| **Pricing** | PricingTier | Global quantity-based discount tiers |
| **Cart** | Cart, CartItem | Shopping cart (one per customer) |
| **Orders** | Order, OrderItem | Order management with immutable snapshots |
| **Finance** | Invoice, InvoiceItem, Payment, PaymentAllocation, CreditNote | Financial documents |
| **Ledger** | AccountTransaction | Double-entry account ledger |
| **Audit** | AuditLog | Immutable audit trail |
| **System** | SystemSetting | Key-value configuration store |

### 5.3 Key Design Patterns

1. **Immutable Pricing Snapshots:** Orders store denormalized product details at time of purchase
2. **Running Balance Ledger:** Balance computed at insert time for O(1) queries
3. **Inventory Reservation:** Two-field model (onHand/reserved) for stock management
4. **Soft Statuses:** All entities use string status fields (no hard deletes)

## 6. API Design

### 6.1 Response Envelope

All API responses follow a standardized format:
```json
{
  "success": boolean,
  "data"?: T,
  "error"?: string,
  "message"?: string
}
```

### 6.2 Endpoint Categories

| Category | Base Path | Auth Required |
|----------|-----------|---------------|
| Authentication | `/api/v1/auth/*` | Varies |
| Catalog | `/api/v1/catalog/*` | No |
| Cart | `/api/v1/cart/*` | Customer |
| Orders | `/api/v1/orders/*` | Auth |
| Account | `/api/v1/account/*` | Auth |
| Admin | `/api/v1/admin/*` | Admin |

### 6.3 Authentication Enforcement

- **Per-route basis:** Each route handler calls `getAuthSession(req)` as first line
- **Role-based:** `userType === 'ADMIN'` or `userType === 'CUSTOMER'`
- **Tenant isolation:** Customer users can only access their own company's data

## 7. Security Considerations

### 7.1 Implemented

- ✅ JWT-based authentication with expiry
- ✅ Password hashing with bcrypt
- ✅ httpOnly cookies for token storage
- ✅ Input validation via Zod schemas
- ✅ Tenant data isolation
- ✅ Audit logging for all state changes

### 7.2 Not Implemented / Gaps

- ❌ No Next.js Middleware (per-route auth instead)
- ❌ No RBAC enforcement (roles defined but not used)
- ❌ No rate limiting
- ❌ No CSRF token mechanism
- ❌ No email verification
- ❌ No password reset flow
- ❌ No soft deletes

## 8. Testing Strategy

### 8.1 Current Coverage

- **Unit Tests:** 8 tests for PricingEngine (Vitest)
- **Framework:** Vitest 3.0.4

### 8.2 Testing Gaps

- No integration tests for services
- No API route tests
- No frontend component tests
- No end-to-end tests
- No load/performance tests

## 9. Deployment

### 9.1 Development

```bash
npm run dev          # Start development server
npm run db:migrate   # Run Prisma migrations
npm run db:seed      # Seed database
```

### 9.2 Production

```bash
docker-compose up -d           # Start MySQL container
npm run build                  # Build Next.js application
npm run start                  # Start production server
```

### 9.3 Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `DATABASE_URL` | Database connection string | `file:./dev.db` |
| `JWT_SECRET` | Token signing secret | Hardcoded fallback |
| `SYSTEM_CURRENCY` | Business currency | `EUR` |
| `PORT` | Server port | `3000` |

## 10. Performance Considerations

### 10.1 Current Optimizations

- Prisma client singleton (prevents connection exhaustion)
- Running balance ledger (O(1) balance queries)
- Immutable order snapshots (no joins for historical data)

### 10.2 Potential Improvements

- No pagination on list endpoints
- No caching layer
- No CDN for static assets
- No database indexing beyond Prisma defaults
- No connection pooling configuration

## 11. Scalability

### 11.1 Horizontal Scaling

- Next.js stateless architecture supports horizontal scaling
- JWT authentication is stateless
- Database is the primary scaling bottleneck

### 11.2 Vertical Scaling

- Prisma connection pooling can be configured
- MySQL can be optimized with proper indexing
- Consider read replicas for reporting queries

## 12. Future Enhancements

### 12.1 High Priority

1. Implement RBAC enforcement
2. Add pagination to all list endpoints
3. Implement rate limiting
4. Add comprehensive test coverage
5. Implement password reset flow

### 12.2 Medium Priority

1. Add caching layer (Redis)
2. Implement soft deletes
3. Add email notifications
4. Implement advanced search/filtering
5. Add export functionality (PDF/CSV)

### 12.3 Low Priority

1. Implement multi-currency support
2. Add two-factor authentication
3. Implement audit log retention policies
4. Add real-time notifications (WebSocket)
5. Implement advanced analytics dashboard

---

**Document Version:** 1.0  
**Last Updated:** September 2026  
**Author:** Architecture Analysis

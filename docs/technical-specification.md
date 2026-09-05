# StarFashion Wholesale Portal - Technical Specification

## 1. Executive Summary

The StarFashion Wholesale Portal is a comprehensive B2B (Business-to-Business) wholesale ordering and account management system designed for fashion retail companies. The system enables customer companies to browse products, place wholesale orders, and manage their accounts, while administrators can manage products, pricing, orders, payments, and customer relationships.

**Project Name:** StarFashion Wholesale Portal  
**Version:** 1.0  
**Technology Stack:** Next.js 15, React 19, TypeScript, Prisma ORM, Tailwind CSS  
**Target Users:** Fashion wholesale companies and their customers  
**Primary Language:** TypeScript  

## 2. Project Objectives

### 2.1 Primary Objectives

1. **Streamline Wholesale Ordering:** Provide an intuitive interface for customers to browse products and place orders
2. **Automate Pricing:** Implement tiered volume-based pricing with server-side calculations
3. **Manage Customer Accounts:** Track customer credit, payments, and account statements
4. **Ensure Data Integrity:** Maintain accurate financial records with double-entry ledger
5. **Provide Audit Trail:** Log all system changes for compliance and debugging

### 2.2 Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Order Processing Time | < 5 minutes | Not measured |
| Pricing Accuracy | 100% | 100% (server-side) |
| System Uptime | 99.9% | Not measured |
| User Satisfaction | > 4.5/5 | Not measured |

## 3. System Architecture

### 3.1 Architectural Pattern

The application follows a **monolithic Next.js App Router** architecture with clear layered separation:

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
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│                  BUSINESS LOGIC LAYER                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Pricing   │  │   Order     │  │   Payment   │         │
│  │   Engine    │  │   Service   │  │   Service   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                    DATA ACCESS LAYER                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  Prisma ORM                          │    │
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
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Root page
│   ├── login/                    # Login page
│   ├── admin/                    # Admin dashboard
│   ├── portal/                   # Customer portal
│   └── api/v1/                   # REST API endpoints
├── lib/                          # Shared utilities
│   ├── auth.ts                   # JWT + bcrypt
│   ├── middleware-auth.ts        # Session extraction
│   ├── api-response.ts          # Standardized responses
│   └── db.ts                     # Prisma singleton
└── services/                     # Business logic
    ├── PricingEngine.ts          # Pricing calculator
    ├── OrderService.ts           # Order management
    ├── PaymentService.ts         # Payment processing
    └── LedgerService.ts          # Account ledger
```

## 4. Functional Requirements

### 4.1 Authentication & Authorization

#### 4.1.1 User Types
- **ADMIN:** System administrators with full access
- **CUSTOMER:** B2B customer company users

#### 4.1.2 Authentication Features
- Email/password login
- JWT-based session management
- 24-hour token expiry
- Dual delivery (cookie + header)
- Logout functionality

#### 4.1.3 Authorization Rules
- Admin users can access all system features
- Customer users can only access their own company's data
- Tenant isolation enforced at API level

### 4.2 Product Catalogue

#### 4.2.1 Product Management
- Hierarchical categories (self-referencing)
- Seasonal collections
- Product variants (color × size matrix)
- Product images
- Article numbers and SKUs

#### 4.2.2 Catalogue Features
- Product search (name, article number, description)
- Category filtering
- Collection filtering
- Variant matrix display
- Inventory visibility

### 4.3 Pricing Engine

#### 4.3.1 Pricing Rules
- Global quantity-based tiers
- Server-side calculation only
- Proportional discount distribution
- Immutable pricing snapshots

#### 4.3.2 Pricing Tiers
| Tier | Min Quantity | Discount |
|------|--------------|----------|
| Tier 1 | 30+ units | 10% |
| Tier 2 | 70+ units | 12% |
| Tier 3 | 101+ units | 15% |

#### 4.3.3 Pricing Features
- Real-time quote generation
- Cart total calculation
- Next-tier upsell hints
- Currency rounding (half-up)

### 4.4 Shopping Cart

#### 4.4.1 Cart Features
- One cart per customer company
- Batch item upsert (matrix)
- Real-time pricing quotes
- Quantity validation

#### 4.4.2 Cart Operations
- Add items
- Update quantities
- Remove items (quantity = 0)
- View cart with live pricing

### 4.5 Order Management

#### 4.5.1 Order Flow
```
SUBMITTED → CONFIRMED → PROCESSING → PACKED → SHIPPED → COMPLETED
                │
                └──→ CANCELLED
```

#### 4.5.2 Order Features
- Cart-to-order conversion
- Inventory reservation
- Credit limit validation
- Immutable pricing snapshots
- Order number generation (ORD-YYYYMMDD-NNNN)
- Status tracking

#### 4.5.3 Order Operations
- Submit order
- Update status
- View order history
- View order details

### 4.6 Invoice Management

#### 4.6.1 Invoice Generation
- Auto-generated on order confirmation
- Net 30 payment terms
- Invoice number generation (INV-YYYYMMDD-NNNN)

#### 4.6.2 Invoice Features
- Status tracking (UNPAID, PARTIALLY_PAID, PAID, OVERDUE, VOID)
- Payment allocation
- Balance tracking

### 4.7 Payment Processing

#### 4.7.1 Payment Methods
- Bank Transfer
- Cheque
- Credit Card
- Cash
- Other

#### 4.7.2 Payment Features
- Payment recording
- Invoice allocation (explicit or FIFO)
- Payment number generation (PAY-YYYYMMDD-NNNN)
- Credit limit updates

### 4.8 Account Ledger

#### 4.8.1 Ledger Features
- Double-entry accounting
- Running balance
- Transaction types: INVOICE, PAYMENT, CREDIT_NOTE, ADJUSTMENT
- Statement generation

#### 4.8.2 Ledger Operations
- Post transactions
- Get customer balance
- Generate statements

### 4.9 Audit Trail

#### 4.9.1 Audit Features
- Immutable audit logs
- Before/after snapshots
- Actor tracking
- Entity tracking

#### 4.9.2 Audited Operations
- Pricing tier updates
- Payment recording
- Order status changes

## 5. Non-Functional Requirements

### 5.1 Performance

| Metric | Target | Current |
|--------|--------|---------|
| API Response Time | < 500ms | Not measured |
| Page Load Time | < 2 seconds | Not measured |
| Database Query Time | < 100ms | Not measured |
| Concurrent Users | 100+ | Not tested |

### 5.2 Scalability

- Horizontal scaling via stateless architecture
- Database scaling via read replicas
- CDN for static assets

### 5.3 Security

| Feature | Status | Priority |
|---------|--------|----------|
| JWT Authentication | ✅ Implemented | High |
| Password Hashing | ✅ Implemented | High |
| Input Validation | ✅ Implemented | High |
| Tenant Isolation | ✅ Implemented | High |
| Audit Logging | ✅ Implemented | High |
| Rate Limiting | ❌ Not Implemented | High |
| CSRF Protection | ⚠️ Partial | Medium |
| RBAC Enforcement | ❌ Not Implemented | Medium |

### 5.4 Reliability

- Transactional integrity for multi-step operations
- Database backups
- Error handling and logging
- Graceful degradation

### 5.5 Usability

- Responsive design (Tailwind CSS)
- Intuitive navigation
- Real-time feedback
- Accessibility (WCAG 2.1 AA)

## 6. Technical Specifications

### 6.1 Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | React | 19.0.0 |
| Framework | Next.js (App Router) | 15.1.6 |
| Styling | Tailwind CSS | 4.0.0 |
| Language | TypeScript | 5.7.3 |
| Database (Dev) | SQLite | - |
| Database (Prod) | MySQL | 8.0 |
| ORM | Prisma | 6.3.0 |
| Authentication | JWT + bcryptjs | 9.0.2 / 2.4.3 |
| Validation | Zod | 3.24.1 |
| Testing | Vitest | 3.0.4 |

### 6.2 Database Schema

**Total Models:** 22

| Domain | Models |
|--------|--------|
| Auth | User, Role, Permission, RolePermission |
| Customers | CustomerCompany, CustomerUser, Address, PaymentTerm |
| Catalogue | Product, Category, Collection, Color, Size, ProductVariant, ProductImage |
| Inventory | Inventory, InventoryLocation |
| Pricing | PricingTier |
| Cart | Cart, CartItem |
| Orders | Order, OrderItem |
| Finance | Invoice, InvoiceItem, Payment, PaymentAllocation, CreditNote |
| Ledger | AccountTransaction |
| Audit | AuditLog |
| System | SystemSetting |

### 6.3 API Endpoints

**Total Endpoints:** 16

| Category | Endpoints |
|----------|-----------|
| Auth | 3 (login, logout, me) |
| Catalog | 1 (products) |
| Cart | 2 (get, items) |
| Orders | 3 (list, submit, detail) |
| Account | 1 (statement) |
| Admin | 6 (tiers, customers, payments, audit-logs, order status) |

### 6.4 Frontend Pages

**Total Pages:** 11

| Section | Pages |
|---------|-------|
| Login | 1 |
| Admin | 6 (dashboard, orders, tiers, payments, customers, audit-logs) |
| Portal | 4 (catalog, cart, orders, statement) |

## 7. Data Models

### 7.1 Core Entities

#### User
- ID (UUID)
- Email (unique)
- Password Hash
- First Name, Last Name
- Phone
- User Type (ADMIN/CUSTOMER)
- Status (ACTIVE/INACTIVE/SUSPENDED)

#### CustomerCompany
- ID (UUID)
- Company Name
- Tax ID
- Registration Number
- Credit Limit
- Payment Terms
- Status (ACTIVE/SUSPENDED/ARCHIVED)

#### Product
- ID (UUID)
- Article Number (unique)
- Name
- Slug (unique)
- Description
- Category
- Collection
- Base Price
- Active Status

#### ProductVariant
- ID (UUID)
- Product
- Color
- Size
- SKU (unique)
- Active Status

#### Order
- ID (UUID)
- Order Number (unique)
- Customer
- Status
- Pricing Snapshots
- Financial Totals
- Currency

#### Invoice
- ID (UUID)
- Invoice Number (unique)
- Customer
- Order
- Issue Date, Due Date
- Status
- Financial Totals

#### Payment
- ID (UUID)
- Payment Number (unique)
- Customer
- Amount
- Payment Date, Method
- Reference Number
- Status

## 8. Business Rules

### 8.1 Order Rules

1. Customer must be ACTIVE
2. Cart must not be empty
3. All items must have sufficient stock
4. Order total must not exceed credit limit
5. Pricing is recalculated server-side

### 8.2 Pricing Rules

1. All pricing calculations are server-side only
2. Tiers are global (not per-product)
3. Highest qualifying tier is applied
4. Discount is distributed proportionally
5. Pricing snapshots are immutable

### 8.3 Payment Rules

1. Payment amount must be > 0
2. Invoice allocations cannot exceed invoice balance
3. Payment status changes are audited
4. Credit notes can be applied to invoices

### 8.4 Inventory Rules

1. Available = On Hand - Reserved
2. Orders reserve inventory
3. Cancellations release reserved inventory
4. Stock cannot go below 0

## 9. Security Specifications

### 9.1 Authentication

- JWT tokens with 24-hour expiry
- bcrypt password hashing (cost factor 10)
- httpOnly cookies for browser clients
- Authorization headers for API clients

### 9.2 Authorization

- Admin/Customer binary roles
- Tenant isolation for customer data
- Per-route authorization checks

### 9.3 Data Protection

- Input validation via Zod
- SQL injection prevention via Prisma
- XSS protection via React
- CSRF protection via SameSite cookies

### 9.4 Audit

- All state changes are logged
- Before/after snapshots
- Actor and timestamp tracking

## 10. Testing Strategy

### 10.1 Test Types

| Type | Coverage | Framework |
|------|----------|-----------|
| Unit Tests | PricingEngine | Vitest |
| Integration Tests | None | - |
| API Tests | None | - |
| E2E Tests | None | - |

### 10.2 Test Coverage

**Current:** 8 unit tests for PricingEngine  
**Target:** 80% code coverage

### 10.3 Testing Gaps

- No integration tests for services
- No API route tests
- No frontend component tests
- No E2E tests

## 11. Deployment

### 11.1 Environments

| Environment | Database | Server |
|-------------|----------|--------|
| Development | SQLite | npm run dev |
| Production | MySQL 8.0 | Docker/PM2 |

### 11.2 Deployment Steps

1. Build application (`npm run build`)
2. Run migrations (`npx prisma migrate deploy`)
3. Start server (`npm start` or PM2)

### 11.3 Infrastructure

- Docker for MySQL containerization
- PM2 for process management
- Nginx for reverse proxy
- Let's Encrypt for SSL

## 12. Monitoring & Logging

### 12.1 Logging

- Application logs (stdout/stderr)
- Database query logs (development)
- Audit logs (database)

### 12.2 Monitoring

- PM2 monitoring
- Docker container monitoring
- Health check endpoints

## 13. Future Enhancements

### 13.1 High Priority

1. Implement RBAC enforcement
2. Add pagination to all list endpoints
3. Implement rate limiting
4. Add comprehensive test coverage
5. Implement password reset flow

### 13.2 Medium Priority

1. Add caching layer (Redis)
2. Implement soft deletes
3. Add email notifications
4. Implement advanced search/filtering
5. Add export functionality (PDF/CSV)

### 13.3 Low Priority

1. Add multi-currency support
2. Implement two-factor authentication
3. Add real-time notifications (WebSocket)
4. Implement advanced analytics dashboard
5. Add mobile app support

## 14. Appendices

### 14.1 Glossary

| Term | Definition |
|------|------------|
| B2B | Business-to-Business |
| SKU | Stock Keeping Unit |
| JWT | JSON Web Token |
| RBAC | Role-Based Access Control |
| CSRF | Cross-Site Request Forgery |
| XSS | Cross-Site Scripting |
| ORM | Object-Relational Mapping |

### 14.2 References

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

**Document Version:** 1.0  
**Last Updated:** September 2026  
**Author:** Architecture Analysis  
**Status:** Draft

# StarFashion Wholesale - Session State
# Last Updated: 2026-09-08
# This file captures the complete implementation state for continuity across sessions.

## Quick Start
- **Repo:** https://github.com/apexsolutions78/starfashion_ws.git (branch: master)
- **Admin Login:** `admin@starfashion.com` / `Password123!`
- **Customer Login:** `buyer@fashionretail.com` / `Password123!`
- **Dev Server:** `npm run dev` (port 3000)
- **DB:** SQLite (`prisma/dev.db`), reset via `npx prisma db push` + `npx tsx prisma/seed.ts`

## Architecture
- Next.js 15 App Router, TypeScript, Prisma ORM, SQLite (dev) / MySQL (prod)
- Currency: PKR (Rs.)
- Image restrictions: JPEG/PNG, 3MB max, 5MP resolution, 10 files per upload

## Roles
- MASTER_ADMIN: Full access + user management + approve customers + sales dept + roles/permissions
- ADMIN: Full access except user management
- USER: Products only (Add, Edit)
- SALES: Sales department portal (`/sales/*`)

## Implemented Features

### Product Management
- Full CRUD at `/admin/products`, `/admin/products/new`, `/admin/products/[id]`
- CSV Import at `/admin/products` with auto-detection of old/new format
- Image upload with Browse button, compression confirmation for >5MP
- Color-based image assignment (ProductImage.colorId)
- Product fields: articleNumber, name (optional), slug, description, shirtStyle, dupattaStyle, trouserStyle, categoryId, collectionId, basePrice
- CSV template columns: Article Number*, Base Price*, Product Name, Description, Shirt Style, Dupatta Style, Trouser Style, Category*, Collection*, Color, Size, SKU (optional), Stock

### Order Processing
- Flow: SUBMITTED → ON_HOLD → ACCEPTED → (payment) → CONFIRMED → PROCESSING → DISPATCHED
- Admin review at `/admin/orders` with hold timer (holdDays, holdExpiresAt)
- Auto-cancel expired orders via `/api/v1/admin/orders/auto-cancel`
- Customer accept/reject via `PATCH /api/v1/orders/[id]/action`
- PDF dispatch notes (new window print)

### Customer Management
- Self-service registration at `/register` with admin approval
- Customer portal at `/portal/*` (catalog, cart, orders, payments, profile, addresses, statement)
- Onboarding: contactName, companyName, phone, city, country required
- Account statement with PDF download (window.print)

### Payment System
- Payment model with orderId, screenshotPath, status (PENDING default)
- Customer payment submission after order
- Admin payment recording at `/admin/payments`
- Payment auto-confirms ACCEPTED orders when payment received
- "Due on Order" = 100% advance required

### Sales Department
- Admin management at `/admin/sales` (create/edit sales users, permissions, assignments, commissions)
- Sales portal at `/sales/*` (dashboard, customers, reports)
- SalesPermission: canProcessOrders, canDispatchOrders, canManageTiers, canChangePaymentTerms

### Roles & Permissions (Enforced)
- Merged into User Management at `/admin/users` (Users tab + Roles & Permissions tab)
- 20 predefined permissions across 10 groups
- MASTER_ADMIN bypasses all permission checks
- Backend: `requirePermission()` in `src/lib/permissions.ts`
- Frontend: `<HasPermission>` component + `usePermissions()` hook
- Permissions API: `/api/v1/admin/my-permissions`

### Permission-to-Route Mapping
| Permission | Routes |
|------------|--------|
| catalog:read | products GET, products/[id] GET, import/template GET |
| catalog:write | products POST/PUT/DELETE, images POST/DELETE, import POST |
| orders:read | orders/[id]/review GET |
| orders:process | orders/[id]/review PUT, orders/[id]/status PUT, auto-cancel POST |
| payments:read | payments GET |
| payments:record | payments POST |
| tiers:read | pricing-tiers GET |
| tiers:manage | pricing-tiers PUT |
| customers:read | customers GET |
| customers:manage | customers POST/PUT, approval POST/PUT |
| stock:read | stock GET |
| stock:manage | stock/[id] PATCH, stock/bulk POST |
| reports:read | counts GET, audit-logs GET |
| settings:read | profile GET |
| settings:manage | profile PUT |
| users:manage | users CRUD, roles CRUD, permissions CRUD |

### Mobile Responsiveness
- All tables wrapped in `overflow-x-auto`
- Grids stack on mobile (`grid-cols-1 sm:grid-cols-2/3`)
- Button rows use `flex-wrap`
- Portal header: hamburger menu on mobile with cart badge
- Cart: desktop 2-col layout, mobile card view with +/- qty adjusters

### Image Carousel
- Per-product carousel with prev/next arrows
- Arrows always visible on mobile, hover-only on desktop
- Dot indicators in dark backdrop pill
- Touch swipe support (50px threshold)

## Key Files
- `prisma/schema.prisma` — All database models
- `prisma/seed.ts` — Seed data (admin, customer, products, permissions, roles)
- `src/lib/permissions.ts` — Permission checker utility
- `src/lib/permissions-context.tsx` — React context for frontend permissions
- `src/lib/auth.ts` — JWT auth utilities
- `src/lib/middleware-auth.ts` — Session extraction from request
- `src/lib/api-response.ts` — Standardized API responses
- `src/services/PricingEngine.ts` — Tier-based pricing calculation
- `src/services/OrderService.ts` — Order creation with credit validation
- `src/services/PaymentService.ts` — Payment processing

## API Routes (Admin)
- `GET/POST /api/v1/admin/products` — List/create products
- `GET/PUT/DELETE /api/v1/admin/products/[id]` — Product CRUD
- `POST/DELETE /api/v1/admin/products/[id]/images` — Image upload/delete
- `POST /api/v1/admin/products/import` — CSV import
- `GET /api/v1/admin/products/import/template` — Download CSV template
- `GET/POST /api/v1/admin/customers` — List/update customers
- `POST/PUT /api/v1/admin/customers/[id]/approval` — Approve/reject
- `GET/POST /api/v1/admin/payments` — List/record payments
- `GET/PUT /api/v1/admin/pricing-tiers` — Tier management
- `GET/PATCH /api/v1/admin/stock`, `POST /api/v1/admin/stock/bulk` — Stock management
- `GET /api/v1/admin/counts` — Sidebar badge counts
- `GET /api/v1/admin/audit-logs` — Audit trail
- `GET/PUT /api/v1/admin/profile` — Admin profile
- `GET/POST/PUT/DELETE /api/v1/admin/users` — User management
- `GET/POST /api/v1/admin/roles`, `GET/PUT/DELETE /api/v1/admin/roles/[id]` — Role management
- `GET/PUT /api/v1/admin/roles/[id]/permissions` — Role permissions
- `GET /api/v1/admin/permissions` — List permissions
- `GET /api/v1/admin/my-permissions` — Current user permissions
- `GET/POST /api/v1/admin/sales` — Sales users
- `GET/PUT/DELETE /api/v1/admin/sales/[id]` — Sales user CRUD
- `GET/PUT /api/v1/admin/sales/[id]/permissions` — Sales permissions
- `GET/POST/DELETE /api/v1/admin/sales/[id]/assignments` — Customer assignments
- `GET/POST /api/v1/admin/sales/[id]/commissions` — Commissions
- `PUT /api/v1/admin/orders/[id]/status` — Update order status
- `GET/PUT /api/v1/admin/orders/[id]/review` — Order review
- `POST /api/v1/admin/orders/auto-cancel` — Auto-cancel expired

## API Routes (Portal)
- `GET /api/v1/catalog/products` — Public product catalog
- `GET/POST/PUT/DELETE /api/v1/addresses` — Customer addresses
- `GET/POST /api/v1/notifications` — Customer notifications
- `PATCH /api/v1/orders/[id]/action` — Accept/reject order

## API Routes (Sales)
- `GET /api/v1/sales/dashboard` — Sales dashboard
- `GET /api/v1/sales/customers` — Assigned customers
- `GET /api/v1/sales/reports` — Filtered reports

## Database Models (Key)
- User (id, email, passwordHash, firstName, lastName, phone, userType, role, department, status, approvalStatus)
- CustomerCompany (id, companyName, taxId, registrationNumber, creditLimit, paymentTermsId, status, onboardingStatus, contactName, phone, city, country, minOrderQty, assignedSalesUserId)
- Product (id, articleNumber, name?, slug, description?, shirtStyle?, dupattaStyle?, trouserStyle?, categoryId, collectionId?, basePrice, active)
- ProductVariant (id, productId, colorId, sizeId, sku, active, inProduction, estimatedAvailability)
- ProductImage (id, productId, colorId?, imagePath, isPrimary, sortOrder)
- Order (id, orderNumber, customerId, status, grossSubtotal, discountTotal, shippingTotal, taxTotal, grandTotal, tierDiscountPercent, holdDays?, holdExpiresAt?, adminNotes?, customerReviewed, reviewedByUserId?, reviewedAt?)
- Payment (id, customerId, orderId?, amount, paymentMethod, referenceNumber, notes, screenshotPath, status)
- CustomerNotification (id, customerId, title, message, type, orderId?, isRead)
- SalesAssignment (id, salesUserId, customerId, notes, assignedAt)
- SalesPermission (salesUserId PK, canProcessOrders, canDispatchOrders, canManageTiers, canChangePaymentTerms)
- Role (id, name, description?)
- Permission (id, code, description?)
- RolePermission (roleId, permissionId)

## Recent Changes (This Session)
1. Merged Roles & Permissions into User Management page (`/admin/users`)
2. Removed standalone `/admin/roles` page and nav link
3. Added 20 permissions to seed data
4. Fixed admin profile API to return `role` and `department`
5. Fixed stock/counts endpoints to check `userType === 'ADMIN'`
6. Fixed auto-cancel endpoint auth
7. Fixed user creation to accept custom roles from Role table
8. Implemented full permission-based enforcement across all API routes
9. Created `src/lib/permissions.ts` (requirePermission, hasPermission, PERMISSIONS constants)
10. Created `src/lib/permissions-context.tsx` (usePermissions, HasPermission, PermissionsProvider)
11. Created `/api/v1/admin/my-permissions` endpoint
12. Updated 18 admin API routes to use permission checks
13. Updated 9 admin pages with `<HasPermission>` components
14. Changed image upload limit from 5MB to 3MB
15. Added product fields: shirtStyle, dupattaStyle, trouserStyle (all optional)
16. Made Product.name optional in schema
17. Updated CSV import template and parser for new field order
18. Updated PricingEngine types for nullable productName
19. Removed Slug field from product forms — auto-generated from Article Number
20. Added inline Category management (add/delete) on product new/edit pages
21. Added inline Collection management (add/delete) on product new/edit pages
22. Added inline Color management with swatches (add/delete with color picker) on product new/edit pages
23. Created API routes: `/api/v1/admin/categories`, `/api/v1/admin/collections`, `/api/v1/admin/colors` (GET/POST/DELETE)
24. Fixed null permissions crash on sales user detail page (`/admin/sales/[id]`)
25. Fixed CSV parser to handle quoted fields containing commas (replaced `split(',')` with proper `parseCSVLine()` function)
26. Added variant management: Create (`POST`) and Delete (`DELETE`) API at `/api/v1/admin/products/[id]/variants`
27. Added variant management UI on product edit page (add form + delete buttons)
28. Fixed sales commission field name mismatch: frontend now sends `commissionRate`/`bonusAmount` to match API
29. Fixed Commission interface: `rate`→`commissionRate`, `bonus`→`bonusAmount`
30. Fixed commission display null safety: `(c.bonusAmount || 0).toFixed(2)`

## Key API Routes (New)
- `GET/POST/DELETE /api/v1/admin/categories` — Category CRUD (delete checks for product usage)
- `GET/POST/DELETE /api/v1/admin/collections` — Collection CRUD (delete checks for product usage)
- `GET/POST/DELETE /api/v1/admin/colors` — Color CRUD with hex code (delete checks for variant usage)
- `POST/DELETE /api/v1/admin/products/[id]/variants` — Variant CRUD (create with color/size/SKU/stock, delete with order check)

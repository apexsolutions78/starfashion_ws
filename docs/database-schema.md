# StarFashion Wholesale Portal - Database Schema Documentation

## 1. Overview

The StarFashion Wholesale Portal uses a relational database with 22 models organized into 8 domains. The schema supports multi-tenancy, historical pricing snapshots, and a double-entry customer ledger.

**Database Configuration:**
- **Development:** SQLite (`prisma/dev.db`)
- **Production:** MySQL 8.0 (via Docker)

## 2. Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              AUTHENTICATION & USERS                                  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌─────────────┐     ┌──────────────┐     ┌─────────────────┐                      │
│  │    User      │────<│ CustomerUser │>────│ CustomerCompany  │                      │
│  │  (users)     │     │(customer_    │     │(customer_        │                      │
│  │              │     │  users)      │     │  companies)      │                      │
│  └─────────────┘     └──────────────┘     └─────────────────┘                      │
│         │                                          │                                │
│         │                                          │                                │
│  ┌──────┴──────┐                          ┌───────┴───────┐                        │
│  │   Role      │                          │   Address     │                        │
│  │  (roles)    │                          │ (addresses)   │                        │
│  └─────────────┘                          └───────────────┘                        │
│         │                                                                            │
│  ┌──────┴──────┐                          ┌───────────────┐                        │
│  │ Permission  │                          │ PaymentTerm   │                        │
│  │(permissions)│                          │(payment_terms)│                        │
│  └─────────────┘                          └───────────────┘                        │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              PRODUCT CATALOGUE                                       │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌─────────────┐     ┌──────────────┐     ┌─────────────────┐                      │
│  │  Category    │────<│   Product     │>────│   Collection    │                      │
│  │ (categories) │     │ (products)    │     │ (collections)   │                      │
│  └─────────────┘     └──────────────┘     └─────────────────┘                      │
│         │                  │                                                        │
│         │                  │                                                        │
│  ┌──────┴──────┐   ┌──────┴──────┐   ┌──────────────┐                            │
│  │  Category   │   │   Color     │   │    Size      │                            │
│  │ (self-ref)  │   │ (colors)    │   │   (sizes)    │                            │
│  └─────────────┘   └─────────────┘   └──────────────┘                            │
│                          │                  │                                      │
│                          └────────┬─────────┘                                      │
│                                   │                                                │
│                          ┌────────┴────────┐                                      │
│                          │ ProductVariant   │                                      │
│                          │(product_variants)│                                      │
│                          └────────┬────────┘                                      │
│                                   │                                                │
│                    ┌──────────────┼──────────────┐                                │
│                    │              │              │                                │
│           ┌────────┴───────┐ ┌────┴─────┐ ┌─────┴────────┐                      │
│           │ ProductImage   │ │Inventory │ │  CartItem    │                      │
│           │(product_images)│ │(inventory)│ │ (cart_items) │                      │
│           └────────────────┘ └──────────┘ └──────────────┘                      │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              ORDERS & CART                                           │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌─────────────┐     ┌──────────────┐     ┌─────────────────┐                      │
│  │    Cart      │────<│  CartItem    │     │    Order        │                      │
│  │   (carts)    │     │ (cart_items) │     │   (orders)      │                      │
│  └─────────────┘     └──────────────┘     └────────┬────────┘                      │
│                                                       │                              │
│                                                       │                              │
│                                              ┌────────┴────────┐                    │
│                                              │   OrderItem     │                    │
│                                              │ (order_items)   │                    │
│                                              └─────────────────┘                    │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              FINANCIAL                                               │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌─────────────┐     ┌──────────────┐     ┌─────────────────┐                      │
│  │   Invoice    │────<│ InvoiceItem  │     │    Payment      │                      │
│  │  (invoices)  │     │(invoice_     │     │   (payments)    │                      │
│  └─────────────┘     │  items)      │     └────────┬────────┘                      │
│                       └──────────────┘              │                              │
│                                                       │                              │
│                                              ┌────────┴────────┐                    │
│                                              │PaymentAllocation│                    │
│                                              │(payment_        │                    │
│                                              │  allocations)   │                    │
│                                              └─────────────────┘                    │
│                                                                                     │
│  ┌─────────────┐     ┌──────────────┐                                              │
│  │CreditNote   │     │AccountTxn    │                                              │
│  │(credit_     │     │(account_     │                                              │
│  │  notes)     │     │transactions) │                                              │
│  └─────────────┘     └──────────────┘                                              │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              SYSTEM                                                  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌─────────────┐     ┌──────────────┐     ┌─────────────────┐                      │
│  │  AuditLog   │     │SystemSetting │     │InventoryLocation│                      │
│  │(audit_logs) │     │(system_      │     │(inventory_      │                      │
│  └─────────────┘     │  settings)   │     │  locations)     │                      │
│                       └──────────────┘     └─────────────────┘                      │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## 3. Domain Models

### 3.1 Authentication & Users

#### User Model
**Table:** `users`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, UUID | Unique identifier |
| email | String | UNIQUE | User email address |
| passwordHash | String | - | Bcrypt hashed password |
| firstName | String | - | User's first name |
| lastName | String | - | User's last name |
| phone | String? | - | Optional phone number |
| userType | String | DEFAULT "CUSTOMER" | "ADMIN" or "CUSTOMER" |
| status | String | DEFAULT "ACTIVE" | "ACTIVE", "INACTIVE", or "SUSPENDED" |
| lastLoginAt | DateTime? | - | Last login timestamp |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | @updatedAt | Last update timestamp |

**Relationships:**
- `customerUsers` → CustomerUser[]
- `recordedPayments` → Payment[]
- `createdTransactions` → AccountTransaction[]
- `auditLogs` → AuditLog[]
- `systemSettings` → SystemSetting[]

#### CustomerUser Model
**Table:** `customer_users`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, UUID | Unique identifier |
| customerId | String | FK → CustomerCompany | Company reference |
| userId | String | FK → User | User reference |
| role | String | DEFAULT "BUYER" | "OWNER", "BUYER", or "VIEWER" |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |

**Constraints:**
- UNIQUE(customerId, userId)

#### CustomerCompany Model
**Table:** `customer_companies`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, UUID | Unique identifier |
| companyName | String | - | Company name |
| taxId | String? | - | Tax identification number |
| registrationNumber | String? | - | Business registration number |
| creditLimit | Float | DEFAULT 0.0 | Maximum credit allowed (EUR) |
| paymentTermsId | String? | FK → PaymentTerm | Payment terms reference |
| status | String | DEFAULT "ACTIVE" | "ACTIVE", "SUSPENDED", or "ARCHIVED" |
| notes | String? | - | Optional notes |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | @updatedAt | Last update timestamp |

**Relationships:**
- `paymentTerms` → PaymentTerm
- `customerUsers` → CustomerUser[]
- `addresses` → Address[]
- `carts` → Cart[]
- `orders` → Order[]
- `invoices` → Invoice[]
- `payments` → Payment[]
- `accountTransactions` → AccountTransaction[]
- `creditNotes` → CreditNote[]

#### Address Model
**Table:** `addresses`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, UUID | Unique identifier |
| customerId | String | FK → CustomerCompany | Company reference |
| type | String | DEFAULT "SHIPPING" | "BILLING" or "SHIPPING" |
| addressLine1 | String | - | Primary address line |
| addressLine2 | String? | - | Secondary address line |
| city | String | - | City name |
| state | String? | - | State/Province |
| postalCode | String | - | Postal/ZIP code |
| country | String | DEFAULT "Germany" | Country name |
| contactName | String | - | Contact person name |
| contactPhone | String? | - | Contact phone number |
| isDefault | Boolean | DEFAULT false | Default address flag |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | @updatedAt | Last update timestamp |

#### PaymentTerm Model
**Table:** `payment_terms`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, UUID | Unique identifier |
| name | String | - | Term name (e.g., "Net 30") |
| daysDue | Int | DEFAULT 30 | Days until payment due |
| description | String? | - | Optional description |
| active | Boolean | DEFAULT true | Active status |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |

**Relationships:**
- `companies` → CustomerCompany[]

#### Role Model
**Table:** `roles`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, UUID | Unique identifier |
| name | String | UNIQUE | Role name |
| description | String? | - | Optional description |

**Predefined Roles (from seed):**
- MASTER_ADMIN
- SALES_ADMIN
- ACCOUNTS_ADMIN
- WAREHOUSE_ADMIN

#### Permission Model
**Table:** `permissions`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, UUID | Unique identifier |
| code | String | UNIQUE | Permission code (e.g., "catalog:read") |
| description | String? | - | Optional description |

#### RolePermission Model
**Table:** `role_permissions`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| roleId | String | FK → Role, PK | Role reference |
| permissionId | String | FK → Permission, PK | Permission reference |

### 3.2 Product Catalogue

#### Category Model
**Table:** `categories`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, UUID | Unique identifier |
| name | String | - | Category name |
| slug | String | UNIQUE | URL-friendly identifier |
| parentId | String? | FK → Category (self) | Parent category reference |
| sortOrder | Int | DEFAULT 0 | Display order |
| active | Boolean | DEFAULT true | Active status |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | @updatedAt | Last update timestamp |

**Relationships:**
- `parent` → Category (self-referencing)
- `children` → Category[] (self-referencing)
- `products` → Product[]

**Predefined Categories (from seed):**
- Women's Wear
- Men's Wear

#### Collection Model
**Table:** `collections`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, UUID | Unique identifier |
| name | String | - | Collection name |
| season | String? | - | Season (e.g., "SS2026") |
| year | Int? | - | Year |
| active | Boolean | DEFAULT true | Active status |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |

**Relationships:**
- `products` → Product[]

**Predefined Collections (from seed):**
- Spring/Summer 2026

#### Product Model
**Table:** `products`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, UUID | Unique identifier |
| articleNumber | String | UNIQUE | Article/SKU number |
| name | String | - | Product name |
| slug | String | UNIQUE | URL-friendly identifier |
| description | String? | - | Product description |
| categoryId | String | FK → Category | Category reference |
| collectionId | String? | FK → Collection | Collection reference |
| basePrice | Float | - | Wholesale base price (EUR) |
| active | Boolean | DEFAULT true | Active status |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | @updatedAt | Last update timestamp |

**Relationships:**
- `category` → Category
- `collection` → Collection
- `variants` → ProductVariant[]
- `images` → ProductImage[]

#### Color Model
**Table:** `colors`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, UUID | Unique identifier |
| name | String | - | Color name |
| hexCode | String? | - | Hex color code |
| active | Boolean | DEFAULT true | Active status |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |

**Relationships:**
- `variants` → ProductVariant[]

**Predefined Colors (from seed):**
- Black
- White
- Navy
- Beige

#### Size Model
**Table:** `sizes`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, UUID | Unique identifier |
| name | String | - | Size name (e.g., "S", "M", "L") |
| sortOrder | Int | DEFAULT 0 | Display order |
| active | Boolean | DEFAULT true | Active status |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |

**Relationships:**
- `variants` → ProductVariant[]

**Predefined Sizes (from seed):**
- S, M, L, XL

#### ProductVariant Model
**Table:** `product_variants`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, UUID | Unique identifier |
| productId | String | FK → Product | Product reference |
| colorId | String | FK → Color | Color reference |
| sizeId | String | FK → Size | Size reference |
| sku | String | UNIQUE | Stock Keeping Unit |
| active | Boolean | DEFAULT true | Active status |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | @updatedAt | Last update timestamp |

**Constraints:**
- UNIQUE(productId, colorId, sizeId)

**Relationships:**
- `product` → Product
- `color` → Color
- `size` → Size
- `inventory` → Inventory[]
- `cartItems` → CartItem[]
- `orderItems` → OrderItem[]
- `images` → ProductImage[]

#### ProductImage Model
**Table:** `product_images`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, UUID | Unique identifier |
| productId | String | FK → Product | Product reference |
| variantId | String? | FK → ProductVariant | Optional variant reference |
| imagePath | String | - | Image file path |
| sortOrder | Int | DEFAULT 0 | Display order |
| isPrimary | Boolean | DEFAULT false | Primary image flag |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |

**Relationships:**
- `product` → Product
- `variant` → ProductVariant

#### InventoryLocation Model
**Table:** `inventory_locations`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, UUID | Unique identifier |
| name | String | - | Location name |
| code | String | UNIQUE | Location code |
| address | String? | - | Physical address |
| active | Boolean | DEFAULT true | Active status |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |

**Relationships:**
- `inventory` → Inventory[]

#### Inventory Model
**Table:** `inventory`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, UUID | Unique identifier |
| variantId | String | FK → ProductVariant | Variant reference |
| locationId | String | FK → InventoryLocation | Location reference |
| onHand | Int | DEFAULT 0 | Physical stock count |
| reserved | Int | DEFAULT 0 | Reserved for orders |
| reorderLevel | Int | DEFAULT 10 | Reorder threshold |
| updatedAt | DateTime | @updatedAt | Last update timestamp |

**Constraints:**
- UNIQUE(variantId, locationId)

**Relationships:**
- `variant` → ProductVariant
- `location` → InventoryLocation

**Computed Properties:**
- `available = onHand - reserved`

### 3.3 Pricing

#### PricingTier Model
**Table:** `pricing_tiers`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, UUID | Unique identifier |
| name | String | - | Tier name (e.g., "Tier 1 (30+)") |
| minQuantity | Int | UNIQUE | Minimum quantity for tier |
| discountPercent | Float | - | Discount percentage |
| active | Boolean | DEFAULT true | Active status |
| sortOrder | Int | DEFAULT 0 | Display order |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | @updatedAt | Last update timestamp |

**Predefined Tiers (from seed):**
- Tier 1 (30+): 10% discount
- Tier 2 (70+): 12% discount
- Tier 3 (101+): 15% discount

### 3.4 Cart

#### Cart Model
**Table:** `carts`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, UUID | Unique identifier |
| customerId | String | UNIQUE, FK → CustomerCompany | Company reference |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | @updatedAt | Last update timestamp |

**Relationships:**
- `customer` → CustomerCompany
- `items` → CartItem[]

#### CartItem Model
**Table:** `cart_items`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, UUID | Unique identifier |
| cartId | String | FK → Cart | Cart reference |
| variantId | String | FK → ProductVariant | Variant reference |
| quantity | Int | - | Item quantity |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | @updatedAt | Last update timestamp |

**Constraints:**
- UNIQUE(cartId, variantId)

**Relationships:**
- `cart` → Cart
- `variant` → ProductVariant

### 3.5 Orders

#### Order Model
**Table:** `orders`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, UUID | Unique identifier |
| orderNumber | String | UNIQUE | Order number (ORD-YYYYMMDD-NNNN) |
| customerId | String | FK → CustomerCompany | Company reference |
| status | String | DEFAULT "SUBMITTED" | Order status |
| qualifyingQty | Int | - | Quantity qualifying for tier |
| tierIdSnapshot | String? | - | Applied tier ID |
| discountPercentSnapshot | Float | DEFAULT 0.0 | Applied discount % |
| grossSubtotal | Float | - | Subtotal before discount |
| discountTotal | Float | - | Total discount amount |
| netSubtotal | Float | - | Subtotal after discount |
| shippingTotal | Float | DEFAULT 0.0 | Shipping cost |
| taxTotal | Float | DEFAULT 0.0 | Tax amount |
| grandTotal | Float | - | Final total |
| currency | String | DEFAULT "EUR" | Currency code |
| notes | String? | - | Order notes |
| createdByUserId | String? | - | Creator user ID |
| submittedAt | DateTime | DEFAULT now() | Submission timestamp |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | @updatedAt | Last update timestamp |

**Status Values:**
- SUBMITTED
- CONFIRMED
- PROCESSING
- PACKED
- SHIPPED
- COMPLETED
- CANCELLED
- ON_HOLD

**Relationships:**
- `customer` → CustomerCompany
- `items` → OrderItem[]
- `invoice` → Invoice?

#### OrderItem Model
**Table:** `order_items`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, UUID | Unique identifier |
| orderId | String | FK → Order | Order reference |
| variantId | String | FK → ProductVariant | Variant reference |
| articleNumberSnapshot | String | - | Article number at order time |
| productNameSnapshot | String | - | Product name at order time |
| skuSnapshot | String | - | SKU at order time |
| colorSnapshot | String | - | Color at order time |
| sizeSnapshot | String | - | Size at order time |
| baseUnitPriceSnapshot | Float | - | Unit price at order time |
| quantity | Int | - | Ordered quantity |
| lineGross | Float | - | Line total before discount |
| lineDiscount | Float | - | Line discount amount |
| lineNet | Float | - | Line total after discount |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |

**Relationships:**
- `order` → Order
- `variant` → ProductVariant

### 3.6 Financial

#### Invoice Model
**Table:** `invoices`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, UUID | Unique identifier |
| invoiceNumber | String | UNIQUE | Invoice number (INV-YYYYMMDD-NNNN) |
| customerId | String | FK → CustomerCompany | Company reference |
| orderId | String | UNIQUE, FK → Order | Order reference |
| issueDate | DateTime | DEFAULT now() | Issue date |
| dueDate | DateTime | - | Payment due date |
| status | String | DEFAULT "UNPAID" | Invoice status |
| subtotal | Float | - | Subtotal |
| taxTotal | Float | DEFAULT 0.0 | Tax amount |
| shippingTotal | Float | DEFAULT 0.0 | Shipping cost |
| totalAmount | Float | - | Total amount |
| paidAmount | Float | DEFAULT 0.0 | Amount paid |
| balanceDue | Float | - | Remaining balance |
| currency | String | DEFAULT "EUR" | Currency code |
| notes | String? | - | Invoice notes |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | @updatedAt | Last update timestamp |

**Status Values:**
- UNPAID
- PARTIALLY_PAID
- PAID
- OVERDUE
- VOID

**Relationships:**
- `customer` → CustomerCompany
- `order` → Order
- `items` → InvoiceItem[]
- `allocations` → PaymentAllocation[]
- `creditNotes` → CreditNote[]

#### InvoiceItem Model
**Table:** `invoice_items`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, UUID | Unique identifier |
| invoiceId | String | FK → Invoice | Invoice reference |
| descriptionSnapshot | String | - | Description at invoice time |
| quantity | Int | - | Quantity |
| unitPrice | Float | - | Unit price |
| lineDiscount | Float | DEFAULT 0.0 | Line discount |
| lineTotal | Float | - | Line total |

**Relationships:**
- `invoice` → Invoice

#### Payment Model
**Table:** `payments`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, UUID | Unique identifier |
| paymentNumber | String | UNIQUE | Payment number (PAY-YYYYMMDD-NNNN) |
| customerId | String | FK → CustomerCompany | Company reference |
| amount | Float | - | Payment amount |
| paymentDate | DateTime | DEFAULT now() | Payment date |
| paymentMethod | String | DEFAULT "BANK_TRANSFER" | Payment method |
| referenceNumber | String? | - | External reference |
| status | String | DEFAULT "POSTED" | Payment status |
| notes | String? | - | Payment notes |
| recordedByUserId | String? | FK → User | Recorder user ID |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |

**Payment Methods:**
- BANK_TRANSFER
- CHEQUE
- CREDIT_CARD
- CASH
- OTHER

**Status Values:**
- POSTED
- VOID
- PENDING

**Relationships:**
- `customer` → CustomerCompany
- `recordedBy` → User
- `allocations` → PaymentAllocation[]

#### PaymentAllocation Model
**Table:** `payment_allocations`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, UUID | Unique identifier |
| paymentId | String | FK → Payment | Payment reference |
| invoiceId | String | FK → Invoice | Invoice reference |
| amount | Float | - | Allocated amount |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |

**Relationships:**
- `payment` → Payment
- `invoice` → Invoice

#### AccountTransaction Model
**Table:** `account_transactions`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, UUID | Unique identifier |
| customerId | String | FK → CustomerCompany | Company reference |
| transactionType | String | - | Transaction type |
| referenceType | String? | - | Reference entity type |
| referenceId | String? | - | Reference entity ID |
| debit | Float | DEFAULT 0.0 | Debit amount |
| credit | Float | DEFAULT 0.0 | Credit amount |
| postedAt | DateTime | DEFAULT now() | Posting timestamp |
| runningBalance | Float | - | Running balance |
| notes | String? | - | Transaction notes |
| createdByUserId | String? | FK → User | Creator user ID |

**Transaction Types:**
- INVOICE (Debit)
- PAYMENT (Credit)
- CREDIT_NOTE (Credit)
- ADJUSTMENT (Debit or Credit)

**Relationships:**
- `customer` → CustomerCompany
- `createdBy` → User

#### CreditNote Model
**Table:** `credit_notes`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, UUID | Unique identifier |
| creditNoteNumber | String | UNIQUE | Credit note number |
| customerId | String | FK → CustomerCompany | Company reference |
| invoiceId | String? | FK → Invoice | Optional invoice reference |
| amount | Float | - | Credit amount |
| reason | String | - | Reason for credit |
| status | String | DEFAULT "ISSUED" | Credit note status |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |

**Status Values:**
- ISSUED
- APPLIED
- VOID

**Relationships:**
- `customer` → CustomerCompany
- `invoice` → Invoice

### 3.7 System

#### AuditLog Model
**Table:** `audit_logs`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | String | PK, UUID | Unique identifier |
| actorId | String? | FK → User | Actor user ID |
| actorEmail | String | - | Actor email (denormalized) |
| action | String | - | Action performed |
| entityType | String | - | Entity type affected |
| entityId | String | - | Entity ID affected |
| beforeJson | String? | - | State before change (JSON) |
| afterJson | String? | - | State after change (JSON) |
| ipAddress | String? | - | Client IP address |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |

**Relationships:**
- `actor` → User

**Predefined Actions (from code):**
- TIER_UPDATED
- PAYMENT_RECORDED
- ORDER_STATUS_CHANGED

#### SystemSetting Model
**Table:** `system_settings`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| key | String | PK | Setting key |
| value | String | - | Setting value |
| dataType | String | DEFAULT "STRING" | Value data type |
| description | String? | - | Setting description |
| updatedByUserId | String? | FK → User | Last updater user ID |
| updatedAt | DateTime | @updatedAt | Last update timestamp |

**Data Types:**
- STRING
- NUMBER
- BOOLEAN
- JSON

**Relationships:**
- `updatedBy` → User

## 4. Indexes

Prisma automatically creates indexes for:
- Primary keys (all models)
- Unique constraints (all models)
- Foreign keys (all relationship fields)

**Recommended Additional Indexes:**
```sql
-- Performance optimization indexes
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_account_transactions_customer_id ON account_transactions(customer_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

## 5. Migration Strategy

### 5.1 Development Migrations

```bash
# Create new migration
npm run db:migrate

# Apply migrations
npx prisma migrate dev

# Reset database
npx prisma migrate reset
```

### 5.2 Production Migrations

```bash
# Generate migration SQL
npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma

# Apply to production
npx prisma migrate deploy
```

## 6. Seed Data

The seed script (`prisma/seed.ts`) creates:

| Entity | Count | Details |
|--------|-------|---------|
| Users | 2 | 1 Admin, 1 Customer |
| Customer Companies | 1 | Fashion Retail House GmbH |
| Payment Terms | 3 | Net 30, Net 60, Immediate |
| Categories | 2 | Women's Wear, Men's Wear |
| Collections | 1 | Spring/Summer 2026 |
| Products | 3 | With 6 variants each |
| Product Variants | 18 | Black/White x S/M/L |
| Colors | 4 | Black, White, Navy, Beige |
| Sizes | 4 | S, M, L, XL |
| Inventory | 18 | 500 units per variant |
| Pricing Tiers | 3 | 30+, 70+, 101+ |
| Roles | 4 | MASTER_ADMIN, SALES_ADMIN, ACCOUNTS_ADMIN, WAREHOUSE_ADMIN |

## 7. Data Integrity Rules

### 7.1 Cascading Deletes

| Parent | Child | Behavior |
|--------|-------|----------|
| CustomerCompany | CustomerUser | CASCADE |
| CustomerCompany | Address | CASCADE |
| CustomerCompany | Cart | CASCADE |
| Cart | CartItem | CASCADE |
| Product | ProductVariant | CASCADE |
| ProductVariant | Inventory | CASCADE |
| ProductVariant | CartItem | No action |
| ProductVariant | OrderItem | No action |
| Order | OrderItem | CASCADE |
| Invoice | InvoiceItem | CASCADE |
| Payment | PaymentAllocation | CASCADE |
| Invoice | PaymentAllocation | CASCADE |
| User | AuditLog | SET NULL |
| User | AccountTransaction | SET NULL |
| User | SystemSetting | SET NULL |

### 7.2 Unique Constraints

| Model | Fields | Description |
|-------|--------|-------------|
| User | email | One user per email |
| CustomerUser | customerId, userId | One relationship per user-company |
| ProductVariant | productId, colorId, sizeId | One variant per product-color-size |
| Cart | customerId | One cart per company |
| CartItem | cartId, variantId | One item per variant in cart |
| Order | orderNumber | Unique order numbers |
| Invoice | invoiceNumber, orderId | One invoice per order |
| Payment | paymentNumber | Unique payment numbers |
| PricingTier | minQuantity | Unique tier thresholds |
| InventoryLocation | code | Unique location codes |
| Inventory | variantId, locationId | One inventory record per variant-location |

## 8. Performance Considerations

### 8.1 Query Optimization

1. **Use Select:** Only fetch needed fields
2. **Use Include:** Eager load relationships when needed
3. **Use Take/Limit:** Paginate large result sets
4. **Use Indexes:** Add indexes for frequently queried fields

### 8.2 Connection Pooling

```typescript
// Prisma client with connection pooling
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});
```

### 8.3 Caching Strategy

1. **Application Level:** Cache frequently accessed data (products, tiers)
2. **Database Level:** Use MySQL query cache
3. **CDN Level:** Cache static assets and images

---

**Document Version:** 1.0  
**Last Updated:** September 2026  
**Author:** Architecture Analysis

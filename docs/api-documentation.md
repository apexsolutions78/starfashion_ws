# StarFashion Wholesale Portal - API Documentation

## 1. Overview

The StarFashion Wholesale Portal exposes a RESTful API for all system operations. The API follows a consistent pattern with standardized request/response formats.

**Base URL:** `/api/v1`

**Response Format:**
```json
{
  "success": boolean,
  "data"?: T,
  "error"?: string,
  "message"?: string
}
```

**Authentication:** JWT tokens delivered via:
- httpOnly cookie (`auth_token`)
- Authorization header (`Bearer <token>`)

## 2. Authentication Endpoints

### 2.1 Login

**Endpoint:** `POST /api/v1/auth/login`

**Description:** Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "userType": "ADMIN",
      "firstName": "John",
      "lastName": "Doe"
    }
  }
}
```

**Response (401):**
```json
{
  "success": false,
  "error": "Invalid email or password"
}
```

**Validation:**
- Email: Required, valid email format
- Password: Required, minimum 6 characters

**Side Effects:**
- Sets `auth_token` httpOnly cookie
- Updates `lastLoginAt` timestamp

---

### 2.2 Logout

**Endpoint:** `POST /api/v1/auth/logout`

**Description:** Clear authentication cookie.

**Request Body:** None

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Side Effects:**
- Clears `auth_token` cookie

---

### 2.3 Get Current User

**Endpoint:** `GET /api/v1/auth/me`

**Description:** Get current authenticated user session.

**Request Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "userType": "ADMIN",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890",
      "status": "ACTIVE",
      "lastLoginAt": "2026-09-01T10:00:00Z"
    },
    "company": {
      "id": "uuid",
      "companyName": "Fashion Retail House GmbH",
      "creditLimit": 50000,
      "paymentTerms": {
        "name": "Net 30",
        "daysDue": 30
      }
    }
  }
}
```

**Response (401):**
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

**Notes:**
- `company` field only present for CUSTOMER users
- Returns full user profile and company details

---

## 3. Catalog Endpoints

### 3.1 Get Products

**Endpoint:** `GET /api/v1/catalog/products`

**Description:** Search and filter products.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | No | Search term (name, articleNumber, description) |
| `categoryId` | string | No | Filter by category ID |
| `collectionId` | string | No | Filter by collection ID |

**Request Example:**
```
GET /api/v1/catalog/products?q=shirt&categoryId=uuid
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "uuid",
        "articleNumber": "ART-001",
        "name": "Classic White Shirt",
        "slug": "classic-white-shirt",
        "description": "A classic white cotton shirt",
        "basePrice": 25.00,
        "category": {
          "id": "uuid",
          "name": "Men's Wear"
        },
        "collection": {
          "id": "uuid",
          "name": "Spring/Summer 2026"
        },
        "variants": [
          {
            "id": "uuid",
            "sku": "CWS-BLK-S",
            "color": {
              "id": "uuid",
              "name": "Black",
              "hexCode": "#000000"
            },
            "size": {
              "id": "uuid",
              "name": "S"
            },
            "inventory": [
              {
                "onHand": 500,
                "reserved": 10,
                "location": {
                  "name": "Main Warehouse"
                }
              }
            ]
          }
        ],
        "images": [
          {
            "imagePath": "/images/product1.jpg",
            "isPrimary": true
          }
        ]
      }
    ],
    "categories": [
      {
        "id": "uuid",
        "name": "Men's Wear",
        "slug": "mens-wear"
      }
    ],
    "collections": [
      {
        "id": "uuid",
        "name": "Spring/Summer 2026"
      }
    ]
  }
}
```

**Notes:**
- No authentication required
- Products are filtered by `active: true`
- Variants include inventory information
- Available stock = onHand - reserved

---

## 4. Cart Endpoints

### 4.1 Get Cart

**Endpoint:** `GET /api/v1/cart`

**Description:** Get customer's cart with live pricing quote.

**Request Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "cart": {
      "id": "uuid",
      "items": [
        {
          "id": "uuid",
          "quantity": 50,
          "variant": {
            "id": "uuid",
            "sku": "CWS-BLK-S",
            "product": {
              "name": "Classic White Shirt",
              "articleNumber": "ART-001",
              "basePrice": 25.00
            },
            "color": {
              "name": "Black"
            },
            "size": {
              "name": "S"
            }
          }
        }
      ]
    },
    "quote": {
      "qualifyingQuantity": 50,
      "appliedTierId": "uuid",
      "appliedTierName": "Tier 1 (30+)",
      "discountPercent": 10,
      "grossSubtotal": 1250.00,
      "discountTotal": 125.00,
      "netSubtotal": 1125.00,
      "lineItems": [
        {
          "variantId": "uuid",
          "quantity": 50,
          "baseUnitPrice": 25.00,
          "lineGross": 1250.00,
          "isEligibleForTier": true,
          "lineDiscount": 125.00,
          "lineNet": 1125.00
        }
      ],
      "nextTierHint": {
        "tierName": "Tier 2 (70+)",
        "minQuantity": 70,
        "additionalQuantityNeeded": 20
      }
    }
  }
}
```

**Response (401):**
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

**Notes:**
- Requires CUSTOMER user type
- Pricing quote is calculated server-side in real-time
- `nextTierHint` suggests upsell opportunity

---

### 4.2 Update Cart Items

**Endpoint:** `POST /api/v1/cart/items`

**Description:** Batch upsert cart items (matrix update).

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "items": [
    {
      "variantId": "uuid",
      "quantity": 50
    },
    {
      "variantId": "uuid",
      "quantity": 30
    },
    {
      "variantId": "uuid",
      "quantity": 0
    }
  ]
}
```

**Validation:**
- `items`: Required, array
- `items[].variantId`: Required, valid UUID
- `items[].quantity`: Required, integer >= 0
- Quantity 0 removes item from cart

**Response (200):**
```json
{
  "success": true,
  "message": "Cart updated successfully"
}
```

**Response (400):**
```json
{
  "success": false,
  "error": "Invalid input"
}
```

**Side Effects:**
- Creates new cart items
- Updates existing cart item quantities
- Removes items with quantity 0

---

## 5. Order Endpoints

### 5.1 List Orders

**Endpoint:** `GET /api/v1/orders`

**Description:** Get orders for current user (customers) or all orders (admin).

**Request Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "uuid",
        "orderNumber": "ORD-20260901-0001",
        "status": "CONFIRMED",
        "grandTotal": 1125.00,
        "currency": "EUR",
        "submittedAt": "2026-09-01T10:30:00Z",
        "customer": {
          "companyName": "Fashion Retail House GmbH"
        },
        "items": [
          {
            "productNameSnapshot": "Classic White Shirt",
            "quantity": 50,
            "lineNet": 1125.00
          }
        ],
        "invoice": {
          "invoiceNumber": "INV-20260901-0001",
          "status": "UNPAID",
          "balanceDue": 1125.00
        }
      }
    ]
  }
}
```

**Notes:**
- Customers see only their own orders
- Admin sees all orders
- Includes customer name, items, and invoice summary

---

### 5.2 Submit Order

**Endpoint:** `POST /api/v1/orders`

**Description:** Submit order from cart.

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "notes": "Please ship by end of week"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "uuid",
      "orderNumber": "ORD-20260901-0001",
      "status": "SUBMITTED",
      "grandTotal": 1125.00
    }
  }
}
```

**Response (400):**
```json
{
  "success": false,
  "error": "Insufficient stock for variant CWS-BLK-S"
}
```

**Business Rules:**
1. Customer must be ACTIVE
2. Cart must not be empty
3. All items must have sufficient stock
4. Order total must not exceed credit limit
5. Pricing is recalculated server-side

**Side Effects:**
- Creates Order and OrderItems
- Reserves inventory
- Clears cart
- Writes audit log

---

### 5.3 Get Order Detail

**Endpoint:** `GET /api/v1/orders/[id]`

**Description:** Get detailed order information.

**Request Headers:**
```
Authorization: Bearer <token>
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Order ID |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "uuid",
      "orderNumber": "ORD-20260901-0001",
      "status": "CONFIRMED",
      "qualifyingQty": 50,
      "tierIdSnapshot": "uuid",
      "discountPercentSnapshot": 10,
      "grossSubtotal": 1250.00,
      "discountTotal": 125.00,
      "netSubtotal": 1125.00,
      "shippingTotal": 0,
      "taxTotal": 0,
      "grandTotal": 1125.00,
      "currency": "EUR",
      "notes": "Please ship by end of week",
      "submittedAt": "2026-09-01T10:30:00Z",
      "createdAt": "2026-09-01T10:30:00Z",
      "customer": {
        "companyName": "Fashion Retail House GmbH"
      },
      "items": [
        {
          "id": "uuid",
          "articleNumberSnapshot": "ART-001",
          "productNameSnapshot": "Classic White Shirt",
          "skuSnapshot": "CWS-BLK-S",
          "colorSnapshot": "Black",
          "sizeSnapshot": "S",
          "baseUnitPriceSnapshot": 25.00,
          "quantity": 50,
          "lineGross": 1250.00,
          "lineDiscount": 125.00,
          "lineNet": 1125.00
        }
      ],
      "invoice": {
        "id": "uuid",
        "invoiceNumber": "INV-20260901-0001",
        "status": "UNPAID",
        "totalAmount": 1125.00,
        "paidAmount": 0,
        "balanceDue": 1125.00,
        "dueDate": "2026-10-01T00:00:00Z"
      }
    }
  }
}
```

**Response (404):**
```json
{
  "success": false,
  "error": "Order not found"
}
```

**Notes:**
- Customers can only access their own orders
- Returns 404 (not 403) for unauthorized access to prevent information leakage

---

## 6. Account Endpoints

### 6.1 Get Account Statement

**Endpoint:** `GET /api/v1/account/statement`

**Description:** Get customer account statement.

**Request Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `customerId` | string | Admin only | Customer ID (admin can query any) |
| `startDate` | string | No | Start date (ISO format) |
| `endDate` | string | No | End date (ISO format) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "statement": {
      "customer": {
        "id": "uuid",
        "companyName": "Fashion Retail House GmbH",
        "creditLimit": 50000
      },
      "transactions": [
        {
          "id": "uuid",
          "transactionType": "INVOICE",
          "referenceType": "Invoice",
          "referenceId": "uuid",
          "debit": 1125.00,
          "credit": 0,
          "runningBalance": 1125.00,
          "postedAt": "2026-09-01T11:00:00Z",
          "notes": "Invoice INV-20260901-0001"
        },
        {
          "id": "uuid",
          "transactionType": "PAYMENT",
          "referenceType": "Payment",
          "referenceId": "uuid",
          "debit": 0,
          "credit": 500.00,
          "runningBalance": 625.00,
          "postedAt": "2026-09-15T14:00:00Z",
          "notes": "Payment PAY-20260915-0001"
        }
      ],
      "currentBalance": 625.00
    }
  }
}
```

**Notes:**
- Customers see only their own statement
- Admin can query any customer via `customerId` parameter
- Transactions are ordered chronologically

---

## 7. Admin Endpoints

### 7.1 Get Pricing Tiers

**Endpoint:** `GET /api/v1/admin/pricing-tiers`

**Description:** List all pricing tiers.

**Request Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "tiers": [
      {
        "id": "uuid",
        "name": "Tier 1 (30+)",
        "minQuantity": 30,
        "discountPercent": 10,
        "active": true,
        "sortOrder": 0
      },
      {
        "id": "uuid",
        "name": "Tier 2 (70+)",
        "minQuantity": 70,
        "discountPercent": 12,
        "active": true,
        "sortOrder": 1
      },
      {
        "id": "uuid",
        "name": "Tier 3 (101+)",
        "minQuantity": 101,
        "discountPercent": 15,
        "active": true,
        "sortOrder": 2
      }
    ]
  }
}
```

**Authorization:** ADMIN only

---

### 7.2 Update Pricing Tiers

**Endpoint:** `PUT /api/v1/admin/pricing-tiers`

**Description:** Batch upsert pricing tiers.

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "tiers": [
    {
      "id": "uuid",
      "name": "Tier 1 (30+)",
      "minQuantity": 30,
      "discountPercent": 10,
      "active": true,
      "sortOrder": 0
    },
    {
      "name": "Tier 4 (150+)",
      "minQuantity": 150,
      "discountPercent": 18,
      "active": true,
      "sortOrder": 3
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Pricing tiers updated successfully"
}
```

**Side Effects:**
- Creates/updates tiers
- Writes audit log with before/after snapshots

**Authorization:** ADMIN only

---

### 7.3 Get Customers

**Endpoint:** `GET /api/v1/admin/customers`

**Description:** List all customer companies.

**Request Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "id": "uuid",
        "companyName": "Fashion Retail House GmbH",
        "taxId": "DE123456789",
        "creditLimit": 50000,
        "status": "ACTIVE",
        "paymentTerms": {
          "name": "Net 30",
          "daysDue": 30
        },
        "users": [
          {
            "id": "uuid",
            "email": "buyer@fashionretail.com",
            "firstName": "Max",
            "lastName": "Mustermann",
            "role": "BUYER"
          }
        ],
        "orders": [
          {
            "id": "uuid",
            "orderNumber": "ORD-20260901-0001",
            "grandTotal": 1125.00
          }
        ]
      }
    ]
  }
}
```

**Authorization:** ADMIN only

---

### 7.4 Create Customer

**Endpoint:** `POST /api/v1/admin/customers`

**Description:** Create new customer company.

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "companyName": "New Fashion Store",
  "taxId": "DE987654321",
  "registrationNumber": "HRB 123456",
  "creditLimit": 25000,
  "paymentTermsId": "uuid",
  "notes": "New customer",
  "user": {
    "email": "contact@newfashion.com",
    "password": "Password123!",
    "firstName": "Anna",
    "lastName": "Schmidt",
    "phone": "+49123456789"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "customer": {
      "id": "uuid",
      "companyName": "New Fashion Store"
    }
  }
}
```

**Side Effects:**
- Creates CustomerCompany
- Creates User
- Creates CustomerUser relationship
- Creates Cart
- Writes audit log

**Authorization:** ADMIN only

---

### 7.5 Get Payments

**Endpoint:** `GET /api/v1/admin/payments`

**Description:** List all payments.

**Request Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": "uuid",
        "paymentNumber": "PAY-20260915-0001",
        "amount": 500.00,
        "paymentDate": "2026-09-15T14:00:00Z",
        "paymentMethod": "BANK_TRANSFER",
        "referenceNumber": "TXN-123456",
        "status": "POSTED",
        "customer": {
          "companyName": "Fashion Retail House GmbH"
        },
        "allocations": [
          {
            "invoiceId": "uuid",
            "amount": 500.00
          }
        ]
      }
    ]
  }
}
```

**Authorization:** ADMIN only

---

### 7.6 Record Payment

**Endpoint:** `POST /api/v1/admin/payments`

**Description:** Record customer payment.

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "customerId": "uuid",
  "amount": 500.00,
  "paymentMethod": "BANK_TRANSFER",
  "referenceNumber": "TXN-123456",
  "paymentDate": "2026-09-15",
  "notes": "Payment for invoice INV-20260901-0001",
  "allocations": [
    {
      "invoiceId": "uuid",
      "amount": 500.00
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "uuid",
      "paymentNumber": "PAY-20260915-0001"
    }
  }
}
```

**Validation:**
- `customerId`: Required, valid UUID
- `amount`: Required, > 0
- `paymentMethod`: Required, valid enum
- `allocations`: Optional, array of {invoiceId, amount}

**Business Rules:**
- Payment amount must be > 0
- Invoice allocations cannot exceed invoice balance
- If no allocations provided, uses FIFO auto-allocation

**Side Effects:**
- Creates Payment record
- Creates PaymentAllocation records
- Updates Invoice paidAmount, balanceDue, status
- Posts CREDIT transaction to ledger
- Writes audit log

**Authorization:** ADMIN only

---

### 7.7 Get Audit Logs

**Endpoint:** `GET /api/v1/admin/audit-logs`

**Description:** Get recent audit log entries.

**Request Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "actorEmail": "admin@starfashion.com",
        "action": "TIER_UPDATED",
        "entityType": "PricingTier",
        "entityId": "uuid",
        "beforeJson": "{\"discountPercent\": 10}",
        "afterJson": "{\"discountPercent\": 12}",
        "ipAddress": "192.168.1.1",
        "createdAt": "2026-09-01T10:00:00Z"
      }
    ]
  }
}
```

**Notes:**
- Returns last 100 entries
- Immutable, append-only

**Authorization:** ADMIN only

---

### 7.8 Update Order Status

**Endpoint:** `PUT /api/v1/admin/orders/[id]/status`

**Description:** Update order status.

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Order ID |

**Request Body:**
```json
{
  "status": "CONFIRMED"
}
```

**Valid Status Transitions:**
| Current Status | Allowed Next Status |
|----------------|---------------------|
| SUBMITTED | CONFIRMED, CANCELLED |
| CONFIRMED | PROCESSING, CANCELLED |
| PROCESSING | PACKED |
| PACKED | SHIPPED |
| SHIPPED | COMPLETED |

**Response (200):**
```json
{
  "success": true,
  "message": "Order status updated successfully"
}
```

**Response (400):**
```json
{
  "success": false,
  "error": "Invalid status transition"
}
```

**Special Behaviors:**
- `CONFIRMED`: Auto-generates Invoice + InvoiceItems, posts DEBIT to ledger
- `CANCELLED`: Releases reserved inventory

**Side Effects:**
- Updates order status
- Creates Invoice (if CONFIRMED)
- Releases inventory (if CANCELLED)
- Writes audit log

**Authorization:** ADMIN only

---

## 8. Error Handling

### 8.1 Error Response Format

```json
{
  "success": false,
  "error": "Error message"
}
```

### 8.2 Common Error Codes

| HTTP Status | Error | Description |
|-------------|-------|-------------|
| 400 | Invalid input | Request validation failed |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not found | Resource not found |
| 500 | Internal server error | Unexpected error |

### 8.3 Validation Errors

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

## 9. Rate Limiting

**Current Status:** Not implemented

**Recommended Limits:**
| Endpoint | Limit | Window |
|----------|-------|--------|
| Login | 5 requests | 1 minute |
| API (general) | 100 requests | 1 minute |
| Order submission | 10 requests | 1 minute |

## 10. Versioning

**Current Version:** v1

**Versioning Strategy:** URL path versioning (`/api/v1/`)

**Future Versions:** `/api/v2/` when breaking changes are introduced

---

**Document Version:** 1.0  
**Last Updated:** September 2026  
**Author:** Architecture Analysis

# Mindbody API Revenue Endpoints Guide

## Overview
This document explains the different Mindbody API v6 endpoints for revenue tracking and their appropriate use cases.

## Current Implementation

### `/sale/transactions` (Currently Used)
**What it returns**: Payment transaction records (credit card processing data)

**Structure**:
```json
{
  "TransactionId": 131288,
  "SaleId": 2148020191,
  "ClientId": 5467,
  "Amount": 129.69,
  "Settled": true,
  "Status": "Approved",
  "TransactionTime": "2025-10-19T01:55:19.823",
  "CardType": "Visa",
  "CCLastFour": "1980"
}
```

**Pros**:
- ✅ Captures actual payment amounts
- ✅ Shows payment method (Visa, Mastercard, etc.)
- ✅ Includes transaction status (Approved, Declined, etc.)
- ✅ Simple structure, easy to import

**Cons**:
- ❌ No line-item details (what was purchased)
- ❌ Doesn't distinguish between memberships, class packs, services
- ❌ Missing product/service descriptions

---

## Recommended Endpoint for Future Enhancement

### `/sale/sales` (Better for Detailed Revenue)
**What it returns**: Actual sales records with purchased items breakdown

**Structure** (based on API documentation):
```json
{
  "SaleId": 12345,
  "SaleDateTime": "2024-01-15T10:30:00Z",
  "ClientId": 5467,
  "PurchasedItems": [
    {
      "Type": "Membership",
      "Id": 789,
      "Name": "Monthly Unlimited Membership",
      "Amount": 129.00,
      "Quantity": 1
    },
    {
      "Type": "Service",
      "Id": 456,
      "Name": "Personal Training Session",
      "Amount": 75.00,
      "Quantity": 2
    }
  ],
  "TotalAmount": 279.00
}
```

**Pros**:
- ✅ Detailed line-item breakdown
- ✅ Distinguishes memberships, services, products, contracts
- ✅ Product/service names and descriptions
- ✅ Quantity and individual pricing
- ✅ Better for business intelligence and reporting

**Cons**:
- ⚠️ More complex to parse
- ⚠️ May need additional API calls to get full details

---

## Complementary Endpoints

### `/client/activeclientmemberships`
Returns active membership details for revenue attribution:
- Membership product IDs
- Membership names
- Start/end dates
- Payment status

### `/client/contracts`
Returns class pack and contract details:
- Contract IDs
- Remaining sessions
- Contract value
- Expiration dates

### `/sale/services`
Returns available services for sale:
- Service IDs and names
- Pricing information
- Membership requirements
- Online availability

---

## Migration Path

### Phase 1 (Current - Completed)
✅ Use `/sale/transactions` with `Amount` field for quick revenue totals

### Phase 2 (Future Enhancement)
Migrate to `/sale/sales` endpoint for detailed revenue tracking:
1. Update `importSalesResumable()` to use `/sale/sales`
2. Parse `PurchasedItems` array for line-item details
3. Store item type (Membership, Service, Product, Contract)
4. Add product/service names to revenue records
5. Track quantities and unit prices

### Phase 3 (Advanced)
Enhance with complementary endpoints:
1. Cross-reference with `/client/activeclientmemberships` for membership revenue
2. Track class pack usage via `/client/contracts`
3. Build revenue attribution by service type
4. Create revenue forecasting based on active memberships

---

## Implementation Notes

### Current Code Location
- File: `server/mindbody.ts`
- Function: `importSalesResumable()`
- Endpoint: `/sale/transactions`
- Field mapping: `transaction.Amount` → `revenue.amount`

### To Switch to `/sale/sales`:
1. Change endpoint from `/sale/transactions` to `/sale/sales`
2. Update response type from `Transactions` to `Sales`
3. Iterate through `PurchasedItems` array instead of transactions
4. Map `item.Type`, `item.Name`, `item.Amount` to revenue fields

---

## Testing & Validation

### Verify Transaction Data
```bash
# Test current endpoint
curl -X GET "https://api.mindbodyonline.com/public/v6/sale/transactions?StartSaleDateTime=2024-01-01" \
  -H "Api-Key: YOUR_KEY" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "SiteId: YOUR_SITE_ID"
```

### Verify Sales Data (Future)
```bash
# Test recommended endpoint
curl -X GET "https://api.mindbodyonline.com/public/v6/sale/sales?StartDate=2024-01-01" \
  -H "Api-Key: YOUR_KEY" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "SiteId: YOUR_SITE_ID"
```

---

## References
- [Mindbody Public API v6 Documentation](https://developers.mindbodyonline.com/PublicDocumentation/V6)
- [API Swagger Docs](https://api.mindbodyonline.com/public/v6/swagger/index)
- [GitHub: Type-safe Mindbody API Library](https://github.com/SplitPass/mindbody-api)

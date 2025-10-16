# Mindbody Webhooks & API Management Guide

## Table of Contents
1. [Webhook Integration](#webhook-integration)
2. [Multi-Day Import Scheduling](#multi-day-import-scheduling)
3. [API Tier Upgrade Guide](#api-tier-upgrade-guide)

---

## 1. Webhook Integration

### Overview
Webhooks provide real-time synchronization of Mindbody data without consuming API call limits. After completing an initial bulk import, webhooks keep your data current automatically.

### How It Works
- Mindbody sends instant notifications when visits are created or updated
- Your platform receives the webhook, validates the signature, and updates the database
- No API calls needed for ongoing synchronization
- Eliminates the need for repeated bulk imports

### Available Webhook Events
- `classVisit.created` - Triggered when a new class visit/booking is created
- `classVisit.updated` - Triggered when a class visit is modified

### Setup Instructions

#### Step 1: Create a Webhook Subscription
```bash
POST /api/webhooks/subscriptions
Content-Type: application/json

{
  "eventType": "classVisit.created"
}
```

**Response:**
```json
{
  "id": "uuid",
  "organizationId": "uuid",
  "eventType": "classVisit.created",
  "webhookUrl": "https://your-app.replit.app/api/webhooks/mindbody",
  "status": "active",
  "mindbodySubscriptionId": "mindbody-sub-id",
  "eventSchemaVersion": 1
}
```

#### Step 2: Monitor Webhook Activity
```bash
GET /api/webhooks/subscriptions
```

Lists all active webhook subscriptions for your organization.

#### Step 3: Delete a Subscription (Optional)
```bash
DELETE /api/webhooks/subscriptions/:id
```

Removes the subscription from both Mindbody and your database.

### Security
- **HMAC-SHA256 Signature Verification**: All incoming webhooks are verified using HMAC-SHA256
- **Deduplication**: Messages are tracked by `messageId` to prevent duplicate processing
- **Idempotent Processing**: Safe to receive the same event multiple times

### Webhook Processing Flow
1. Mindbody sends POST request to `/api/webhooks/mindbody`
2. Platform verifies signature using stored `messageSignatureKey`
3. Event is stored in database with `processed: false`
4. Immediate 200 OK response (< 10 seconds)
5. Asynchronous processing:
   - Find student by `mindbodyClientId`
   - Find class schedule by `mindbodyScheduleId`
   - Create attendance record
   - Mark event as processed

### Best Practices
1. **Initial Import First**: Complete bulk import before enabling webhooks
2. **Monitor Failed Events**: Check webhook_events table for processing errors
3. **Handle Retries**: Mindbody retries failed webhooks every 15 minutes for 3 hours
4. **Test in Sandbox**: Use Mindbody sandbox environment during development

### Troubleshooting

**Problem: Webhooks not being received**
- Verify your webhook URL is publicly accessible (HTTPS required)
- Check that subscription is in 'active' status
- Ensure HEAD endpoint returns 200 OK

**Problem: Signature verification fails**
- Verify `messageSignatureKey` is stored correctly
- Check that raw request body is used for verification
- Ensure body parser doesn't modify the request body

**Problem: Events not processing**
- Check that students and classes are imported first
- Verify `mindbodyClientId` and `mindbodyScheduleId` match
- Review webhook_events table for error messages

---

## 2. Multi-Day Import Scheduling

### The Challenge
With 18,000+ visit records and a 1,000 API call/day limit on the free tier, a complete import takes multiple days.

### Current Platform Features

#### API Call Tracking
The platform tracks your API usage in real-time:
- **Current Count**: Shows total API calls made today
- **Rate Calculation**: Displays calls per hour
- **Time to Limit**: Estimates when you'll hit the 1,000 call limit

#### Pause & Resume Capability
- **Automatic Checkpointing**: Import progress saved after each batch
- **Resume Support**: Continue exactly where you left off
- **Session Resilience**: Survives page reloads and disconnections
- **Clean Cancellation**: Proper cleanup with terminal 'cancelled' status

### Strategic Import Planning

#### Option 1: Chunked Daily Imports
**Best for**: Organizations with 1,000-5,000 clients

```
Day 1: Import 900 clients (leave 100 calls for buffer)
Day 2: Import next 900 clients
Day 3: Import remaining clients
```

**Steps:**
1. Start import with all data types selected
2. Monitor API call counter
3. When approaching ~900 calls, click "Pause Import"
4. Next day, click "Resume Import" to continue

#### Option 2: Data Type Segmentation
**Best for**: Selective data needs

```
Day 1: Import Clients only (~500-800 calls)
Day 2: Import Classes (~100-200 calls)
Day 3: Import Visits (~1000+ calls, may take multiple days)
Day 4+: Continue Visits import
Day N: Import Sales
```

**Steps:**
1. Start import with only "Clients" selected
2. Wait for completion
3. Next day, start new import with only "Classes" selected
4. Continue pattern for Visits and Sales

#### Option 3: Date Range Splitting
**Best for**: Historical data imports

```
Day 1: Jan 1 - Mar 31 (Q1)
Day 2: Apr 1 - Jun 30 (Q2)
Day 3: Jul 1 - Sep 30 (Q3)
Day 4: Oct 1 - Dec 31 (Q4)
```

**Steps:**
1. Set start date: Jan 1, end date: Mar 31
2. Start import
3. Monitor and pause if needed
4. Next period: Set new date range and repeat

### Import Progress Indicators

The platform shows:
- ✅ **Progress Percentage**: Overall completion
- ✅ **Records Imported**: Count per data type
- ✅ **API Calls Used**: Real-time counter
- ✅ **Current Phase**: Which data type is processing
- ✅ **Time Estimate**: Based on current rate

### Optimization Tips

1. **Import During Off-Peak Hours**: Start imports late in your day to maximize the 24-hour window
2. **Use Webhooks for Ongoing Sync**: After initial import, webhooks eliminate need for repeated imports
3. **Monitor Rate Carefully**: The platform shows API call rate - use it to schedule pauses
4. **Plan for Visits Last**: Visits consume the most API calls (one per client)
5. **Keep Buffer**: Don't use all 1,000 calls - leave 50-100 for testing/manual operations

### Example: 18,000 Visits Across 1,000 Clients

**Scenario**: 1,000 clients, each with ~18 visit records

**API Call Math**:
- Clients import: ~5-10 calls (pagination)
- Classes import: ~5-10 calls (pagination)
- Visits import: ~1,000 calls (one per client)
- Sales import: ~1,000 calls (one per client)

**5-Day Strategy**:
```
Day 1: Import Clients + Classes (~20 calls)
Day 2: Start Visits import, pause at 900 calls (~900 clients processed)
Day 3: Resume Visits import, complete remaining 100 clients
Day 4: Import Sales, pause at 900 calls if needed
Day 5: Resume Sales import to completion
Day 6+: Enable webhooks for real-time sync
```

### After Import Completion
1. **Enable Webhooks**: Set up `classVisit.created` subscription
2. **Disable Scheduled Imports**: Webhooks keep data current
3. **Periodic Full Sync**: Run quarterly full sync to catch any missed events

---

## 3. API Tier Upgrade Guide

### Why Upgrade?
The Mindbody free tier (1,000 calls/day) is sufficient for:
- ✅ Small studios (<500 clients)
- ✅ Monthly syncs
- ✅ Webhook-based ongoing sync

You should upgrade if:
- ❌ You have 1,000+ clients
- ❌ You need same-day bulk imports
- ❌ You run frequent reports requiring live data
- ❌ You integrate multiple Mindbody locations

### Mindbody API Tiers

#### Free Tier
- **Cost**: $0/month
- **Daily Limit**: 1,000 API calls
- **Rate Limit**: Standard
- **Support**: Community only
- **Best For**: Small studios, testing, development

#### Standard Tier
- **Cost**: Contact Mindbody sales
- **Daily Limit**: ~10,000 API calls
- **Rate Limit**: Higher concurrency
- **Support**: Email support
- **Best For**: Medium studios (500-2,000 clients)

#### Premium Tier
- **Cost**: Contact Mindbody sales
- **Daily Limit**: 50,000+ (custom)
- **Rate Limit**: Enterprise-grade
- **Support**: Priority support + dedicated account manager
- **Best For**: Large studios, franchises, multi-location businesses

#### Enterprise Tier
- **Cost**: Custom pricing
- **Daily Limit**: Unlimited
- **Rate Limit**: Custom SLA
- **Support**: 24/7 support + custom integration assistance
- **Best For**: Large-scale integrations, resellers, platforms

### How to Upgrade

#### Step 1: Contact Mindbody
- **Email**: api@mindbodyonline.com
- **Portal**: https://developers.mindbodyonline.com/
- **Sales**: Request quote via developer portal

#### Step 2: Provide Business Case
Include in your request:
- Current API usage (show 1,000/day limit issue)
- Number of clients/locations
- Expected growth
- Use case description
- Integration requirements

#### Step 3: Review Pricing
Mindbody will provide:
- Monthly/annual pricing options
- Call volume limits
- Service level agreements
- Contract terms

#### Step 4: Upgrade Process
1. Sign updated API agreement
2. Receive new API keys (may be same key with higher limits)
3. Update limits in Mindbody developer portal
4. Test increased limits
5. No code changes needed in this platform

### Cost-Benefit Analysis

#### Example: 2,000 Client Studio

**Without Upgrade** (Free Tier):
- 8-10 days for full import
- Manual pause/resume management
- Risk of missing real-time bookings during import
- Staff time: ~30 min/day monitoring

**With Standard Tier Upgrade** ($X/month):
- Same-day full import
- Automated scheduled imports
- Real-time data confidence
- Staff time: ~5 min/month monitoring
- ROI: Improved decision-making + time savings

### Alternative Solutions

If upgrading isn't feasible:

1. **Webhook-Only Approach**:
   - Do one-time bulk import over multiple days
   - Enable webhooks for all future updates
   - Only re-import if webhook issues occur

2. **Selective Data Strategy**:
   - Only import recent data (last 90 days)
   - Archive older data separately
   - Reduces API calls significantly

3. **Multi-Location Accounts**:
   - Each location gets separate 1,000 call limit
   - Import locations sequentially
   - Coordinate across accounts

4. **Partner with Mindbody Certified Consultant**:
   - May have access to higher tier APIs
   - Can provide white-label integration
   - Costs may be competitive with direct upgrade

### Upgrade Checklist

Before upgrading:
- [ ] Document current API usage patterns
- [ ] Calculate required daily call volume
- [ ] Estimate annual call volume growth
- [ ] Review budget for API costs
- [ ] Understand contract terms (monthly vs annual)
- [ ] Verify no code changes needed
- [ ] Plan testing period for new limits
- [ ] Update documentation with new limits

After upgrading:
- [ ] Test API with higher limits
- [ ] Update platform monitoring (adjust limit from 1,000 to new limit)
- [ ] Configure automated imports if needed
- [ ] Train staff on new capabilities
- [ ] Monitor costs vs value monthly

### Support Resources

**Mindbody Developer Portal**: https://developers.mindbodyonline.com/
- API documentation
- Rate limit information
- Support tickets
- Community forum

**Mindbody API Support**: api@mindbodyonline.com
- Technical questions
- Tier upgrade inquiries
- Integration assistance

**This Platform Support**:
- Webhook configuration help
- Import optimization strategies
- API usage monitoring

---

## Quick Reference

### Webhook Commands
```bash
# Create subscription
POST /api/webhooks/subscriptions
{ "eventType": "classVisit.created" }

# List subscriptions
GET /api/webhooks/subscriptions

# Delete subscription
DELETE /api/webhooks/subscriptions/:id
```

### Import Strategy Decision Tree
```
Do you have < 500 clients?
  YES → Use free tier + webhooks
  NO → Continue

Do you need same-day imports?
  YES → Upgrade to Standard tier
  NO → Continue

Can you spread import over 3-5 days?
  YES → Use free tier + pause/resume
  NO → Upgrade to Standard tier

Is this a one-time import?
  YES → Use free tier + multi-day strategy
  NO → Consider webhook-based sync
```

### API Tier Selection
```
< 500 clients → Free tier
500-2,000 clients → Standard tier
2,000-10,000 clients → Premium tier
10,000+ clients → Enterprise tier
Multiple locations → Premium/Enterprise tier
```

---

## Next Steps

1. **Complete Initial Import**:
   - Use multi-day strategy if needed
   - Monitor API usage carefully
   - Plan pause points in advance

2. **Enable Webhooks**:
   - Create `classVisit.created` subscription
   - Test with a real booking
   - Monitor webhook_events table

3. **Evaluate API Needs**:
   - Track actual usage for 30 days
   - Calculate required tier
   - Contact Mindbody if upgrade needed

4. **Optimize Workflow**:
   - Set up automated reporting
   - Configure alerts for failed webhooks
   - Schedule periodic full syncs

---

## Frequently Asked Questions

**Q: Do webhooks count against API limits?**
A: No, incoming webhooks do not consume API calls.

**Q: Can I use webhooks without bulk import?**
A: No, webhooks only send updates. You need initial data import first.

**Q: What happens if a webhook fails?**
A: Mindbody retries every 15 minutes for 3 hours. Check webhook_events table for errors.

**Q: How long does a tier upgrade take?**
A: Typically 3-5 business days after contract signing.

**Q: Can I downgrade API tiers?**
A: Yes, but usually only at contract renewal period.

**Q: Are there usage-based pricing options?**
A: Some tiers offer usage-based pricing. Contact Mindbody sales.

**Q: Will webhook subscriptions survive API tier changes?**
A: Yes, existing webhooks continue working after tier upgrades.

**Q: How do I test webhooks in development?**
A: Use Mindbody sandbox environment with test site ID.

---

*Last Updated: October 2025*

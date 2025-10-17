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

## 2. Multi-Session Import Scheduling

### The Challenge
With 18,000+ visit records and a 5,000 API call/month free tier, large imports may exceed the free tier limit.

### Current Platform Features

#### API Call Tracking
The platform tracks your API usage in real-time:
- **Current Count**: Shows total API calls made this month
- **Rate Calculation**: Displays calls per hour
- **Time to Limit**: Estimates when you'll hit the 5,000 free tier limit

#### Pause & Resume Capability
- **Automatic Checkpointing**: Import progress saved after each batch
- **Resume Support**: Continue exactly where you left off
- **Session Resilience**: Survives page reloads and disconnections
- **Clean Cancellation**: Proper cleanup with terminal 'cancelled' status
- **No Wait Time**: Resume immediately - no 24-hour restrictions

### Strategic Import Planning

#### Option 1: Single Session Import (Within Free Tier)
**Best for**: Organizations with up to 5,000 clients

```
Session 1: Import all data (Students, Classes, Visits, Sales)
Monitor: Pause at ~4,500 calls to stay in free tier
Resume: Continue immediately if needed
```

**Steps:**
1. Start import with all data types selected
2. Monitor API call counter
3. When approaching ~4,500 calls, click "Pause Import" (to avoid paid charges)
4. Resume immediately or continue into paid tier ($0.002/call after 5,000)

#### Option 2: Data Type Segmentation
**Best for**: Selective data needs or budget control

```
Session 1: Import Clients only (~500-800 calls)
Session 2: Import Classes (~100-200 calls)
Session 3: Import Visits (~1000+ calls, pause at free tier limit if desired)
Session 4+: Continue Visits import
Session N: Import Sales
```

**Steps:**
1. Start import with only "Clients" selected
2. Wait for completion
3. Start new import with only "Classes" selected
4. Continue pattern for Visits and Sales
5. Resume immediately if you pause - no waiting required

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

1. **No Wait Time**: Resume imports immediately - no 24-hour restrictions
2. **Use Webhooks for Ongoing Sync**: After initial import, webhooks eliminate need for repeated imports
3. **Monitor Rate Carefully**: The platform shows API call rate - use it to decide when to pause
4. **Plan for Visits Last**: Visits consume the most API calls (one per client)
5. **Budget Wisely**: Pause at ~4,500 calls to stay in free tier, or accept affordable paid rate ($2 per 1,000 calls)

### Example: 18,000 Visits Across 5,000 Clients

**Scenario**: 5,000 clients, each with ~3-4 visit records

**API Call Math**:
- Clients import: ~5-10 calls (pagination)
- Classes import: ~5-10 calls (pagination)
- Visits import: ~5,000 calls (one per client)
- Sales import: ~5,000 calls (one per client)

**Strategic Approach**:
```
Session 1: Import Clients + Classes (~20 calls)
Session 2: Start Visits import, pause at ~4,500 calls to stay in free tier
Session 3: Resume Visits (enter paid tier at $0.002/call - only $1 for 500 more calls)
Session 4: Import Sales (paid tier - $10 for 5,000 calls)
Final: Enable webhooks for ongoing real-time sync
Total Cost: ~$11 for complete 10,000+ call import - very affordable!
```

### After Import Completion
1. **Enable Webhooks**: Set up `classVisit.created` subscription
2. **Disable Scheduled Imports**: Webhooks keep data current
3. **Periodic Full Sync**: Run quarterly full sync to catch any missed events

---

## 3. API Tier & Pricing Guide

### Understanding Mindbody API Pricing
The Mindbody API uses a simple, affordable pay-as-you-go model:

#### Free Tier
- **Cost**: $0/month
- **Monthly Limit**: 5,000 API calls FREE
- **Rate Limit**: Standard
- **Support**: Community only
- **Best For**: Small to medium studios, testing, development

#### Pay-As-You-Go (After Free Tier)
- **Cost**: $0.002 per API call after 5,000 calls
- **Pricing**: $2 per 1,000 calls - very affordable!
- **No Monthly Fee**: Only pay for what you use
- **Example Costs**:
  - 10,000 calls = $10 ($0 for first 5,000 + $10 for next 5,000)
  - 20,000 calls = $30 ($0 for first 5,000 + $30 for next 15,000)
  - 50,000 calls = $90 ($0 for first 5,000 + $90 for next 45,000)

### When is the Paid Tier Worth It?

The free tier (5,000 calls/month) is sufficient for:
- ✅ Studios with up to 5,000 clients
- ✅ Initial bulk import + webhook-based ongoing sync
- ✅ Quarterly full re-syncs

The paid tier makes sense when:
- ✅ You have 5,000+ clients (only $2 per 1,000 calls!)
- ✅ You need complete historical data import
- ✅ You run frequent bulk reports
- ✅ You integrate multiple Mindbody locations
- ✅ **Cost is minimal**: Even 50,000 calls costs only $90

### Why Paid Tier is Affordable

Unlike traditional API pricing that charges hundreds per month:
- **No base fee**: $0 if you stay under 5,000 calls
- **Pay only what you use**: $0.002/call is industry-leading low price
- **No commitment**: No contracts or minimum spend
- **Transparent**: Simple per-call pricing, no hidden fees

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

## AI Workflow Commands

Press **Cmd+K** (or **Ctrl+K**) to access the command palette with AI-powered workflow shortcuts:

### Import & API Optimization
- **`/diagnose`**: Investigate webhook or import issues systematically
- **`/anal performance`**: Analyze API usage patterns and optimization opportunities
- **`/deep`**: Comprehensive diagnosis for complex multi-day import problems

### Planning & Strategy
- **`/suggest`**: Get detailed solution proposals for import strategies
- **`/ask`**: Request confirmation before implementing API tier changes

### Monitoring & Debugging
- **`/bug`**: Document webhook failures or import issues
- **`/mobile`**: Optimize mobile experience for on-the-go import monitoring

For complete command reference and usage examples, see [slashcommands.md](./slashcommands.md).

---

*Last Updated: October 2025*

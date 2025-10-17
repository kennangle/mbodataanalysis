# Mindbody Data Import Guide

## Quick Start: Import Order

**⚠️ CRITICAL: Always follow this sequence for successful imports**

```
1. Students (Clients) FIRST
   ↓
2. Classes (Schedules) SECOND  
   ↓
3. Visits (Attendance) THIRD
   ↓
4. Sales (Revenue) FOURTH
```

---

## Why Import Order Matters

### The Dependency Chain

Each data type depends on the previous one existing in your database:

1. **Students (Clients)**: Foundation - everything else references students
2. **Classes (Schedules)**: References nothing, but needed for visits
3. **Visits (Attendance)**: Requires both Students AND Classes to match
4. **Sales (Revenue)**: Requires Students to assign purchases

### What Happens If You Skip Steps

❌ **Import Visits before Classes**:
- Result: 0 records imported
- Reason: Visit ClassIds can't match non-existent class schedules
- Solution: Import classes for the same date range first

❌ **Import Visits before Students**:  
- Result: 0 records imported
- Reason: Visits need student records to link to
- Solution: Import students first

❌ **Import Sales before Students**:
- Result: 0 records imported  
- Reason: Sales need student records to assign to
- Solution: Import students first

---

## Step-by-Step Import Process

### Step 1: Import Students (Clients)

**Purpose**: Create the foundation - all other data references students

**What to Configure**:
- Start Date: January 1 of earliest year you need
- End Date: Today's date
- Select: ☑️ **Students only**

**What Gets Imported**:
- Student profiles (name, email, phone, status)
- Membership information
- Mindbody Client IDs (used for future lookups)

**API Calls**: ~5-20 calls (depends on total students, uses pagination)

**Expected Time**: 30 seconds - 2 minutes

**Success Indicator**: 
```
✅ Students imported: 1,234
```

---

### Step 2: Import Classes (Schedules)

**Purpose**: Create class schedule records that visits will reference

**What to Configure**:
- Start Date: Beginning of period you need (e.g., Jan 1, 2025)
- End Date: End of period you need (e.g., Dec 31, 2025)
- Select: ☑️ **Classes only**

**What Gets Imported**:
- Class schedules (times, locations, instructors)
- Mindbody Class/Schedule IDs (used to match visits)

**Important**: 
- ⚠️ The date range for classes MUST match or exceed your visits date range
- Example: To import September visits, you need September classes first

**API Calls**: ~5-30 calls (depends on class variety and date range)

**Expected Time**: 1-5 minutes

**Success Indicator**:
```
✅ Classes imported: 450
```

---

### Step 3: Import Visits (Attendance)

**Purpose**: Create attendance records showing who attended which classes

**Prerequisites**:
- ✅ Students imported for the same date range
- ✅ Classes imported for the same date range

**What to Configure**:
- Start Date: Beginning of attendance period (e.g., Sep 1, 2025)
- End Date: End of attendance period (e.g., Oct 1, 2025)
- Select: ☑️ **Visits only**

**What Gets Imported**:
- Attendance records (student + class + date/time)
- Attendance status (attended, no-show, late cancel)

**How It Works**:
1. System loads all students (~6,000 clients)
2. For each student, checks if they have visits in date range
3. Matches visit ClassId to imported class schedules
4. Creates attendance record linking student → schedule

**API Calls**: 
- ⚠️ **1 API call per student** (most expensive operation)
- 1,000 students = 1,000 API calls
- May take multiple days on free tier (1,000 calls/day limit)

**Expected Time**: 
- 100 students: 5-10 minutes
- 1,000 students: 45-90 minutes  
- 6,000 students: 4-6 hours (if API limit allows)

**Success Indicator**:
```
✅ Visits imported: 847 (from 1,000 students checked)
```

**Why Lower Numbers Are Normal**:
- System checks ALL students but only creates records for those with visits
- If 1,000 students were checked but only 200 attended classes, you'll see 200 visits

---

### Step 4: Import Sales (Revenue)

**Purpose**: Import purchase and payment data

**Prerequisites**:
- ✅ Students imported for the same date range

**What to Configure**:
- Start Date: Beginning of sales period
- End Date: End of sales period  
- Select: ☑️ **Sales only**

**What Gets Imported**:
- Purchase transactions
- Payment amounts
- Product/service descriptions
- Transaction dates

**API Calls**: 
- **1 API call per student** (same as visits)
- 1,000 students = 1,000 API calls

**Expected Time**: Similar to visits import

**Success Indicator**:
```
✅ Sales imported: 543
```

---

## Complete Import Example

### Scenario: Import Full Year 2025

**Goal**: Import all data for 2025 for a studio with 1,200 students

#### Day 1: Foundation Import
```
□ Start Import
  - Start Date: January 1, 2024
  - End Date: December 31, 2025
  - Select: ☑️ Students only
  
✅ Result: 1,200 students imported (~10 API calls)
```

#### Day 1 (continued): Classes Import
```
□ Start Import  
  - Start Date: January 1, 2025
  - End Date: December 31, 2025
  - Select: ☑️ Classes only
  
✅ Result: 850 class schedules imported (~20 API calls)
```

#### Day 2-3: Visits Import (Multi-Day)
```
□ Day 2: Start Import
  - Start Date: January 1, 2025
  - End Date: December 31, 2025
  - Select: ☑️ Visits only
  - Monitor API counter
  - Pause at ~900 calls (processed ~900 students)
  
✅ Partial Result: 450 visits imported, 900 students checked

□ Day 3: Resume Import
  - Click "Resume Import" button
  - Continues from student #901
  - Completes remaining 300 students
  
✅ Final Result: 680 visits imported total, 1,200 students checked
```

#### Day 4-5: Sales Import
```
□ Day 4: Start Import
  - Start Date: January 1, 2025  
  - End Date: December 31, 2025
  - Select: ☑️ Sales only
  - Pause at ~900 calls
  
□ Day 5: Resume Import
  - Complete remaining students
  
✅ Result: 1,543 sales imported
```

#### Day 6: Enable Webhooks
```
□ Go to Dashboard → Real-Time Sync
□ Toggle "Enable Real-Time Sync"
□ Webhooks now handle all future updates
□ No more manual imports needed!
```

---

## Common Mistakes & Solutions

### ❌ Mistake 1: Wrong Year in Date Range

**Problem**: 
- Imported 2024 classes
- Trying to import 2025 visits  
- Result: 0 visits imported

**Solution**:
1. Import 2025 classes FIRST
2. Then import 2025 visits

**How to Check**:
```sql
-- Check which years you have classes for
SELECT DATE_PART('year', start_time) as year, COUNT(*) 
FROM class_schedules 
GROUP BY year;
```

---

### ❌ Mistake 2: Skipping Students Import

**Problem**:
- Imported classes and visits
- Result: 0 visits imported (no students to link to)

**Solution**:
1. Import students first
2. Then import classes
3. Then import visits

---

### ❌ Mistake 3: Date Range Mismatch

**Problem**:
- Students: Jan-Dec 2025
- Classes: Sep-Oct 2025 only
- Visits: Jan-Dec 2025
- Result: Only Sep-Oct visits imported

**Solution**: 
- Classes date range must match or exceed visits date range
- If importing full year visits, import full year classes

---

### ❌ Mistake 4: Expecting All Students to Have Visits

**Problem**:
- 6,842 students in system
- Only 300 visits imported
- "Where are my visits?"

**Reality**:
- The system checks ALL students (6,842)
- But only students who attended create visit records
- If only 300 students attended classes → 300 visits is correct

**How to Verify**:
- Import progress shows "6,842 total" (students to check)
- Import result shows "300 imported" (actual visits found)
- Both numbers are correct!

---

## Import Progress Explained

### Understanding the Numbers

When importing visits, you'll see:

```
Progress: 400 / 6,842 (5.8%)
Visits imported: 0
```

**What this means**:
- **400 / 6,842**: Checked 400 students out of 6,842 total
- **Visits imported: 0**: None of those 400 students had visits in your date range

Later:
```
Progress: 1,250 / 6,842 (18.2%)
Visits imported: 87
```

**What changed**:
- **1,250 / 6,842**: Now checked 1,250 students
- **Visits imported: 87**: Found 87 students who had visits

### API Call Counter

```
API Calls: 456 / 1,000 (45.6 calls/hour)
Estimated time to limit: 11.9 hours
```

**What this tells you**:
- **456 calls made** today (out of 1,000 daily limit)
- **45.6 calls/hour**: Current rate  
- **11.9 hours**: Time until you hit 1,000 limit at current rate

**Strategy**: When you see "950 / 1,000", pause the import and resume tomorrow.

---

## Pause & Resume Strategy

### When to Pause

1. **API Limit Approaching**: ~900-950 calls used
2. **End of Work Day**: Pause before leaving
3. **Need to Test**: Pause to check imported data
4. **Multi-Day Planning**: Spread import across several days

### How to Pause

1. Watch the API counter during import
2. When approaching limit, click "Pause Import"
3. Import saves current position automatically
4. Safe to close browser/tab

### How to Resume

1. Next day (or when ready), go to Dashboard
2. You'll see "Resume Import" button
3. Click to continue exactly where you left off
4. Progress, API count, and position all preserved

### Resume Safety

✅ **No duplicates**: System tracks what's already imported  
✅ **Exact position**: Resumes at the right student/offset  
✅ **API count preserved**: Yesterday's calls don't count toward today's limit  
✅ **Session resilient**: Survives page reloads and browser restarts  

---

## Troubleshooting Guide

### Problem: "0 records imported" for Visits

**Diagnostic Steps**:

1. **Check if classes are imported**:
   - Go to Classes page
   - Look for classes in your target date range
   - If empty → Import classes first

2. **Check date range match**:
   - Classes date range must include visits date range
   - Example: Can't import 2025 visits if you only have 2024 classes

3. **Check students are imported**:
   - Go to Students page
   - Verify students exist
   - If empty → Import students first

4. **Check logs** (for developers):
   ```
   Look for: "Unmatched ClassIds"
   This shows which class IDs from visits don't match your schedules
   ```

---

### Problem: Import Stuck at Same Percentage

**Possible Causes**:

1. **API returned no data for many students**:
   - Normal if students didn't attend in your date range
   - System still checks each student (shows progress)
   - But no records to import

2. **Network issue**:
   - Check browser console for errors
   - Refresh page - progress is saved
   - Click Resume if needed

3. **Mindbody API rate limiting**:
   - System auto-delays between batches
   - This is normal - just slower progress

---

### Problem: Different Numbers Than Expected

**Understanding the Numbers**:

```
Expected: 1,000 visits
Got: 300 visits
```

**Likely Reasons**:
1. ✅ Correct - only 300 students attended in date range
2. ⚠️ Date range too narrow - expand dates
3. ⚠️ Classes missing for some dates - import more classes
4. ⚠️ Wrong year - check class year vs visit year

**How to Verify**:
- Log into Mindbody directly
- Run a report for same date range
- Compare numbers

---

## Quick Reference Card

### First Time Setup (Recommended Order)

```
□ Step 1: Import Students (All Time)
   Date: Jan 2020 - Today
   Types: ☑️ Students
   
□ Step 2: Import Classes (Desired Period)  
   Date: Jan 2025 - Dec 2025
   Types: ☑️ Classes
   
□ Step 3: Import Visits (Same Period)
   Date: Jan 2025 - Dec 2025  
   Types: ☑️ Visits
   (May require multiple days)
   
□ Step 4: Import Sales (Same Period)
   Date: Jan 2025 - Dec 2025
   Types: ☑️ Sales
   (May require multiple days)
   
□ Step 5: Enable Webhooks
   Dashboard → Real-Time Sync → Toggle ON
```

### Daily Import Strategy (Free Tier)

```
Day 1: Students + Classes (~50 calls total)
Day 2: Visits (pause at 900 calls)
Day 3: Visits (resume, pause at 900 if needed)
Day 4+: Continue Visits until complete
Day N: Sales (same multi-day pattern)
Final: Enable Webhooks
```

### Minimum Viable Import (MVF - Minimum Viable Fitness Data)

Just need to see if it works?

```
□ Import Students: Last 30 days
□ Import Classes: Last 30 days  
□ Import Visits: Last 30 days
□ Check Dashboard - see real data!
□ Then expand date ranges as needed
```

---

## After Import: Webhook Setup

Once initial import is complete:

### Step 1: Verify Data
- Check Dashboard for populated charts
- Review Students page for imported data
- Confirm date ranges look correct

### Step 2: Enable Real-Time Sync
- Go to Dashboard
- Scroll to "Real-Time Sync" section
- Toggle switch to enable
- System creates Mindbody webhook subscription

### Step 3: Test
- Book a test class in Mindbody
- Within 1 minute, check Dashboard
- New attendance should appear automatically

### Step 4: Ongoing Maintenance
- ✅ Webhooks handle all new visits automatically
- ✅ No more daily imports needed
- ✅ Data stays current in real-time
- ⚠️ Run full re-import quarterly to catch any missed events

---

## API Call Budgeting

### Free Tier (1,000 calls/day)

**Budget Allocation**:
- Students import: 10-20 calls
- Classes import: 20-50 calls  
- **Visits import: 1 call per student** ⚠️ (biggest cost)
- Sales import: 1 call per student ⚠️
- Buffer/testing: 50-100 calls

**Multi-Day Planning**:
```
1,000 students × 1 call = 1,000 calls just for visits
Strategy: 900 students per day = 2 days for visits
```

### Optimization Tips

1. **Import students + classes on Day 1** (~50 calls total)
2. **Use remaining 950 calls for visits** (950 students)
3. **Day 2: Resume visits** (remaining students)
4. **Enable webhooks** to avoid future bulk imports

---

## Best Practices Checklist

### Before Starting Import

- [ ] Understand your studio size (# of students)
- [ ] Decide on date range needed
- [ ] Calculate API calls required
- [ ] Plan multi-day strategy if needed
- [ ] Clear any previous failed imports

### During Import

- [ ] Follow the sequence: Students → Classes → Visits → Sales
- [ ] Monitor API call counter
- [ ] Pause before hitting 1,000 calls
- [ ] Verify data appears in each step before moving to next

### After Import

- [ ] Review Dashboard for data accuracy
- [ ] Check Students page for correct records
- [ ] Enable webhooks for real-time sync
- [ ] Document your date ranges for future reference
- [ ] Schedule quarterly full re-sync

---

## Support & Resources

### In-App Resources
- **Dashboard**: Real-time import status and API usage
- **Students Page**: Verify imported client data
- **Classes Page**: Check imported schedules
- **Import Modal**: Configure and start imports

### Documentation
- **This Guide**: Import sequence and troubleshooting
- **WEBHOOKS_AND_API_GUIDE.md**: Multi-day strategies and webhook setup
- **replit.md**: Technical architecture and system details

### Getting Help

**Data Not Importing?**
1. Check this guide's troubleshooting section
2. Verify import sequence was followed
3. Check browser console for errors
4. Review import logs for specific errors

**API Limit Issues?**
1. See WEBHOOKS_AND_API_GUIDE.md for multi-day strategies
2. Consider Mindbody API tier upgrade
3. Use webhooks to reduce ongoing API usage

**Technical Issues?**
1. Check replit.md for system architecture
2. Review database schema in shared/schema.ts
3. Examine server/mindbody.ts for import logic

---

*Last Updated: October 2025*
*Version: 1.0*

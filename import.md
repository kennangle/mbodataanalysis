# Mindbody Data Import Guide

## Import Order (Critical!)

Data must be imported in this specific order due to database dependencies:

```
1. Students  →  2. Classes  →  3. Visits  →  4. Sales
```

**Why this order matters:**

- **Visits** require existing Class Schedules (created during Classes import)
- **Sales** require existing Students
- Importing out of order will result in 0 records imported

---

## Step-by-Step Import Instructions

### Step 1: Import Students

**When:** First time only (or to add new students)

1. Go to **Import** page
2. Set date range: Start Date → End Date
3. Check: **☑ Students**
4. Click: **Start Import**
5. Wait for completion

**Result:** Student roster populated in database

---

### Step 2: Import Classes

**When:** After Students are imported

1. Go to **Import** page
2. Set date range: **Same dates as your data range** (e.g., Jan 1, 2025 → Oct 17, 2025)
3. Check: **☑ Classes**
4. Click: **Start Import**
5. Wait for completion

**Result:**

- Class definitions created
- Class schedules created (these are needed for Visits)

---

### Step 3: Import Visits (Attendance)

**When:** After Classes are imported for the same date range

1. Go to **Import** page
2. Set date range: **Same dates as Classes** (e.g., Jan 1, 2025 → Oct 17, 2025)
3. Check: **☑ Visits**
4. Click: **Start Import**
5. Wait for completion

**Result:** Attendance records created (stored in `attendance` table)

**Important:** If you import Visits for dates that don't have matching Class Schedules, all visits will be skipped and 0 attendance records will be created.

---

### Step 4: Import Sales (Revenue)

**When:** After Students and Classes are imported (optional)

1. Go to **Import** page
2. Set date range: Your desired range (e.g., Jan 1, 2025 → Oct 17, 2025)
3. Check: **☑ Sales**
4. Click: **Start Import**
5. Wait for completion

**Result:** Revenue/purchase records created (stored in `revenue` table)

---

## Quick Reference

### Import All Data for a Date Range (e.g., 1/1/25 - 10/17/25)

**First Time Setup:**

```
1. Students:  Jan 1, 2025 → Oct 17, 2025  ☑ Students only
   (Wait for completion)

2. Classes:   Jan 1, 2025 → Oct 17, 2025  ☑ Classes only
   (Wait for completion)

3. Visits:    Jan 1, 2025 → Oct 17, 2025  ☑ Visits only
   (Wait for completion)

4. Sales:     Jan 1, 2025 → Oct 17, 2025  ☑ Sales only
   (Optional - wait for completion)
```

### Adding New Date Range (e.g., adding Nov 2025 to existing data)

If you already have Students imported:

```
1. Classes:   Nov 1, 2025 → Nov 30, 2025  ☑ Classes only
   (Wait for completion)

2. Visits:    Nov 1, 2025 → Nov 30, 2025  ☑ Visits only
   (Wait for completion)

3. Sales:     Nov 1, 2025 → Nov 30, 2025  ☑ Sales only
   (Optional - wait for completion)
```

---

## Common Issues

### Problem: Import shows "0 records imported" for Visits

**Cause:** No matching Class Schedules exist for the date range

**Solution:**

1. Import Classes for the same date range first
2. Then re-import Visits

### Problem: Import appears "stalled" or hung

**Cause:** Import worker encountered an error or stopped updating

**Solution:**

1. Refresh browser (Cmd+Shift+R or Ctrl+Shift+R)
2. If staleness warning appears, cancel the stalled import
3. Start a new import

### Problem: Want to re-import data for a date range

**Solution:**

- Data imports are additive and use duplicate prevention
- Safe to re-import the same date range
- System will skip duplicate records automatically

---

## Database Table Names

For reference, data is stored in these tables:

| Data Type | Database Table               |
| --------- | ---------------------------- |
| Students  | `students`                   |
| Classes   | `classes`, `class_schedules` |
| Visits    | `attendance`                 |
| Sales     | `revenue`                    |

---

## API Call Usage

- Mindbody provides 5,000 API calls/month free
- After 5,000 calls: $0.002 per additional call
- The import page shows real-time API call tracking
- No wait time restrictions - you can start/resume imports immediately

---

## After Initial Bulk Import

Once your historical data is imported, consider setting up **Webhooks** for real-time sync:

1. Go to **Webhooks** page
2. Create webhook subscription for `classVisit.created` and `classVisit.updated`
3. New bookings and attendance changes will sync automatically
4. This reduces API call usage for ongoing operations

See `WEBHOOKS_AND_API_GUIDE.md` for detailed webhook setup instructions.

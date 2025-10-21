# Production Deployment Guide

## Overview

This application is currently deployed on Replit. For production use with large datasets, proper deployment configuration is critical to prevent memory issues and import failures.

## Deployment Options on Replit

### Current: Autoscale Deployment (Default)

**Characteristics:**
- Automatically scales based on traffic
- Goes idle after 15 minutes of inactivity
- Limited memory allocation
- Cost-effective for variable traffic

**Limitations:**
- ❌ Not suitable for long-running background tasks
- ❌ Memory limits can cause large imports to fail
- ❌ May be interrupted during heavy processing

**Best For:**
- Development and testing
- Low-traffic applications
- Applications without background jobs

### Recommended: Reserved VM Deployment

**Characteristics:**
- Dedicated virtual machine
- Predictable costs and performance
- No idle timeout
- Consistent memory allocation
- Suitable for long-running processes

**Advantages:**
- ✅ Handles large data imports (6+ months)
- ✅ Runs background jobs reliably
- ✅ Maintains persistent connections
- ✅ Better performance under load

**Best For:**
- Production applications
- Large dataset imports
- Background job processing
- Always-on services

## How to Switch to Reserved VM

1. **Open Your Repl**
   - Navigate to your project on Replit

2. **Access Deployment Settings**
   - Click the "Deploy" button in the top right
   - Select "Reserved VM" deployment type

3. **Configure Resources**
   - Choose appropriate CPU/memory allocation
   - Recommended: At least 2GB RAM for large imports
   - Higher memory = better performance for data processing

4. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete
   - Your app will now run on a dedicated VM

5. **Update Custom Domain (if using)**
   - Your custom domain (analysis.yhctime.com) should automatically point to the new deployment
   - Verify the domain is working correctly

## Import Best Practices

### For Autoscale Deployments

If you must use Autoscale deployment:

1. **Use Smaller Date Ranges**
   - Import 1-2 months at a time instead of 6 months
   - Example: Jan-Feb, Mar-Apr, May-Jun

2. **Import During Low Traffic**
   - Schedule imports during off-peak hours
   - Avoid running imports when users are active

3. **Monitor Import Progress**
   - Watch for "stalled" warnings
   - Be ready to resume if import fails

### For Reserved VM Deployments

With Reserved VM, you can:

1. **Import Larger Date Ranges**
   - 6-month or even 1-year imports work reliably
   - Less need to chunk data

2. **Run Scheduled Imports**
   - Daily automatic imports run without issues
   - Background jobs don't interfere with user traffic

3. **Process More Data**
   - Handle organizations with 10,000+ students
   - Process hundreds of thousands of records

## Memory Optimization

The codebase has been optimized to handle large datasets:

### Before Optimization
- Loaded all 10,000+ students into memory at once
- Could cause out-of-memory errors
- Stalled at ~27% on large imports

### After Optimization
- Loads students in batches of 100
- Reduces memory footprint by 99%
- Processes incrementally with checkpoints
- Can resume if interrupted

## Monitoring Import Performance

The import system now includes memory logging:

```
[Memory] Visits batch completed: 2694/10105 students - RSS: 245.32MB, Heap Used: 178.45MB / 256.00MB
```

Watch for:
- **Heap Used approaching Heap Total**: May indicate memory pressure
- **RSS growing continuously**: Possible memory leak
- **Import stalling at same percentage**: May need smaller date range

## Cost Comparison

### Autoscale Deployment
- Pay per request
- $0 when idle
- Variable costs based on traffic
- Can be unpredictable for background jobs

### Reserved VM Deployment
- Fixed monthly cost
- Runs 24/7
- Predictable billing
- Better for production use

**Estimated Monthly Cost:**
- Small Reserved VM: ~$20-30/month
- Medium Reserved VM: ~$50-80/month
- Large Reserved VM: ~$100-150/month

*Check current Replit pricing for exact costs*

## Troubleshooting

### Import Stalls at ~27%

**Cause:** Memory limit exceeded during visits import

**Solution:**
1. Switch to Reserved VM deployment (recommended)
2. OR use smaller date ranges (1-2 months)
3. Resume the import (data is checkpointed)

### "Out of Memory" Errors

**Cause:** Insufficient RAM for data processing

**Solution:**
1. Upgrade to Reserved VM with more memory
2. Use smaller batch sizes
3. Import fewer months at a time

### Import Fails Repeatedly

**Cause:** Multiple possible causes

**Check:**
1. API rate limits (wait 5 minutes between attempts)
2. Mindbody API credentials are valid
3. Network connectivity is stable
4. Review error messages in import UI

## Support

For issues with:
- **Replit Platform**: Contact Replit support
- **Application Bugs**: Check GitHub issues or contact developer
- **Mindbody API**: Verify API credentials and permissions

## Summary

**For Development:**
- Autoscale deployment is fine
- Use smaller imports (1-2 months)

**For Production:**
- Switch to Reserved VM deployment
- Enables large imports (6+ months)
- More reliable and predictable
- Worth the fixed monthly cost

The memory optimization in this release significantly improves import reliability, but Reserved VM deployment is still recommended for production use with large datasets.

# Testing Dynamic Pricing & Revenue Analytics 🧪

**Quick Reference Guide for Phase 21 Features**

---

## 🚀 Quick Start

```powershell
cd C:\Users\gsaie\OneDrive\Desktop\INFOFEST\PIXEL_WARRIORS
npm run dev
```

Open browser: **http://localhost:5173**

---

## 🎯 Test Case 1: Regular Pricing (No Surge)

**Setup:**
1. Login as Authority
2. Create a parking lot with 100 total spots
3. Ensure available spots > 30 (e.g., 50 available)

**Steps:**
1. Logout, login as regular user
2. Search for the parking lot
3. Click "Book Now"
4. Check pricing display

**Expected Result:**
- ✅ Shows base price: `₹50/hour`
- ✅ NO surge badge visible
- ✅ Total = `Duration × ₹50`
- ✅ Confirmation dialog shows regular amount
- ✅ NO "🔥 High Demand" message

**Screenshot Locations:**
- Booking modal → Price section
- Booking total → Rate row
- Confirmation dialog

---

## 🔥 Test Case 2: Surge Pricing Active

**Setup:**
1. Login as Authority
2. Create/edit parking lot: 100 total spots
3. Reduce available spots to 25 (25% = triggers surge)
   - **Method:** Create 75 test bookings, OR
   - **Quick Method:** Manually adjust in Firestore Console

**Steps:**
1. Logout, login as regular user
2. Search for the parking lot
3. Click "Book Now"
4. Observe pricing

**Expected Result:**
- ✅ Shows crossed-out base price: `₹50/hour`
- ✅ Shows surge price in RED: `₹60/hour`
- ✅ Badge visible: `🔥 +20%`
- ✅ Total = `Duration × ₹60`
- ✅ Confirmation shows "🔥 High Demand Pricing Active (+20%)"

**Console Log:**
```javascript
💰 Pricing Details: {
  basePrice: 50,
  occupancyRate: "75.0%",
  availabilityRate: "25.0%",
  isSurgePricing: true,
  surgeMultiplier: 1.20,
  pricePerHour: 60,
  totalAmount: 180  // For 3 hours
}
```

---

## 📊 Test Case 3: Revenue Calculation

**Setup:**
1. Have at least 2-3 completed bookings today
2. Login as Authority

**Steps:**
1. Navigate to Authority Dashboard
2. Check "Analytics & Reporting" section
3. Observe revenue cards

**Expected Result:**
- ✅ "Today's Revenue" shows sum of today's completed bookings
- ✅ "Monthly Revenue" shows sum of this month's completed bookings
- ✅ Numbers formatted with ₹ symbol (e.g., ₹1,234)
- ✅ Values update in real-time when new booking completes

**Test Data Example:**
```
Booking 1: ₹180 (surge, 3 hours, completed today)
Booking 2: ₹100 (regular, 2 hours, completed today)
Booking 3: ₹240 (surge, 4 hours, completed yesterday)

Expected:
- Today's Revenue: ₹280 (180 + 100)
- Monthly Revenue: ₹520 (180 + 100 + 240)
```

---

## 📈 Test Case 4: Occupancy Analytics

**Setup:**
1. Create bookings at different hours
2. Login as Authority

**Steps:**
1. Go to Authority Dashboard
2. Scroll to "Hourly Occupancy Trend"
3. Check chart data

**Expected Result:**
- ✅ Chart shows REAL booking data (not sample)
- ✅ Peak hour displayed in title (e.g., "Peak: 5pm (12 bookings)")
- ✅ Bars represent actual booking counts per hour
- ✅ Only shows today's data (8am-7pm)

**Test Data:**
```
9am-10am: 3 bookings
12pm-1pm: 8 bookings (peak)
5pm-6pm: 6 bookings

Chart should show:
- 9am bar: 3
- 12pm bar: 8 (tallest)
- 5pm bar: 6
- Title: "Peak: 12pm (8 bookings)"
```

---

## 🎲 Test Case 5: Threshold Boundary

**Critical Test: Exact 30% Threshold**

**Setup:**
1. Create parking lot: 100 total spots
2. Set available spots to exactly 30

**Expected:**
- ✅ Surge should NOT activate (30% = boundary, not ≤30%)

**Setup 2:**
1. Set available spots to exactly 30
2. Now reduce to 29

**Expected:**
- ✅ Surge SHOULD activate (29% ≤ 30%)

**Verification:**
- Check console log `availabilityRate`
- Check `isSurgePricing` value
- Verify UI shows/hides surge badge correctly

---

## 🔄 Test Case 6: Real-Time Updates

**Test Dynamic Changes:**

**Steps:**
1. Open booking modal (availability = 35%, no surge)
2. In another tab, login as authority
3. Complete 6 bookings (reduces availability to 29%)
4. Return to first tab (keep modal open)
5. Refresh or close/reopen modal

**Expected:**
- ⚠️ Modal won't update automatically (not live)
- ✅ Close and reopen → Should show surge pricing

**Future Enhancement:** Add real-time listener to booking modal

---

## 🗄️ Test Case 7: Database Verification

**Check Firestore Data:**

**Steps:**
1. Create a booking with surge active
2. Open Firebase Console → Firestore
3. Navigate to `bookings/{bookingId}`
4. Check document fields

**Expected Fields:**
```json
{
  "amount": 180,
  "basePrice": 50,
  "pricePerHour": 60,
  "isSurgePricing": true,
  "surgeMultiplier": 1.2,
  "duration": 3,
  "status": "pending_arrival",
  "createdAt": Timestamp,
  ...other fields
}
```

**Verification:**
- ✅ All 5 pricing fields present
- ✅ `amount` = `duration` × `pricePerHour`
- ✅ `pricePerHour` = `basePrice` × `surgeMultiplier`
- ✅ `isSurgePricing` matches availability condition

---

## 🐛 Test Case 8: Edge Cases

### 8.1 Zero Bookings
**Steps:**
1. Fresh authority account, no bookings
2. Check Authority Dashboard

**Expected:**
- ✅ Today's Revenue: ₹0
- ✅ Monthly Revenue: ₹0
- ✅ Chart shows all zero values
- ✅ Peak Hour: "N/A (0 bookings)" or first hour

### 8.2 Only Pending Bookings
**Steps:**
1. Create 5 bookings, all in "pending_arrival" status
2. Check revenue

**Expected:**
- ✅ Today's Revenue: ₹0 (only counts "completed")
- ✅ Monthly Revenue: ₹0

### 8.3 Past Month Bookings
**Steps:**
1. Have bookings from previous month
2. Check current month revenue

**Expected:**
- ✅ Previous month bookings NOT counted
- ✅ Only current month totaled

---

## 📱 Test Case 9: Mobile Responsiveness

**Steps:**
1. Open in mobile viewport (F12 → Device Toolbar)
2. Test booking flow with surge pricing

**Expected:**
- ✅ Surge badge visible and readable
- ✅ Price display not cut off
- ✅ Chart renders correctly
- ✅ Revenue cards stack properly

---

## 🔐 Test Case 10: Security & Permissions

**User Restrictions:**
**Steps:**
1. Login as regular user
2. Try accessing Authority Dashboard directly

**Expected:**
- ✅ Redirected to home/login
- ✅ Cannot see revenue data
- ✅ Cannot modify parking lots

**Authority Restrictions:**
**Steps:**
1. Authority A manages Lot X
2. Authority B tries to see Lot X bookings

**Expected:**
- ✅ Authority B cannot see Lot X data
- ✅ Revenue only shows from own managed lots

---

## 🎨 Visual Verification Checklist

### Surge Badge Appearance:
- [ ] Background: Red gradient (not solid color)
- [ ] Text: White and bold
- [ ] Icon: 🔥 emoji present
- [ ] Border-radius: Rounded (not square)
- [ ] Positioned correctly next to price

### Crossed-Out Price:
- [ ] Line-through visible
- [ ] Gray color (#999)
- [ ] Positioned before surge price
- [ ] Not the only price shown

### Revenue Cards:
- [ ] Indian Rupee symbol (₹) present
- [ ] Number formatted with commas (₹1,234)
- [ ] "coming soon" text removed
- [ ] Cards align with other metrics

---

## 🧪 Automated Testing Script (Optional)

**Quick Test in Browser Console:**

```javascript
// Test surge pricing calculation
const testSurgePricing = (available, total) => {
  const rate = (available / total) * 100;
  const isSurge = rate <= 30;
  const multiplier = isSurge ? 1.20 : 1.0;
  console.log({
    available,
    total,
    availabilityRate: `${rate.toFixed(1)}%`,
    isSurgePricing: isSurge,
    basePrice: 50,
    surgePrice: Math.round(50 * multiplier)
  });
};

// Test cases
testSurgePricing(50, 100);  // 50% - No surge
testSurgePricing(30, 100);  // 30% - No surge (boundary)
testSurgePricing(29, 100);  // 29% - SURGE!
testSurgePricing(25, 100);  // 25% - SURGE!
testSurgePricing(10, 100);  // 10% - SURGE!
```

---

## 📋 Regression Testing

**Ensure Existing Features Still Work:**

- [ ] QR code entry scan works
- [ ] QR code exit scan works
- [ ] No-show prevention (15-min grace)
- [ ] Advance booking (30-min buffer)
- [ ] Authority confirms arrival
- [ ] Cancel booking works
- [ ] Search/filter parking lots
- [ ] Map view loads correctly
- [ ] Login/Register work
- [ ] Role-based access control

**If ANY fail, revert changes immediately!**

---

## 🚨 Known Issues & Workarounds

### Issue 1: Modal Doesn't Update Live
**Symptom:** Surge pricing doesn't appear if availability changes while modal is open  
**Workaround:** Close and reopen modal to refresh data  
**Future Fix:** Add real-time listener to `selectedParkingLot`

### Issue 2: Occupancy Chart Empty on First Load
**Symptom:** Chart shows all zeros when no bookings today  
**Expected Behavior:** This is correct, not a bug  
**Solution:** Create some bookings to populate chart

### Issue 3: Revenue Shows ₹0 Despite Bookings
**Possible Causes:**
1. Bookings not "completed" status
2. Bookings from different date
3. `exitTime` field missing
**Debug:** Check Firestore booking documents

---

## ✅ Success Criteria

**Phase 21 is successful when:**

1. ✅ Surge pricing activates at ≤30% availability
2. ✅ 20% price increase correctly calculated
3. ✅ UI shows surge badge and crossed-out price
4. ✅ Today's revenue shows real amount
5. ✅ Monthly revenue accumulates correctly
6. ✅ Occupancy chart uses real booking data
7. ✅ Peak hour identified correctly
8. ✅ Booking documents store pricing metadata
9. ✅ All existing features still work
10. ✅ No console errors or warnings

---

## 📸 Screenshots to Capture

**For Documentation:**

1. **No Surge:**
   - Booking modal showing regular price
   - Confirmation dialog with regular amount

2. **With Surge:**
   - Booking modal with crossed-out price and badge
   - Confirmation dialog with "🔥 High Demand" message
   - Console log showing pricing details

3. **Authority Dashboard:**
   - Revenue cards with real amounts
   - Occupancy chart with data
   - Peak hour in chart title

4. **Firestore Document:**
   - Booking document with all pricing fields
   - Screenshot showing JSON structure

---

## 🎉 Completion Checklist

Before marking Phase 21 as complete:

- [ ] All 10 test cases passed
- [ ] Visual verification completed
- [ ] Edge cases handled correctly
- [ ] Regression tests passed
- [ ] Documentation screenshots captured
- [ ] No console errors
- [ ] Code reviewed
- [ ] Git commit with descriptive message

---

**Happy Testing! 🚀**

If you encounter any issues, refer to `DYNAMIC_PRICING_AND_REVENUE_ANALYTICS.md` for implementation details.

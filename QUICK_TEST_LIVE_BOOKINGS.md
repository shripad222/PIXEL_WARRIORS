# 🚀 Quick Test Guide - Live Bookings

## ⚡ 3-Minute Test

### Step 1: Start Dev Server
```powershell
cd C:\Users\gsaie\OneDrive\Desktop\INFOFEST\PIXEL_WARRIORS
npm run dev
```

### Step 2: Open Browser Console
- Press **F12**
- Click **Console** tab
- Keep it open!

### Step 3: Test Driver Dashboard

1. **Login as Driver**
   - Email: driver@test.com (or create new account)
   - Role: Driver

2. **Create Booking**
   - Search for parking location
   - Click "Book Now" on any parking lot
   - Select duration (e.g., 2 hours)
   - Click "Confirm Booking"

3. **✅ Check Console - Should See:**
   ```
   ✅ Booking created successfully!
      - Booking ID: abc123...
      - User ID: your-driver-uid
      - Parking Lot: Margao Central Parking
      - Manager ID: authority-uid
      - Status: active
   🔄 Real-time listener should detect this change automatically...
   
   ✅ Real-time update: Loaded 1 active bookings for user your-driver-uid
   Booking IDs: ["abc123..."]
   ```

4. **✅ Check UI - Should See:**
   - **"Live Bookings (1)"** section
   - Booking card with:
     - Parking lot name
     - Duration: 2 hour(s)
     - Amount: ₹100
     - Start/end times
     - Cancel button

---

### Step 4: Test Authority Dashboard

1. **Login as Authority** (who owns parking lots)
   - Email: authority@test.com
   - Role: Authority

2. **Go to Authority Dashboard**
   - Should automatically load

3. **✅ Check Console - Should See:**
   ```
   ✅ Authority Dashboard: Loaded 1 bookings (managerId: authority-uid)
   Booking details: [{id: "abc123...", parkingLot: "Margao Central...", status: "active", duration: 2}]
   ```

4. **✅ Check UI - Should See:**
   - **"Live Bookings (1)"** section
   - Booking card with:
     - Parking lot name
     - Duration: 2 hour(s)
     - Amount: ₹100
     - Driver: John Doe
     - Email: driver@example.com
     - Status: active (green)

---

## 🎯 What Should Work

| Feature | Driver Dashboard | Authority Dashboard |
|---------|-----------------|---------------------|
| **See bookings** | ✅ Own bookings only | ✅ All bookings for managed lots |
| **Real-time updates** | ✅ Instant | ✅ Instant |
| **Booking details** | ✅ Full details | ✅ Full details + driver info |
| **Cancel booking** | ✅ Yes | ❌ No (future feature) |
| **Auto-refresh** | ✅ No reload needed | ✅ No reload needed |

---

## ⚠️ Quick Troubleshooting

### ❌ "Live Bookings (0)" but booking was created

**Check 1: Console Errors?**
- Look for red text in console
- If yes → Check Firestore rules deployment

**Check 2: Correct User Logged In?**
- Driver: Should see bookings they created
- Authority: Should see bookings for their parking lots

**Check 3: Booking Status**
- Open Firebase Console
- Go to Firestore → bookings
- Check status field = "active"

**Quick Fix:**
```powershell
# Re-deploy Firestore rules
firebase deploy --only firestore:rules

# Hard refresh browser
Ctrl + Shift + R
```

---

### ❌ Authority dashboard shows 0 bookings

**Check 1: Does parking lot have managerId?**
- Open Firebase Console → parkingLots
- Find the parking lot
- Check `managerId` field exists
- Should match authority's UID

**Check 2: Does booking have managerId?**
- Open Firebase Console → bookings
- Find the booking
- Check `managerId` field exists
- Should match parking lot's managerId

**Quick Fix:**
If `managerId` missing from booking:
1. Create a new booking (new bookings will have it)
2. OR manually add `managerId` in Firestore Console

---

### ❌ Console shows no logs

**Check 1: Console Filter**
- Make sure "All levels" is selected
- Not filtering by "Errors" only

**Check 2: Browser Tab**
- Make sure tab is active (not minimized)
- Try hard refresh: Ctrl + Shift + R

---

## ✅ Success Checklist

After testing, you should have:

- [ ] Driver can create booking
- [ ] Booking appears in driver's "Live Bookings" (< 2 seconds)
- [ ] Authority sees booking in their dashboard (< 2 seconds)
- [ ] Console shows ✅ success logs
- [ ] No ❌ error messages in console
- [ ] Cancel booking works (driver only)
- [ ] Two browser windows sync in real-time

---

## 🎊 All Working?

**CONGRATULATIONS!** 🎉

Your live bookings feature is fully operational!

**What you can do now:**
- ✅ Drivers can book parking slots
- ✅ See their active bookings
- ✅ Cancel bookings anytime
- ✅ Authorities see all bookings for their lots
- ✅ Real-time updates across all devices
- ✅ No page refresh needed

---

## 📚 Full Documentation

For detailed information:
- `LIVE_BOOKINGS_FEATURE.md` - Complete feature guide
- `LIVE_BOOKINGS_FIX_SUMMARY.md` - What was fixed
- `LIVE_BOOKINGS_TROUBLESHOOTING.md` - Detailed debugging

---

## 🆘 Still Not Working?

1. Check all 3 documentation files above
2. Verify Firestore rules deployed
3. Check browser is Chrome/Edge
4. Clear browser cache and reload
5. Check Firebase Console for booking documents

**Time to test:** ~3 minutes
**Expected result:** ✅ Live bookings working on both dashboards!


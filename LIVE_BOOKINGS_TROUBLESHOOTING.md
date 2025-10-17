# Live Bookings Troubleshooting Guide

## 🔧 Issues Fixed (December 2024)

### **Issue 1: Bookings Not Showing in Driver Dashboard**
**Problem:** After creating a booking, it wasn't appearing in the "Live Bookings" section on the driver's dashboard.

**Root Causes:**
1. ❌ React `useEffect` dependency issue causing listener to re-initialize unnecessarily
2. ❌ Missing enhanced console logging to debug real-time updates

**Solutions Applied:**
1. ✅ Removed `fetchUserBookings` from `useEffect` dependencies
2. ✅ Added comprehensive console logging for real-time listener
3. ✅ Added detailed logging after booking creation

**Code Changes in `src/App.jsx`:**

```javascript
// BEFORE (Line 945):
}, [user, fetchUserBookings]); // ❌ Caused unnecessary re-renders

// AFTER (Line 945):
}, [user]); // ✅ Only re-run when user changes
```

**Enhanced Logging:**
```javascript
// After booking creation (Lines 791-797):
console.log("✅ Booking created successfully!");
console.log("   - Booking ID:", bookingDoc.id);
console.log("   - User ID:", user.uid);
console.log("   - Parking Lot:", selectedParkingLot.name);
console.log("   - Manager ID:", selectedParkingLot.managerId || "N/A");
console.log("   - Status: active");
console.log("🔄 Real-time listener should detect this change automatically...");

// In real-time listener (Lines 233-239):
console.log(`✅ Real-time update: Loaded ${bookings.length} active bookings for user ${user.uid}`);
if (bookings.length > 0) {
  console.log("Booking IDs:", bookings.map(b => b.id));
}
```

---

### **Issue 2: Bookings Not Showing in Authority Dashboard**
**Problem:** Authority users couldn't see bookings made for their parking lots.

**Root Causes:**
1. ❌ Missing `managerId` field in booking documents
2. ❌ Incorrect field names in UI (using `lotName` instead of `parkingLotName`)
3. ❌ Not filtering by active status

**Solutions Applied:**
1. ✅ Added `managerId` field to booking creation (from `selectedParkingLot.managerId`)
2. ✅ Updated AuthorityDashboard UI to use correct field names
3. ✅ Added active status filtering
4. ✅ Enhanced booking card display with all details

**Code Changes in `src/App.jsx` (Line 764):**

```javascript
// BEFORE:
const bookingData = {
  userId: user.uid,
  parkingLotId: selectedParkingLot.id,
  status: "active",
  // ... other fields
};

// AFTER:
const bookingData = {
  userId: user.uid,
  parkingLotId: selectedParkingLot.id,
  managerId: selectedParkingLot.managerId || null, // ✅ Added for authority dashboard
  status: "active",
  // ... other fields
};
```

**Code Changes in `src/pages/AuthorityDashboard.jsx`:**

```javascript
// BEFORE (Lines 161-170):
{activeBookings.map(booking => (
  <div key={booking.id} className="booking-card">
    <h4>{booking.lotName}</h4>  // ❌ Wrong field name
    <p>Booked for <strong>{booking.duration} hour(s)</strong></p>
    <span>Driver ID: {booking.driverId.slice(0, 8)}...</span>  // ❌ Wrong field
  </div>
))}

// AFTER (Lines 161-178):
{activeBookings.filter(b => b.status === 'active').map(booking => (
  <div key={booking.id} className="booking-card">
    <h4>{booking.parkingLotName || 'Unknown Parking Lot'}</h4>  // ✅ Correct field
    <p><strong>Duration:</strong> {booking.duration} hour(s)</p>
    <p><strong>Amount:</strong> ₹{booking.amount}</p>
    <p><strong>Driver:</strong> {booking.userName || 'Unknown Driver'}</h>
    <p><strong>Email:</strong> {booking.userEmail || 'N/A'}</p>
    <p><strong>Status:</strong> {booking.status}</p>
    <span>Booking ID: {booking.id.slice(0, 12)}...</span>
  </div>
))}
```

**Enhanced Logging in AuthorityDashboard (Lines 39-48):**

```javascript
const unsubBookings = onSnapshot(bookingsQuery, (querySnapshot) => {
  const bookings = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  console.log(`✅ Authority Dashboard: Loaded ${bookings.length} bookings (managerId: ${user.uid})`);
  if (bookings.length > 0) {
    console.log("Booking details:", bookings.map(b => ({
      id: b.id,
      parkingLot: b.parkingLotName,
      status: b.status,
      duration: b.duration
    })));
  }
  setActiveBookings(bookings);
});
```

---

## 🧪 Testing Procedure

### **Test 1: Driver Creates Booking**

1. **Login as Driver**
   - Navigate to driver dashboard
   - Open browser console (F12)

2. **Search for Parking**
   - Enter a location
   - See parking lots on map

3. **Create Booking**
   - Click "Book Now" on any parking lot
   - Select duration (e.g., 2 hours)
   - Click "Confirm Booking"

4. **Check Console Logs**
   ```
   ✅ Booking created successfully!
      - Booking ID: abc123xyz789
      - User ID: driver-uid-here
      - Parking Lot: Margao Central Parking
      - Manager ID: authority-uid-here
      - Status: active
   🔄 Real-time listener should detect this change automatically...
   
   ✅ Real-time update: Loaded 1 active bookings for user driver-uid-here
   Booking IDs: ["abc123xyz789"]
   ```

5. **Verify UI**
   - Should see "Live Bookings (1)"
   - Should see booking card with:
     - Parking lot name
     - Duration and amount
     - Start and end times
     - Booking ID
     - Active status badge
     - Cancel button

---

### **Test 2: Authority Views Bookings**

1. **Login as Authority** (who owns parking lots)
   - Navigate to authority dashboard
   - Open browser console (F12)

2. **Check Console Logs**
   ```
   ✅ Authority Dashboard: Loaded 1 bookings (managerId: authority-uid-here)
   Booking details: [
     {
       id: "abc123xyz789",
       parkingLot: "Margao Central Parking",
       status: "active",
       duration: 2
     }
   ]
   ```

3. **Verify UI**
   - Should see "Live Bookings (1)"
   - Should see booking card with:
     - Parking lot name
     - Duration: 2 hour(s)
     - Amount: ₹100
     - Driver: John Doe
     - Email: driver@example.com
     - Status: active (in green)
     - Booking ID: abc123xyz789...

---

### **Test 3: Real-Time Updates**

1. **Open Two Browser Windows**
   - Window 1: Driver dashboard
   - Window 2: Authority dashboard (same authority who owns the parking)

2. **Create Booking in Window 1**
   - Book a parking slot
   - Click confirm

3. **Watch Both Windows**
   - **Window 1 (Driver):** Booking should appear in "Live Bookings" within 1-2 seconds
   - **Window 2 (Authority):** Booking should appear in "Live Bookings" within 1-2 seconds
   - **No page refresh needed!**

---

### **Test 4: Cancel Booking**

1. **In Driver Dashboard**
   - See active booking in "Live Bookings"
   - Click "Cancel Booking"
   - Confirm cancellation

2. **Expected Results**
   - Booking disappears from "Live Bookings"
   - Count updates: "Live Bookings (0)"
   - Parking lot available spots increase by 1
   - Toast: "Booking cancelled successfully!"

3. **In Authority Dashboard**
   - Booking should disappear automatically
   - Count updates: "Live Bookings (0)"

---

## 🔍 Debugging Checklist

### **If Driver's Live Bookings Not Showing:**

1. ✅ **Check Browser Console**
   - Look for "✅ Real-time update: Loaded X active bookings"
   - Check if X is 0 or > 0
   - Look for any errors (red text)

2. ✅ **Verify User is Logged In**
   - Check if `user` object exists in console
   - Type `user` in console and press Enter
   - Should see user object with `uid`, `email`, etc.

3. ✅ **Check Firestore Console**
   - Go to Firebase Console → Firestore Database
   - Open `bookings` collection
   - Find booking documents
   - Verify fields:
     - `userId` matches current driver's UID
     - `status` is "active"
     - `createdAt` has a timestamp

4. ✅ **Check Firestore Rules**
   - Ensure rules are deployed: `firebase deploy --only firestore:rules`
   - Check if driver role can read their own bookings

5. ✅ **Check Network Tab**
   - Open DevTools → Network tab
   - Filter by "firestore" or "google"
   - Look for queries to bookings collection
   - Check if they're successful (200 status)

---

### **If Authority's Live Bookings Not Showing:**

1. ✅ **Check Browser Console**
   - Look for "✅ Authority Dashboard: Loaded X bookings"
   - Check if X matches expected count
   - Look for booking details array

2. ✅ **Verify managerId in Bookings**
   - Open Firestore Console
   - Check booking document
   - Verify `managerId` field exists
   - Verify it matches authority's UID

3. ✅ **Verify Parking Lot Ownership**
   - Open `parkingLots` collection
   - Find the parking lot being booked
   - Check `managerId` field
   - Should match authority's UID

4. ✅ **Check Query**
   - In console, check the query:
   ```javascript
   where("managerId", "==", user.uid)
   ```
   - Ensure user.uid is the authority's UID

---

## 🐛 Common Issues & Fixes

### **Issue: "Live Bookings (0)" but bookings exist in Firestore**

**Possible Causes:**
- ❌ Wrong userId in booking document
- ❌ Status is not "active"
- ❌ Firestore rules blocking read access
- ❌ Real-time listener not set up

**Fix:**
1. Check booking document fields in Firestore
2. Verify status is "active"
3. Check userId matches current user
4. Deploy Firestore rules: `firebase deploy --only firestore:rules`
5. Hard refresh browser (Ctrl + Shift + R)

---

### **Issue: Booking shows in driver dashboard but not authority dashboard**

**Possible Causes:**
- ❌ Missing `managerId` field in booking
- ❌ Wrong `managerId` value
- ❌ Authority not owner of the parking lot

**Fix:**
1. Check booking document in Firestore
2. Verify `managerId` field exists
3. Compare with parking lot's `managerId`
4. If missing, existing bookings need manual update:
   ```javascript
   // In Firestore Console, update booking:
   managerId: "authority-uid-here"
   ```

---

### **Issue: Bookings not updating in real-time**

**Possible Causes:**
- ❌ Internet connection lost
- ❌ Firestore listener not active
- ❌ Browser tab inactive (throttled)

**Fix:**
1. Check internet connection
2. Hard refresh (Ctrl + Shift + R)
3. Check console for listener setup messages
4. Open DevTools → Application → Service Workers → Unregister
5. Clear cache and reload

---

## 📊 Data Structure Reference

### **Booking Document (in Firestore)**

```javascript
{
  // IDs
  id: "abc123xyz789",  // Auto-generated by Firestore
  userId: "driver-uid-here",
  parkingLotId: "lot-id-here",
  managerId: "authority-uid-here",  // ✅ REQUIRED for authority dashboard
  
  // Status
  status: "active",  // "active" | "cancelled" | "completed"
  
  // Times
  createdAt: Timestamp,
  startTime: Date,
  endTime: Date,
  
  // Details
  duration: 2,  // hours
  amount: 100,  // ₹
  pricePerHour: 50,
  
  // Parking Info
  parkingLotName: "Margao Central Parking",
  parkingLotAddress: "123 Main St, Margao",
  
  // User Info
  userName: "John Doe",
  userEmail: "driver@example.com",
  
  // Metadata
  bookingSource: "web-app",
  deviceType: "desktop"
}
```

---

## 🚀 Performance Tips

1. **Limit Queries:** Only fetch active bookings, not all bookings
2. **Use Indexes:** Firestore auto-creates indexes for our queries
3. **Clean Up Listeners:** Always unsubscribe on component unmount
4. **Optimize Re-renders:** Use `useCallback` for functions

---

## ✅ Success Indicators

When everything works correctly, you should see:

**Driver Dashboard:**
- ✅ "Live Bookings (X)" showing correct count
- ✅ Booking cards appear immediately after booking
- ✅ Console logs showing real-time updates
- ✅ Cancel button works and updates UI instantly

**Authority Dashboard:**
- ✅ "Live Bookings (X)" showing correct count
- ✅ All bookings for managed parking lots visible
- ✅ Console logs showing bookings loaded
- ✅ Real-time updates when drivers book

**Console Logs:**
```
✅ Booking created successfully!
   - Booking ID: abc123xyz789
   - User ID: driver-uid
   - Parking Lot: Margao Central Parking
   - Manager ID: authority-uid
   - Status: active
🔄 Real-time listener should detect this change automatically...

✅ Real-time update: Loaded 1 active bookings for user driver-uid
Booking IDs: ["abc123xyz789"]

✅ Authority Dashboard: Loaded 1 bookings (managerId: authority-uid)
Booking details: [{id: "abc123xyz789", parkingLot: "Margao Central Parking", ...}]
```

---

## 📞 Still Having Issues?

If you've tried all the above and still have issues:

1. **Check Browser:** Try Chrome/Edge (best support for Firestore)
2. **Clear All Data:** DevTools → Application → Clear Storage → Clear site data
3. **Check Firebase Quota:** Firebase Console → Usage tab
4. **Verify Internet:** Firestore needs active connection
5. **Check Firebase Status:** https://status.firebase.google.com/

**Last Resort:**
- Delete the booking and create a new one
- Check if new bookings work (old ones might have missing fields)

---

## 🎉 Feature Working!

If you see booking cards in both dashboards with real-time updates, **CONGRATULATIONS!** 🎊

Your live bookings feature is fully operational! 🚀


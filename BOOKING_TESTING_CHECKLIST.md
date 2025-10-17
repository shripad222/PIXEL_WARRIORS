# Booking System - Quick Testing Checklist

## ✅ **Before Testing**

1. Make sure you're logged in as a **DRIVER** (not authority)
2. Firestore rules must be deployed
3. Internet connection active
4. Browser console open (F12) to see logs

---

## 🧪 **Test Scenarios**

### **Test 1: Successful Booking** ✅
**Steps:**
1. Click on a green parking marker (available spots > 0)
2. Click "Book Now" button
3. See booking modal open
4. Select duration (try 2 hours)
5. Click "Confirm Booking"
6. Confirm in the alert dialog

**Expected Result:**
- ✅ Success toast with booking ID
- ✅ Available spots decrease by 1
- ✅ Modal closes
- ✅ Marker may change color if now full
- ✅ Console shows: "Booking created successfully with ID: ..."

---

### **Test 2: Full Parking Lot** ⛔
**Steps:**
1. Find a parking lot with 0 available spots (orange marker)
2. Try to click "Book Now"

**Expected Result:**
- ✅ Button is DISABLED
- ✅ Button text shows "Fully Booked"
- ✅ Cannot click button

---

### **Test 3: Invalid Duration** ⚠️
**Steps:**
1. Open booking modal
2. Try to manually type "0" in duration input
3. Or try typing "30" (over 24 hours)

**Expected Result:**
- ✅ Input automatically corrects to min (1) or max (24)
- ✅ JavaScript validation prevents invalid values

---

### **Test 4: User Cancels Confirmation** ❌
**Steps:**
1. Fill booking details
2. Click "Confirm Booking"
3. Click **"Cancel"** in the confirmation dialog

**Expected Result:**
- ✅ Booking is NOT created
- ✅ Modal stays open
- ✅ No database changes
- ✅ No toast message

---

### **Test 5: Check Console Logs** 🔍
**Steps:**
1. Open browser console (F12)
2. Perform a booking
3. Look at the logs

**Expected Console Output:**
```
Starting booking process...
User ID: [your-user-id]
Parking Lot ID: [parking-lot-id]
Duration: 2
Parking spot reserved successfully
Booking created successfully with ID: [booking-id]
```

---

### **Test 6: Verify Database** 📊
**Steps:**
1. Complete a booking
2. Go to Firebase Console → Firestore Database
3. Check two collections:

**A. `bookings` collection:**
- New document with booking ID
- Fields: userId, parkingLotId, status, createdAt, etc.
- status = "active"

**B. `parkingLots` collection:**
- Find the booked parking lot
- `availableSpots` decreased by 1

---

### **Test 7: Wrong User Role** 🔒
**Steps:**
1. Log out
2. Log in as **AUTHORITY** (not driver)
3. Navigate to driver dashboard (if possible)
4. Try to book

**Expected Result:**
- ✅ Error: "Permission denied. Please make sure you're logged in as a driver."
- ✅ Console shows: `Error code: permission-denied`

---

### **Test 8: Network Simulation** 🌐
**Steps:**
1. Open booking modal
2. Open Chrome DevTools (F12) → Network tab
3. Select "Offline" in network throttling
4. Try to book

**Expected Result:**
- ✅ Error: "Network Error - Unable to connect to server"
- ✅ No database changes (because offline)

---

## 📋 **Validation Checklist**

Check each item after testing:

- [ ] ✅ Logged-in users can book
- [ ] ⛔ Logged-out users cannot book
- [ ] ✅ Drivers can book
- [ ] ⛔ Authorities cannot book (permission denied)
- [ ] ✅ Full parking lots have disabled "Book Now" button
- [ ] ✅ Duration is limited to 1-24 hours
- [ ] ✅ Confirmation dialog shows before booking
- [ ] ✅ Canceling confirmation stops the booking
- [ ] ✅ Success message shows booking ID
- [ ] ✅ Available spots decrease after booking
- [ ] ✅ Database updates correctly (both bookings & parkingLots)
- [ ] ✅ Console logs all steps
- [ ] ✅ Clear error messages for each failure type
- [ ] ✅ Modal closes after successful booking

---

## 🎯 **Success Criteria**

All of these should be TRUE:

1. ✅ Booking creates a document in `bookings` collection
2. ✅ Parking lot's `availableSpots` decreases by 1
3. ✅ User sees success message with booking ID
4. ✅ Modal closes automatically
5. ✅ Map marker updates if parking becomes full
6. ✅ Cannot book twice for same spot (race condition prevented)

---

## 🐛 **If Something Goes Wrong**

### **Error: "Permission denied"**
**Solution:**
1. Make sure you're logged in as DRIVER
2. Check Firestore rules are deployed
3. Check user's role in Firestore → users → {your-uid} → role = "driver"

### **Error: "Failed to complete booking"**
**Solution:**
1. Check console for specific error
2. Verify internet connection
3. Check if parking lot still exists
4. Try refreshing the page

### **Button stays "Processing..."**
**Solution:**
1. Refresh the page
2. Check console for errors
3. Check Firestore rules are deployed

### **No error, but booking not in database**
**Solution:**
1. Hard refresh (Ctrl + Shift + R)
2. Check you're looking at correct Firebase project
3. Check Firestore rules allow write access

---

## 🔧 **Debugging Commands**

Open browser console and run:

```javascript
// Check current user
console.log("User:", auth.currentUser);

// Check user role
getDoc(doc(db, "users", auth.currentUser.uid))
  .then(doc => console.log("Role:", doc.data().role));

// Check all bookings
getDocs(collection(db, "bookings"))
  .then(snapshot => console.log("Total bookings:", snapshot.size));
```

---

## 📞 **Need Help?**

Check these files for reference:
- `BOOKING_VALIDATION_GUIDE.md` - Complete validation details
- `DEPLOY_BOOKING_RULES.md` - How to deploy Firestore rules
- Browser Console (F12) - See real-time logs

**All 17 validations are active and protecting your booking system! 🚀**


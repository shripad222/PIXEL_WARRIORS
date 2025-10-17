# 🔍 Browser Console Diagnostic Script

## Copy and Paste This in Browser Console (F12)

### **Script 1: Check Current User & Bookings**

```javascript
// Paste this in browser console (F12 → Console tab)

console.log("═══════════════════════════════════════");
console.log("🔍 LIVE BOOKINGS DIAGNOSTIC");
console.log("═══════════════════════════════════════");

// Check if user is logged in
const checkAuth = () => {
  const authUser = window.firebase?.auth()?.currentUser;
  if (authUser) {
    console.log("✅ User logged in:");
    console.log("   - UID:", authUser.uid);
    console.log("   - Email:", authUser.email);
    return authUser.uid;
  } else {
    console.log("❌ No user logged in!");
    return null;
  }
};

// Check bookings in Firestore
const checkBookings = async (userId) => {
  if (!userId) {
    console.log("❌ Cannot check bookings without user ID");
    return;
  }
  
  try {
    const db = window.firebase.firestore();
    
    console.log("\n📊 Querying Firestore for bookings...");
    console.log("   - Collection: bookings");
    console.log("   - Filter: userId ==", userId);
    console.log("   - Filter: status == 'active'");
    
    const snapshot = await db.collection("bookings")
      .where("userId", "==", userId)
      .where("status", "==", "active")
      .get();
    
    console.log("\n📈 Query Results:");
    console.log("   - Documents found:", snapshot.size);
    
    if (snapshot.size > 0) {
      console.log("\n✅ BOOKINGS FOUND:");
      snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`\n   📌 Booking ID: ${doc.id}`);
        console.log(`      - Parking: ${data.parkingLotName || 'N/A'}`);
        console.log(`      - Duration: ${data.duration || 'N/A'} hours`);
        console.log(`      - Amount: ₹${data.amount || 'N/A'}`);
        console.log(`      - Status: ${data.status}`);
        console.log(`      - User ID: ${data.userId}`);
        console.log(`      - Created: ${data.createdAt?.toDate?.() || 'N/A'}`);
      });
    } else {
      console.log("\n⚠️ NO BOOKINGS FOUND");
      console.log("\nPossible reasons:");
      console.log("   1. No bookings created yet");
      console.log("   2. User ID mismatch");
      console.log("   3. Status is not 'active'");
      console.log("   4. Firestore rules blocking access");
    }
    
  } catch (error) {
    console.error("\n❌ ERROR:", error.message);
    console.error("   Code:", error.code);
    
    if (error.code === 'failed-precondition') {
      console.error("\n🔥 FIRESTORE INDEX REQUIRED!");
      console.error("   Run: firebase deploy --only firestore:indexes");
    }
  }
};

// Run diagnostics
const userId = checkAuth();
if (userId) {
  checkBookings(userId);
}

console.log("\n═══════════════════════════════════════");
```

---

## 📋 What This Script Does

1. ✅ Checks if user is logged in
2. ✅ Shows user UID and email
3. ✅ Queries Firestore directly for bookings
4. ✅ Shows all booking details
5. ✅ Identifies common issues

---

## 🎯 Expected Output (If Working)

```
═══════════════════════════════════════
🔍 LIVE BOOKINGS DIAGNOSTIC
═══════════════════════════════════════
✅ User logged in:
   - UID: B21UhpEUTMefiDzI6cl35xtopSJ2
   - Email: gsaiesh255@gmail.com

📊 Querying Firestore for bookings...
   - Collection: bookings
   - Filter: userId == B21UhpEUTMefiDzI6cl35xtopSJ2
   - Filter: status == 'active'

📈 Query Results:
   - Documents found: 1

✅ BOOKINGS FOUND:

   📌 Booking ID: 9JyUUJZiYsLCo2Zb7dbE
      - Parking: lot 1
      - Duration: 3 hours
      - Amount: ₹150
      - Status: active
      - User ID: B21UhpEUTMefiDzI6cl35xtopSJ2
      - Created: Thu Oct 17 2025...

═══════════════════════════════════════
```

---

## 🔴 If You See Errors

### **Error: "firebase is not defined"**

The Firebase SDK might not be loaded. Try:

```javascript
// Alternative using window object
const { collection, query, where, getDocs } = window.firestoreSDK;
```

Or just check the Network tab for Firebase calls.

---

### **Error: "failed-precondition" or "index required"**

```
❌ ERROR: The query requires an index
🔥 FIRESTORE INDEX REQUIRED!
   Run: firebase deploy --only firestore:indexes
```

**Solution:** Deploy indexes (see `DEPLOY_FIRESTORE_INDEXES.md`)

---

### **Output: "Documents found: 0"**

```
⚠️ NO BOOKINGS FOUND

Possible reasons:
   1. No bookings created yet
   2. User ID mismatch
   3. Status is not 'active'
   4. Firestore rules blocking access
```

**Check:**
1. Go to Firebase Console
2. Open Firestore Database
3. Find `bookings` collection
4. Check if document exists
5. Verify `userId` matches current user
6. Verify `status` is "active"

---

## 🧪 Quick Tests

### **Test 1: Check if User is Logged In**

```javascript
console.log("Current user:", window.firebase?.auth()?.currentUser?.uid);
```

**Expected:** Your user UID (e.g., `B21UhpEUTMefiDzI6cl35xtopSJ2`)

---

### **Test 2: Check React State**

```javascript
// This won't work as React state is not in global scope
// But you can check in React DevTools (Components tab)
```

**Better:** Use React DevTools browser extension:
1. Install React DevTools
2. Open DevTools → Components tab
3. Find `App` component
4. Look for `userBookings` in hooks
5. Should see array with booking objects

---

### **Test 3: Check Network Requests**

1. Open DevTools (F12)
2. Go to **Network** tab
3. Filter by "firestore" or "google"
4. Refresh page
5. Look for requests to Firestore API
6. Check if they return 200 (success) or errors

---

## 🎓 Understanding the Issue

### **Why Bookings Not Showing:**

```
User Creates Booking
      ↓
Firestore Saves Document ✅
      ↓
Real-Time Listener Queries Firestore
      ↓
Query Requires Index ❌  ← YOU ARE HERE
      ↓
Query Fails Silently
      ↓
No Data Returned
      ↓
UI Shows "Live Bookings (0)"
```

### **After Fix:**

```
User Creates Booking
      ↓
Firestore Saves Document ✅
      ↓
Real-Time Listener Queries Firestore
      ↓
Query Works (No orderBy) ✅  ← FIX APPLIED
      ↓
Data Returned
      ↓
UI Shows "Live Bookings (1)" ✅
```

---

## ✅ Step-by-Step Testing

1. **Refresh browser** (Ctrl + Shift + R)

2. **Open Console** (F12 → Console tab)

3. **Look for automatic logs:**
   ```
   🔵 fetchUserBookings called
   🔍 Setting up real-time listener for bookings...
   ✅ Real-time update: Loaded X active bookings...
   ```

4. **If no automatic logs, paste diagnostic script**

5. **Check the output**

6. **If bookings found in script but not in UI:**
   - React state issue
   - Check React DevTools
   - Look for render errors

7. **If bookings NOT found in script:**
   - Database issue
   - Check Firebase Console
   - Verify document exists

---

## 🆘 Still Not Working?

Run this complete diagnostic:

```javascript
// Complete diagnostic
console.log("User UID:", window.firebase?.auth()?.currentUser?.uid);
console.log("User Email:", window.firebase?.auth()?.currentUser?.email);

// Try to fetch ONE document from bookings collection
window.firebase.firestore().collection("bookings").limit(1).get()
  .then(snapshot => {
    console.log("Can access bookings collection:", !snapshot.empty);
    if (!snapshot.empty) {
      console.log("Sample booking:", snapshot.docs[0].data());
    }
  })
  .catch(err => console.error("Error accessing bookings:", err));
```

This will tell us if you can access Firestore at all!

---

## 📞 Next Steps

1. Run the diagnostic script
2. Copy the console output
3. Share it for further debugging
4. Check the specific error messages

**The most likely issue is the missing Firestore index, which we've already worked around!** Just refresh the page and it should work now. 🚀


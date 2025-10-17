# Live Bookings Not Showing - Debugging Guide

## Issue Description
Driver interface is not displaying bookings in the "Live Bookings" section, even after successful booking creation.

## Root Cause Analysis

The issue is likely caused by **missing Firestore composite index** for the bookings query.

### Query Requirements
The `fetchUserBookings()` function uses:
```javascript
query(
  collection(db, "bookings"),
  where("userId", "==", user.uid),
  where("status", "==", "active")
)
```

This query requires a **composite index** with:
- `userId` (ASCENDING)
- `status` (ASCENDING)

## Debugging Steps

### Step 1: Check Browser Console
1. Open browser (press `F12`)
2. Go to **Console** tab
3. Look for these messages:

**✅ Good signs:**
```
🔵 fetchUserBookings called
   - User: [some-user-id]
🔍 Setting up real-time listener for bookings...
✅ Real-time update: Loaded X active bookings for user [user-id]
```

**❌ Error signs:**
```
❌ Error fetching bookings: [error]
🔥 FIRESTORE INDEX REQUIRED! Run: firebase deploy --only firestore:indexes
```

### Step 2: Check Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** → **Indexes** tab
4. Check if you have an index with:
   - Collection: `bookings`
   - Fields: `userId` (Ascending) + `status` (Ascending)

### Step 3: Check Firestore Data
1. In Firebase Console → **Firestore Database** → **Data** tab
2. Navigate to `bookings` collection
3. Find your booking document
4. Verify these fields:
   - ✅ `userId` matches your logged-in user's UID
   - ✅ `status` = `"active"`
   - ✅ `startTime`, `endTime`, `duration`, `amount` exist
   - ✅ `parkingLotName`, `parkingLotAddress` exist

### Step 4: Check Authentication
1. In browser console, type:
```javascript
// Check if user is logged in
console.log("Current user:", firebase.auth().currentUser);
```

2. Should show user object with `uid`, `email`, etc.

## Solution 1: Deploy Missing Firestore Index (RECOMMENDED)

The `firestore.indexes.json` file should already have the required index. Deploy it:

```powershell
cd C:\Users\gsaie\OneDrive\Desktop\INFOFEST\PIXEL_WARRIORS
firebase deploy --only firestore:indexes
```

**Wait time:** 2-5 minutes for index to build

**Verification:** 
1. Refresh browser (Ctrl + Shift + R)
2. Check console for: `✅ Real-time update: Loaded X active bookings...`
3. Live Bookings section should populate

## Solution 2: Temporary Workaround (If Index Deploy Fails)

If index deployment doesn't work, modify the query to use only ONE where clause:

**Current code (line 229-234):**
```javascript
const bookingsQuery = query(
  collection(db, "bookings"),
  where("userId", "==", user.uid),
  where("status", "==", "active")  // ← Remove this
);
```

**Change to:**
```javascript
const bookingsQuery = query(
  collection(db, "bookings"),
  where("userId", "==", user.uid)
  // Removed status filter - will filter in JavaScript
);
```

**Then add filtering in JavaScript (line 240-245):**
```javascript
snapshot.forEach((doc) => {
  const data = doc.data();
  
  // Filter only active bookings in JavaScript
  if (data.status !== "active") {
    return; // Skip non-active bookings
  }
  
  bookings.push({
    id: doc.id,
    ...data,
    // ... rest of code
  });
});
```

## Solution 3: Check firestore.indexes.json

Ensure this file exists and has the correct index:

```json
{
  "indexes": [
    {
      "collectionGroup": "bookings",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "userId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "bookings",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "managerId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "bookings",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "parkingLotId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
```

## Expected Console Output (When Working)

```
🔵 fetchUserBookings called
   - User: abc123xyz456
🔍 Setting up real-time listener for bookings...
✅ Real-time update: Loaded 1 active bookings for user abc123xyz456
Booking IDs: [ "bookingId123" ]
First booking: {
  id: "bookingId123",
  userId: "abc123xyz456",
  status: "active",
  parkingLotName: "Example Parking",
  amount: 100,
  duration: 2,
  ...
}
```

## Common Issues & Fixes

### Issue 1: "No user logged in"
**Symptom:** Console shows `⚠️ No user logged in, clearing bookings`
**Fix:** Ensure you're logged in as a driver. Check `useAuth()` context.

### Issue 2: "No bookings found for this user"
**Symptom:** Console shows `⚠️ No bookings found for this user`
**Possible causes:**
- Booking was created with wrong `userId`
- Booking `status` is not `"active"`
- Firestore query is failing silently

**Fix:** Check Firestore console and verify booking fields match query.

### Issue 3: Index error
**Symptom:** Console shows `🔥 FIRESTORE INDEX REQUIRED!`
**Fix:** Deploy indexes using `firebase deploy --only firestore:indexes`

### Issue 4: Bookings created but listener not triggering
**Symptom:** Booking created successfully, but Live Bookings stays empty
**Possible causes:**
- Index not deployed
- Listener set up before booking was created
- Query filtering out the booking

**Fix:**
1. Deploy indexes
2. Refresh page after creating booking
3. Check browser console for error messages

## Testing Checklist

After implementing fix:

- [ ] Browser console shows no errors
- [ ] Console shows: `🔵 fetchUserBookings called`
- [ ] Console shows: `✅ Real-time update: Loaded X active bookings`
- [ ] Live Bookings section displays booking cards
- [ ] Booking details are correct (name, address, duration, amount)
- [ ] Cancel button works
- [ ] Creating new booking adds it to the list immediately

## Quick Test

1. **Refresh browser** (Ctrl + Shift + R)
2. **Open console** (F12)
3. **Create a test booking:**
   - Search for a location
   - Find route
   - Click "Book Now" on a parking lot
   - Select 2 hours
   - Confirm booking
4. **Check console for:**
   ```
   ✅ Booking created successfully!
   🔄 Real-time listener should detect this change automatically...
   ✅ Real-time update: Loaded 1 active bookings for user...
   ```
5. **Check UI:**
   - Live Bookings section should show (1)
   - Booking card should appear with all details

## Next Steps

1. **Deploy the indexes** (most important):
   ```powershell
   firebase deploy --only firestore:indexes
   ```

2. **Wait 2-5 minutes** for index to build

3. **Test booking creation** and check if it appears in Live Bookings

4. **If still not working**, share the browser console output for further debugging

## Manual Index Creation (Alternative)

If `firebase deploy` doesn't work, create index manually:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** → **Indexes** tab
4. Click **Create Index**
5. Enter:
   - Collection ID: `bookings`
   - Field 1: `userId` (Ascending)
   - Field 2: `status` (Ascending)
   - Query scope: Collection
6. Click **Create**
7. Wait for index to build (2-5 minutes)
8. Refresh your app

---

**Expected Result:** Live Bookings section shows all active bookings with real-time updates! 🎉

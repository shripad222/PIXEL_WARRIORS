# 🔒 Firestore Security Rules - Deployment Guide

## 📋 Current Security Rules Summary

Your Firestore security rules are now configured in `FIRESTORE_RULES.txt` with the following access controls:

### 🔐 Authentication & Roles

- **Two Roles**: `driver` and `authority`
- **Role Storage**: User roles are stored in `/users/{userId}` collection
- **Role-Based Access**: Different permissions for drivers vs authorities

---

## 📂 Collection Access Rules

### 1. **`/users/{userId}`** - User Profiles

| Action | Who Can Access | Conditions |
|--------|---------------|------------|
| **Read** | User themselves | Must be authenticated and owner |
| **Create** | User themselves | During registration, must include email, role, createdAt |
| **Update** | User themselves | Cannot change role or createdAt |
| **Delete** | Nobody | Profiles cannot be deleted |

**Purpose**: Secure user profile storage with role information

---

### 2. **`/parkingLots/{lotId}`** - Parking Lot Data

| Action | Who Can Access | Conditions |
|--------|---------------|------------|
| **Read** | Everyone | Public access for drivers to search |
| **Create** | Authorities only | Must include name, address, location, totalSpots, availableSpots, managerId |
| **Update** | Authorities (own lots) OR Anyone (only availableSpots) | Authorities: full access to their lots<br>Others: Can only update availableSpots (for booking) |
| **Delete** | Authorities only | Can only delete their own lots |

**Purpose**: Public parking lot data with authority management

---

### 3. **`/bookings/{bookingId}`** - Parking Bookings (Future)

| Action | Who Can Access | Conditions |
|--------|---------------|------------|
| **Read** | User themselves OR Authorities | Drivers see own bookings, authorities see all |
| **Create** | Drivers only | Must include userId, parkingLotId, status, createdAt |
| **Update** | User themselves | Can update their own bookings (cancel, etc.) |
| **Delete** | User themselves | Can delete own bookings |

**Purpose**: Future booking system with proper access control

---

### 4. **`/reviews/{reviewId}`** - Parking Lot Reviews (Future)

| Action | Who Can Access | Conditions |
|--------|---------------|------------|
| **Read** | Everyone | Public reviews visible to all |
| **Create** | Drivers only | Must include userId, parkingLotId, rating (1-5), comment, createdAt |
| **Update** | User themselves | Can edit their own reviews |
| **Delete** | User themselves | Can delete their own reviews |

**Purpose**: User-generated reviews with validation

---

### 5. **`/payments/{paymentId}`** - Payment Records (Future)

| Action | Who Can Access | Conditions |
|--------|---------------|------------|
| **Read** | User themselves | Can only see own payment history |
| **Create** | User themselves | System creates payment records |
| **Update** | Nobody | Payment records are immutable |
| **Delete** | Nobody | Payment records cannot be deleted |

**Purpose**: Secure payment history tracking

---

### 6. **`/analytics/{analyticsId}`** - Analytics Data (Future)

| Action | Who Can Access | Conditions |
|--------|---------------|------------|
| **Read** | Authorities only | Dashboard analytics |
| **Write** | Nobody | Should be written by Cloud Functions |

**Purpose**: Authority dashboard analytics

---

## 🚀 How to Deploy These Rules

### Option 1: Firebase Console (Recommended for Quick Testing)

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select Your Project**: `goa-sathi-474610`
3. **Navigate to Firestore Database**
4. **Click "Rules" tab**
5. **Copy contents from** `FIRESTORE_RULES.txt`
6. **Paste into the rules editor**
7. **Click "Publish"**

### Option 2: Firebase CLI (Recommended for Production)

1. **Create firestore.rules file** (if not exists):
   ```bash
   cp FIRESTORE_RULES.txt firestore.rules
   ```

2. **Update firebase.json** to include Firestore:
   ```json
   {
     "firestore": {
       "rules": "firestore.rules"
     },
     "hosting": {
       "site": "goa-sathi-474610",
       "public": "dist",
       "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
       "rewrites": [
         {
           "source": "**",
           "destination": "/index.html"
         }
       ]
     }
   }
   ```

3. **Deploy rules**:
   ```bash
   firebase deploy --only firestore:rules
   ```

4. **Or deploy everything**:
   ```bash
   firebase deploy
   ```

---

## 🧪 Testing Your Rules

### Test Driver Access:

```javascript
// ✅ Should work: Driver reading parking lots
const parkingLots = await getDocs(collection(db, 'parkingLots'));

// ✅ Should work: Driver reading own profile
const userDoc = await getDoc(doc(db, 'users', currentUserId));

// ❌ Should fail: Driver creating parking lot
await addDoc(collection(db, 'parkingLots'), { ... }); // Permission denied
```

### Test Authority Access:

```javascript
// ✅ Should work: Authority creating parking lot
await addDoc(collection(db, 'parkingLots'), {
  name: 'Test Parking',
  managerId: currentUserId,
  // ... other fields
});

// ✅ Should work: Authority updating own parking lot
await updateDoc(doc(db, 'parkingLots', lotId), {
  availableSpots: 10
});

// ❌ Should fail: Authority updating other's parking lot
await updateDoc(doc(db, 'parkingLots', otherLotId), { ... }); // Permission denied
```

---

## ⚠️ Important Security Notes

### 1. **User Role Validation**
- Roles are set during registration
- Once set, roles cannot be changed by users
- This prevents privilege escalation

### 2. **Public Parking Lot Access**
- Parking lots are publicly readable (no auth required)
- This allows drivers to search before logging in
- If you want auth-only access, change `allow read: if true;` to `allow read: if isSignedIn();`

### 3. **Parking Lot Updates**
- The rule allows anyone to update `availableSpots` only
- This supports future booking systems
- If you want stricter control, restrict to authorities only

### 4. **Manager Validation**
```javascript
// When creating parking lot, ensure managerId is set:
await addDoc(collection(db, 'parkingLots'), {
  name: 'My Parking Lot',
  address: '123 Main St',
  location: new GeoPoint(15.4909, 73.8278),
  totalSpots: 100,
  availableSpots: 100,
  managerId: user.uid, // ⚠️ Required! Must match auth.uid
  rating: 4.5
});
```

---

## 🔧 Customization Options

### Make Parking Lots Private (Auth Required):
```javascript
// In parkingLots rules:
allow read: if isSignedIn(); // Instead of: if true;
```

### Allow Only Authorities to Update Spots:
```javascript
allow update: if isAuthority() && resource.data.managerId == request.auth.uid;
```

### Add Admin Super Role:
```javascript
function isAdmin() {
  return isSignedIn() && getUserRole() == 'admin';
}

// Then use in rules:
allow write: if isAdmin();
```

---

## 📊 Rule Testing Commands

### Test in Firebase Console:

1. Go to **Firestore → Rules → Rules Playground**
2. Select operation (Read/Write)
3. Enter collection path: `/parkingLots/testLot`
4. Set authenticated: Yes/No
5. Set custom claims: `{ "uid": "testUser123" }`
6. Click "Run"

---

## 🐛 Common Issues & Fixes

### Issue 1: "Missing or insufficient permissions"
**Cause**: Rules not deployed or user not authenticated
**Fix**: 
- Deploy rules to Firestore
- Ensure user is logged in
- Check user role in Firestore

### Issue 2: "Role not found"
**Cause**: User document doesn't have role field
**Fix**: 
```javascript
// During registration, ensure role is set:
await setDoc(doc(db, 'users', user.uid), {
  email: user.email,
  role: 'driver', // or 'authority'
  createdAt: serverTimestamp()
});
```

### Issue 3: Authority can't create parking lot
**Cause**: Role not set correctly or managerId mismatch
**Fix**:
- Verify role: Check `/users/{uid}` has `role: 'authority'`
- Ensure `managerId` in parking lot data matches `auth.uid`

---

## 📝 Quick Reference

| User Type | Can Read Parking Lots | Can Create Parking Lots | Can Update Own Profile | Can Delete Parking Lots |
|-----------|----------------------|------------------------|----------------------|------------------------|
| **Guest (Not Authenticated)** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Driver** | ✅ Yes | ❌ No | ✅ Yes | ❌ No |
| **Authority** | ✅ Yes | ✅ Yes (own) | ✅ Yes | ✅ Yes (own only) |

---

## 🎯 Next Steps

1. ✅ **Deploy rules** to Firebase (see deployment options above)
2. ✅ **Test authentication** flow (driver and authority)
3. ✅ **Verify permissions** work correctly
4. ✅ **Monitor Security** tab in Firebase Console for rule violations
5. ⭐ **Add Cloud Functions** for complex operations (analytics, payments)

---

## 📞 Need Help?

If you encounter security rule issues:
1. Check Firebase Console → Firestore → Rules tab
2. Look at Security Rules Playground for testing
3. View logs in Firebase Console → Analytics → Debug View
4. Check browser console for detailed error messages

---

**Security Rules Last Updated**: October 17, 2025
**Project**: Smart Parking System (goa-sathi-474610)
**Version**: 1.0

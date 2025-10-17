# 🔐 How to Deploy Firestore Security Rules

## Quick Deploy Options

### Option 1: Firebase Console (Easiest - No CLI Required)

1. **Copy the rules**:
   - Open `firestore.rules` file
   - Copy ALL contents (Ctrl+A, Ctrl+C)

2. **Go to Firebase Console**:
   - Visit: https://console.firebase.google.com/
   - Select your project: **goa-sathi-474610**

3. **Navigate to Firestore Rules**:
   - Click "Firestore Database" in left sidebar
   - Click "Rules" tab at the top
   - You'll see a code editor

4. **Paste the rules**:
   - Delete everything in the editor
   - Paste your copied rules
   - Click **"Publish"** button

5. **Done!** ✅ Rules are now active

---

### Option 2: Firebase CLI (Recommended for Production)

#### Step 1: Install Firebase CLI (if not installed)

```powershell
npm install -g firebase-tools
```

#### Step 2: Login to Firebase

```powershell
firebase login
```

This will open a browser window for authentication.

#### Step 3: Initialize Firebase (if not done)

```powershell
cd C:\Users\gsaie\OneDrive\Desktop\INFOFEST\PIXEL_WARRIORS
firebase init firestore
```

**Select**:
- Use an existing project → Choose `goa-sathi-474610`
- Firestore rules file → Press Enter (use default: `firestore.rules`)
- Firestore indexes file → Press Enter (use default: `firestore.indexes.json`)

#### Step 4: Deploy Rules Only

```powershell
firebase deploy --only firestore:rules
```

**Output should show**:
```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/goa-sathi-474610/overview
```

#### Step 5: Verify Deployment

Go to Firebase Console → Firestore → Rules tab to verify.

---

## 🧪 Testing Your Rules

After deployment, test in Firebase Console:

### Test 1: Public Read Access to Parking Lots

1. Go to **Firestore → Rules → Rules Playground**
2. Set:
   - **Location**: `/parkingLots/testLot`
   - **Operation**: `get`
   - **Authenticated**: No
3. Click **"Run"**
4. ✅ Should show: **"Simulated read allowed"**

### Test 2: Driver Creating Parking Lot (Should Fail)

1. Same playground
2. Set:
   - **Location**: `/parkingLots/newLot`
   - **Operation**: `create`
   - **Authenticated**: Yes
   - **Custom token data**: `{"uid": "testDriver123"}`
3. Click **"Run"**
4. ❌ Should show: **"Simulated create denied"**

### Test 3: Authority Creating Parking Lot (Should Pass)

1. Same playground
2. Set:
   - **Location**: `/parkingLots/newLot`
   - **Operation**: `create`
   - **Authenticated**: Yes
   - **Custom token data**: `{"uid": "testAuthority123"}`
3. Need to mock the user role first:
   ```javascript
   // In browser console after login as authority:
   await setDoc(doc(db, 'users', 'testAuthority123'), {
     role: 'authority',
     email: 'test@example.com'
   });
   ```
4. ✅ Should show: **"Simulated create allowed"**

---

## 📝 What These Rules Do

### ✅ Allowed Operations:

| Who | Can Do | On What |
|-----|--------|---------|
| **Anyone** | Read | Parking lots (public access) |
| **Authenticated Users** | Read | Own profile |
| **Drivers** | Create | Own bookings, reviews |
| **Authorities** | Create/Update/Delete | Own parking lots |
| **Authorities** | Read | All analytics |

### ❌ Denied Operations:

| Who | Cannot Do | On What |
|-----|-----------|---------|
| **Drivers** | Create | Parking lots |
| **Drivers** | Delete | Any parking lots |
| **Anyone** | Change | User roles after creation |
| **Anyone** | Delete | User profiles |
| **Anyone** | Write | Analytics (system only) |

---

## 🔧 Customization Options

### Make Parking Lots Private (Require Authentication)

In `firestore.rules`, change line 59:

```javascript
// From:
allow read: if true;

// To:
allow read: if isSignedIn();
```

### Allow Anyone to Update Parking Spots (Remove Auth)

Change line 72:

```javascript
// From:
allow update: if (isAuthority() && resource.data.managerId == request.auth.uid)
              || (isSignedIn() && ...

// To:
allow update: if true; // ⚠️ Warning: Less secure
```

### Add Admin Super Role

Add this helper function at line 30:

```javascript
function isAdmin() {
  return isSignedIn() && getUserRole() == 'admin';
}
```

Then allow admins to do anything:

```javascript
// In any collection
allow read, write: if isAdmin();
```

---

## 🐛 Troubleshooting

### Error: "Missing or insufficient permissions"

**Cause**: Rules not deployed or user not authenticated

**Fix**:
1. Verify rules are deployed (check Firebase Console)
2. Ensure user is logged in
3. Check user has correct role in `/users/{uid}`

**Debug**:
```javascript
// In browser console
import { auth } from './firebase';
console.log('User:', auth.currentUser);

import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
console.log('Role:', userDoc.data()?.role);
```

### Error: "Property role is undefined"

**Cause**: User document doesn't exist in Firestore

**Fix**:
1. Login again (auto-migration will create document)
2. Or use migration tool: http://localhost:5177/migrate-user
3. Or manually create document in Firebase Console

### Error: "Simulated read denied" (but should work)

**Cause**: Rules Playground doesn't have mock user role

**Fix**:
Create test user document first:
```javascript
await setDoc(doc(db, 'users', 'testUserId'), {
  email: 'test@example.com',
  role: 'authority', // or 'driver'
  createdAt: serverTimestamp()
});
```

---

## 📊 Rule Coverage

Your rules now cover:

- ✅ User authentication and authorization
- ✅ Role-based access control (driver vs authority)
- ✅ Public read access to parking lots
- ✅ Protected write access to parking lots
- ✅ Owner validation (users can only edit their own data)
- ✅ Field validation (required fields, value ranges)
- ✅ Future collections (bookings, reviews, payments)
- ✅ Analytics protection (authority only)
- ✅ Default deny for unknown collections

---

## 🚀 Next Steps After Deployment

1. ✅ **Deploy the rules** (use either option above)
2. ✅ **Test in Firebase Console** Rules Playground
3. ✅ **Test in your app** (login as driver and authority)
4. ✅ **Monitor** Firebase Console → Firestore → Usage tab
5. ✅ **Check Security** tab for any rule violations

---

## 📞 Quick Commands Reference

```powershell
# Login to Firebase
firebase login

# Initialize Firestore
firebase init firestore

# Deploy rules only
firebase deploy --only firestore:rules

# Deploy everything
firebase deploy

# Check deployment status
firebase projects:list

# View current rules
firebase firestore:rules get
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Rules appear in Firebase Console → Firestore → Rules
- [ ] Public can read parking lots (no auth required)
- [ ] Drivers can login and see their profile
- [ ] Authorities can login and access dashboard
- [ ] Authorities can create/edit their parking lots
- [ ] Drivers cannot create parking lots
- [ ] Users cannot change their own roles
- [ ] No console errors when using the app

---

**Ready to deploy?** Choose Option 1 for quick setup or Option 2 for production! 🚀

**Project**: goa-sathi-474610  
**File**: `firestore.rules` (already created in your project)  
**Status**: ✅ Ready to deploy

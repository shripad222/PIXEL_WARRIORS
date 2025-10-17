# QR Code Entry Scan Debugging Guide

## 🐛 Issue: "Failed to process entry scan"

### ✅ Fixes Applied

1. **QR Data Parsing Fix**
   - Added proper JSON string parsing
   - Handles both string and object formats
   - Better error messages for parse failures

2. **Booking Lookup Enhancement**
   - Now fetches directly from Firestore if not in local cache
   - Added detailed console logging
   - Shows available bookings for debugging

3. **Detailed Console Logging**
   - Step-by-step entry scan process tracking
   - Booking validation details
   - Status checks and updates
   - Error details with codes

4. **Improved Error Handling**
   - Specific error messages based on error code
   - Permission-denied detection
   - Not-found resource detection
   - Full error stack traces in console

### 🔍 How to Debug

#### Step 1: Open Browser Console (F12)
Look for these console messages:

**When scanning QR code:**
```
QR Code scanned: <JSON string>
QR Code Scanned: <parsed object> Type: entry
```

**When processing entry:**
```
🔍 Processing ENTRY scan...
Booking details: {id, status, entryScanned, parkingLotId, userName}
✅ Validation passed. Updating booking...
✅ Booking updated. Decrementing parking lot spots...
✅ Spots decremented successfully
✅ Entry scan successful - Booking <id> - Spots decremented
```

#### Step 2: Check Common Issues

**Issue 1: Booking Not Found**
- Console shows: "Booking not found in activeBookings array"
- **Cause**: Booking status doesn't match filter
- **Solution**: System now fetches directly from Firestore

**Issue 2: Invalid Status**
- Error: "Cannot scan entry. Booking status: <status>"
- **Valid statuses**: `active` or `pending_arrival`
- **Check**: Booking might have expired or been cancelled

**Issue 3: Already Scanned**
- Error: "This booking has already been scanned for entry!"
- **Check**: `entryScanned` field in booking document

**Issue 4: Permission Denied**
- Error: "Permission denied. Please check Firestore security rules."
- **Solution**: Update Firestore rules to allow entry scanning

**Issue 5: Invalid QR Code**
- Error: "Invalid QR code format - missing required fields"
- **Check**: QR code must have `bookingId` and `parkingLotId`

#### Step 3: Check Firestore

**Booking Document Structure:**
```javascript
{
  id: "booking-id",
  status: "active" | "pending_arrival",
  entryScanned: false,
  exitScanned: false,
  entryTime: null,
  exitTime: null,
  qrCodeData: "{\"bookingId\":\"...\",\"parkingLotId\":\"...\"}",
  parkingLotId: "lot-id",
  userName: "Driver Name",
  // ... other fields
}
```

**Required for Entry Scan:**
- ✅ `status` = "active" OR "pending_arrival"
- ✅ `entryScanned` = false
- ✅ `qrCodeData` exists and is valid JSON
- ✅ `parkingLotId` matches an existing parking lot

#### Step 4: Check Firestore Security Rules

Entry scanning requires these permissions:

```javascript
// In firestore.rules
match /bookings/{bookingId} {
  allow update: if request.auth != null && 
    (request.resource.data.managerId == request.auth.uid ||
     request.resource.data.userId == request.auth.uid);
}

match /parkingLots/{lotId} {
  allow update: if request.auth != null && 
    resource.data.managerId == request.auth.uid;
}
```

### 🧪 Testing Procedure

**Step 1: Create a Test Booking**
1. Log in as driver
2. Book a parking spot
3. Note the booking ID in console
4. Verify QR code is displayed
5. Download QR code image

**Step 2: Test Entry Scan**
1. Log in as authority (in different browser/incognito)
2. Open Authority Dashboard
3. Click "Scan Entry QR"
4. Allow camera access
5. Scan the QR code
6. Check console logs

**Expected Console Output:**
```
QR Code scanned: {"bookingId":"abc123",...}
QR Code Scanned: {bookingId: "abc123",...} Type: entry
🔍 Processing ENTRY scan...
Booking details: {...}
✅ Validation passed. Updating booking...
✅ Booking updated. Decrementing parking lot spots...
✅ Spots decremented successfully
✅ Entry scan successful - Booking abc123 - Spots decremented
```

**Expected UI Changes:**
- ✅ Success toast notification
- ✅ Available spots decreased by 1
- ✅ Booking status changes to "🅿️ In Parking"
- ✅ Entry scan status shows ✅ (green)
- ✅ Entry time displayed

**Step 3: Verify Database Updates**
Check Firestore Console:
- `bookings/{bookingId}`:
  - `status` = "in_parking"
  - `entryScanned` = true
  - `entryTime` = <timestamp>
- `parkingLots/{lotId}`:
  - `availableSpots` = original - 1

### 🔧 Quick Fixes

**If QR code won't scan:**
1. Ensure good lighting
2. Hold QR code steady
3. Adjust distance (6-12 inches)
4. Try different camera if available
5. Download and print QR code

**If booking not found:**
1. Check if logged in as correct authority
2. Verify managerId matches
3. Check booking hasn't expired
4. Refresh Authority Dashboard

**If permission denied:**
1. Check Firestore rules
2. Verify user is authenticated
3. Check managerId in booking
4. Redeploy security rules

**If spots not decremented:**
1. Check console for errors
2. Verify parkingLotId is correct
3. Check parking lot document exists
4. Verify availableSpots field exists

### 📊 Console Logging Reference

**Debug Commands:**
```javascript
// In browser console
console.log('Active bookings:', activeBookings);
console.log('Current user:', user);
console.log('Managed lots:', managedLots);
```

**What to look for:**
- ❌ Red error messages = Something failed
- ⚠️ Yellow warnings = Potential issues
- ✅ Green success = All good
- 🔍 Debug info = Tracking progress

### 🚨 Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid QR code format" | QR data missing fields | Regenerate booking |
| "Booking not found" | Not in authority's list | Check managerId |
| "Cannot scan entry. Status: X" | Wrong booking status | Check booking state |
| "Already scanned for entry" | Duplicate scan | Use exit scan instead |
| "Permission denied" | Firestore rules | Update security rules |
| "Failed to fetch booking" | Network/Firestore error | Check connection |

### ✅ Success Indicators

**Console:**
```
✅ Entry scan successful - Booking abc123 - Spots decremented
```

**UI:**
- Success toast with green checkmark
- Spots count decreased
- Status badge shows "🅿️ In Parking"
- Entry status shows ✅

**Database:**
- Booking updated
- Parking lot spots decremented
- Timestamps recorded

---

**Need More Help?**
1. Copy console output (Ctrl+A in console, Ctrl+C)
2. Check Firestore rules
3. Verify booking status in Firestore Console
4. Check parking lot document
5. Review error codes

**Last Updated:** January 2025

# Live Bookings Data Flow Diagram

## 📊 Complete Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER CREATES BOOKING                          │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  Driver Dashboard (App.jsx)                          │
│  • User clicks "Book Now"                                            │
│  • Selects duration                                                  │
│  • Clicks "Confirm Booking"                                          │
│  • handleBooking() function executes                                 │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│               CREATE BOOKING DOCUMENT IN FIRESTORE                   │
│                                                                       │
│  bookings/abc123xyz789:                                              │
│  {                                                                    │
│    userId: "driver-uid-12345"          // ✅ For driver query        │
│    parkingLotId: "lot-xyz-789"                                       │
│    managerId: "authority-uid-67890"    // ✅ For authority query     │
│    status: "active"                    // ✅ For status filter       │
│    parkingLotName: "Margao Central"                                  │
│    userName: "John Doe"                                              │
│    userEmail: "driver@test.com"                                      │
│    duration: 2                                                       │
│    amount: 100                                                       │
│    startTime: Date                                                   │
│    endTime: Date                                                     │
│    createdAt: Timestamp                                              │
│  }                                                                    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
        ┌───────────────────────┐       ┌───────────────────────┐
        │  REAL-TIME LISTENER   │       │  REAL-TIME LISTENER   │
        │   (Driver Dashboard)  │       │ (Authority Dashboard) │
        └───────────────────────┘       └───────────────────────┘
                    │                               │
                    ▼                               ▼
        ┌───────────────────────┐       ┌───────────────────────┐
        │  FIRESTORE QUERY 1    │       │  FIRESTORE QUERY 2    │
        │                       │       │                       │
        │  query(               │       │  query(               │
        │    "bookings",        │       │    "bookings",        │
        │    where("userId",    │       │    where("managerId", │
        │      "==",            │       │      "==",            │
        │      "driver-uid-     │       │      "authority-uid-  │
        │       12345"),        │       │       67890"),        │
        │    where("status",    │       │    // Status filter   │
        │      "==", "active")  │       │    // done in UI      │
        │  )                    │       │  )                    │
        └───────────────────────┘       └───────────────────────┘
                    │                               │
                    ▼                               ▼
        ┌───────────────────────┐       ┌───────────────────────┐
        │  onSnapshot FIRES     │       │  onSnapshot FIRES     │
        │  ✅ Match Found!      │       │  ✅ Match Found!      │
        │  Returns 1 booking    │       │  Returns 1 booking    │
        └───────────────────────┘       └───────────────────────┘
                    │                               │
                    ▼                               ▼
        ┌───────────────────────┐       ┌───────────────────────┐
        │  UPDATE STATE         │       │  UPDATE STATE         │
        │  setUserBookings([    │       │  setActiveBookings([  │
        │    booking1           │       │    booking1           │
        │  ])                   │       │  ])                   │
        └───────────────────────┘       └───────────────────────┘
                    │                               │
                    ▼                               ▼
        ┌───────────────────────┐       ┌───────────────────────┐
        │  RE-RENDER UI         │       │  RE-RENDER UI         │
        │  "Live Bookings (1)"  │       │  "Live Bookings (1)"  │
        │                       │       │                       │
        │  ┌─────────────────┐  │       │  ┌─────────────────┐  │
        │  │ Booking Card    │  │       │  │ Booking Card    │  │
        │  │ • Lot Name      │  │       │  │ • Lot Name      │  │
        │  │ • Duration: 2h  │  │       │  │ • Duration: 2h  │  │
        │  │ • Amount: ₹100  │  │       │  │ • Amount: ₹100  │  │
        │  │ • Times         │  │       │  │ • Driver: John  │  │
        │  │ • Cancel Button │  │       │  │ • Email         │  │
        │  └─────────────────┘  │       │  └─────────────────┘  │
        └───────────────────────┘       └───────────────────────┘
```

---

## 🔑 Key Fields Mapping

### **For Driver Dashboard Query:**

```javascript
Query: where("userId", "==", currentUser.uid)

Matches booking when:
✅ booking.userId === "driver-uid-12345"
✅ booking.status === "active"

Result: Shows bookings created by this driver
```

### **For Authority Dashboard Query:**

```javascript
Query: where("managerId", "==", currentUser.uid)

Matches booking when:
✅ booking.managerId === "authority-uid-67890"
✅ booking.status === "active" (filtered in UI)

Result: Shows bookings for parking lots owned by this authority
```

---

## 🔄 Real-Time Update Flow

```
User Action                    Firestore                    UI Update
─────────────                  ─────────                    ─────────

[Create Booking] ─────────────> [Document Added] ──────────> [onSnapshot]
                                to "bookings"                   fires
                                collection                        │
                                                                  ▼
                                                             [State Updated]
                                                                  │
                                                                  ▼
                                                             [UI Re-renders]
                                                                  │
                                                                  ▼
                                                          [Booking Card Appears]

Total Time: < 2 seconds ⚡
No page refresh needed! ✨
```

---

## 🎯 Field Usage Matrix

| Field | Stored In | Used By Driver | Used By Authority | Purpose |
|-------|-----------|----------------|-------------------|---------|
| `userId` | ✅ | ✅ Query filter | ❌ | Identify booking owner |
| `managerId` | ✅ | ❌ | ✅ Query filter | Identify lot owner |
| `parkingLotId` | ✅ | ✅ Display | ✅ Display | Link to parking lot |
| `status` | ✅ | ✅ Query filter | ✅ UI filter | Show active only |
| `parkingLotName` | ✅ | ✅ Display | ✅ Display | Show in card |
| `userName` | ✅ | ✅ Display | ✅ Display | Show driver name |
| `userEmail` | ✅ | ✅ Display | ✅ Display | Contact info |
| `duration` | ✅ | ✅ Display | ✅ Display | Booking length |
| `amount` | ✅ | ✅ Display | ✅ Display | Payment amount |
| `startTime` | ✅ | ✅ Display | ✅ Display | When booking starts |
| `endTime` | ✅ | ✅ Display | ✅ Display | When booking ends |
| `createdAt` | ✅ | ✅ Ordering | ✅ Ordering | Sort bookings |

---

## 🔍 Query Comparison

### **Driver Dashboard Query:**

```javascript
const bookingsQuery = query(
  collection(db, "bookings"),
  where("userId", "==", user.uid),        // ✅ Match: Current user
  where("status", "==", "active"),        // ✅ Match: Active only
  orderBy("createdAt", "desc")            // ✅ Order: Newest first
);

// Example result:
[
  {
    id: "abc123",
    userId: "driver-uid-12345",           // ✅ Matches current user
    managerId: "authority-uid-67890",
    status: "active",                     // ✅ Active
    parkingLotName: "Margao Central",
    // ... other fields
  }
]
```

### **Authority Dashboard Query:**

```javascript
const bookingsQuery = query(
  collection(db, "bookings"),
  where("managerId", "==", user.uid)      // ✅ Match: Current authority
);

// Then filter in UI:
activeBookings.filter(b => b.status === 'active')

// Example result:
[
  {
    id: "abc123",
    userId: "driver-uid-12345",
    managerId: "authority-uid-67890",     // ✅ Matches current authority
    status: "active",                     // ✅ Filtered to active
    parkingLotName: "Margao Central",
    userName: "John Doe",                 // ✅ Show driver info
    // ... other fields
  }
]
```

---

## 📱 Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        App.jsx (Driver)                          │
│                                                                   │
│  State:                                                           │
│  • userBookings: []                                              │
│  • loadingBookings: false                                        │
│                                                                   │
│  Functions:                                                       │
│  • fetchUserBookings()  ─────> Sets up onSnapshot listener       │
│  • handleBooking()      ─────> Creates booking document          │
│  • handleCancelBooking()─────> Updates status to "cancelled"     │
│                                                                   │
│  useEffect:                                                       │
│  • Runs when user logs in                                        │
│  • Calls fetchUserBookings()                                     │
│  • Returns cleanup function                                      │
│                                                                   │
│  UI:                                                              │
│  • Live Bookings header with count                               │
│  • Grid of booking cards                                         │
│  • Cancel button per card                                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                 AuthorityDashboard.jsx                           │
│                                                                   │
│  State:                                                           │
│  • activeBookings: []                                            │
│  • managedLots: []                                               │
│                                                                   │
│  useEffect:                                                       │
│  • Sets up TWO listeners:                                        │
│    1. Parking lots (where managerId == user.uid)                │
│    2. Bookings (where managerId == user.uid)                    │
│                                                                   │
│  UI:                                                              │
│  • Analytics section                                             │
│  • Live Bookings section (with active filter)                   │
│  • Managed Parking Lots section                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Data Relationships

```
┌─────────────────┐
│     users       │
│  (Collection)   │
├─────────────────┤
│ driver-uid-     │ ──────┐
│   12345         │       │
│ • role: driver  │       │
└─────────────────┘       │
                          │
┌─────────────────┐       │
│     users       │       │
│  (Collection)   │       │
├─────────────────┤       │
│ authority-uid-  │ ──┐   │
│   67890         │   │   │
│ • role:authority│   │   │
└─────────────────┘   │   │
                      │   │
        ┌─────────────┘   │
        │                 │
        ▼                 │
┌─────────────────┐       │
│  parkingLots    │       │
│  (Collection)   │       │
├─────────────────┤       │
│ lot-xyz-789     │       │
│ • name: "Margao │       │
│   Central"      │       │
│ • managerId:    │       │
│   "authority-   │       │
│    uid-67890"   │◄──────┘
│ • totalSpots: 20│
│ • available: 19 │
└─────────────────┘
        │
        └─────────────────┐
                          │
                          ▼
                  ┌─────────────────┐
                  │    bookings     │
                  │  (Collection)   │
                  ├─────────────────┤
                  │ abc123xyz789    │
                  │ • userId:       │
                  │   "driver-uid-  │◄────────┐
                  │    12345"       │         │
                  │ • parkingLotId: │         │
                  │   "lot-xyz-789" │◄────┐   │
                  │ • managerId:    │     │   │
                  │   "authority-   │     │   │
                  │    uid-67890"   │◄────┼───┘
                  │ • status:       │     │
                  │   "active"      │     │
                  └─────────────────┘     │
                                          │
            Queries:                      │
            • Driver: where userId ==  ───┘
            • Authority: where managerId == (points up)
```

---

## ✅ Success Flow Summary

1. **Driver creates booking** → Document saved with `userId` and `managerId`
2. **Firestore notifies listeners** → Both onSnapshot queries detect new doc
3. **Driver's listener matches** → userId matches current user
4. **Authority's listener matches** → managerId matches current user
5. **Both UIs update** → Cards appear in < 2 seconds
6. **No refresh needed** → Real-time synchronization! ⚡

---

## 🎊 That's It!

This diagram shows exactly how the data flows from booking creation to display on both dashboards. The key insight is that **one booking document serves two purposes** through different query filters!


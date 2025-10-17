# 🅿️ PARK_EASY

🚗 **Smart Car Parking Availability and Management System** by **PIXEL_WARRIORS** 🏆

This project helps drivers discover and book nearby parking in real time while giving parking managers powerful tools to manage capacity, verify entry/exit via QR codes, and monitor activity. It's built with React, Vite, and Firebase (Auth, Firestore, Vertex AI), plus Google Maps.

🎯 **The problem we're solving:** finding parking in crowded urban areas is slow and frustrating. PARK_EASY provides live availability, smart search, routing, quick bookings, and a manager dashboard to reduce double parking and congestion.

—

## 🚀 What's implemented so far

### 🚗 Driver Experience
- 🤖 **Natural-language search with AI**: Gemini parses queries like "I'm at Quepem and want to go to Navelim" to extract origin and destination
- 🗺️ **Google Maps integration** with Places autocomplete and Directions routing
- 🎨 **Color-coded markers**: 🟢 green = available, 🟠 orange = full; 🔵 blue = your location, 🔴 red = destination
- 📏 **Distance filters**: 500m only, 500m–1km, 1km only, or show all
- ℹ️ **Parking lot details** in map info windows, with "Get Directions" and "Book Now"
- 📋 **Booking flows**:
	- ⚡ **Book Now** with a 30-minute buffer to reach the lot
	- 📅 **Advance booking** for a future time (up to 7 days)
	- 💰 **Dynamic pricing** (+20% surge when availability ≤30%)
	- ⚠️ **Conflict checking** against existing active bookings
	- 🚫 **No‑show prevention**: 15‑minute grace after start; auto mark no_show and free the spot
	- 📱 **Instant QR code generation** (downloadable) for entry/exit with unique validation
	- 🔒 **QR code security**: Each QR contains unique booking ID, timestamp, and validation data
	- 📊 **Live bookings panel** with real-time updates, arrival confirmation, and cancel/end actions

### 🏢 Authority Experience
- 🔐 **Email/password login** for authorities and role‑based access
- 📊 **Authority Dashboard** with:
	- 📋 **Live bookings** managed by the authority (pending/active/in_parking)
	- ✅ **Confirm arrival button** for pending arrivals
	- 📷 **QR scanner** (camera) for entry and exit using html5‑qrcode
		- 🚪 Entry scan sets status to in_parking and decrements availability
		- 🚪 Exit scan sets status to completed and increments availability
		- 🔒 **Smart validation**: Prevents duplicate scans, validates parking lot, and ensures scan order
		- 📊 **Detailed logging**: Clear error messages for scan issues and validation failures
	- 🏗️ **Managed lots list** with quick spot increments/decrements
	- ➕ **Add New Parking Lot** form (name, address, total/available, GeoPoint)
	- 📈 **Basic analytics section** (sample trend chart and live occupancy %)

### ⚙️ Under the Hood
- ⚛️ **React 19** + ⚡ **Vite 6**, 🎨 **Tailwind** + custom CSS, 🛣️ **react-router-dom 7**
- 🔥 **Firebase 11**: Auth (anonymous + email/password), Firestore, Vertex AI (Gemini 2.0 Flash)
- 🗺️ **@react-google-maps/api** for Maps and Directions
- 🔄 **Real-time Firestore listeners** for bookings and managed lots
- 🔔 **Toast notifications**, 🎨 **icons**, 📱 **QR generation and scanning** utilities
- 🔒 **Enhanced QR security**: Unique validation, anti-reuse protection, and detailed error handling

—

## 🛠️ Tech Stack
- ⚛️ **React**, ⚡ **Vite**, 🎨 **Tailwind CSS**
- 🔥 **Firebase**: Auth, Firestore, Vertex AI (Gemini), Analytics
- 🗺️ **Google Maps Platform**: Maps JavaScript API + Places API
- 📚 **Libraries**: @react-google-maps/api, react-hot-toast, react-icons, qrcode.react, html5-qrcode, recharts

—

## 📋 Prerequisites
- 📦 **Node.js** ≥ 18.18 and **npm** ≥ 9.6 (npm 10.x recommended)
- 🔥 **A Firebase project** with:
	- 🔐 **Authentication**: Email/Password (for authorities) and Anonymous (for drivers)
	- 🗄️ **Firestore Database**
	- 🤖 **Vertex AI for Firebase** enabled (to use Gemini)
	- 📊 **Google Analytics** (optional)
- 🗺️ **Google Maps API key** (Maps JavaScript API + Places API enabled)

—

## 🚀 Local Setup (Windows / PowerShell)

**1)** 📥 **Clone and open the project**
```powershell
cd "C:\Users\<your-username>\OneDrive\Desktop\INFOFEST\PIXEL_WARRIORS"
```

**2)** 📦 **Install dependencies (clean install)**
```powershell
npm ci
```

**3)** ⚙️ **Configure environment variables**: create a file named `.env` in the repo root with your keys
```dotenv
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
VITE_GOOGLE_MAPS_API_KEY=your_maps_key
```

**4)** 🚀 **Start the dev server**
```powershell
npm run dev
```
🌐 Open http://localhost:5173

### 📝 Common Scripts
- 🔥 **Dev**: `npm run dev`
- 🧹 **Lint**: `npm run lint`
- 🏗️ **Build**: `npm run build`
- 👀 **Preview prod build**: `npm run preview`
- 🧽 **Clean caches**: `npm run clean`

⚠️ If you hit build or module issues after a fresh clone, try:
```powershell
npm run clean; npm ci
```

—

## 🔥 Firebase Configuration

🔧 **Enable these in Firebase Console:**
- 🔐 **Authentication**
	- 📧 Email/Password provider (authority users)
	- 👤 Anonymous provider (driver fallback)
- 🗄️ **Firestore Database** (in production or test mode as appropriate)
- 🤖 **Vertex AI for Firebase** (generative models)
- 📊 **Google Analytics** (optional, used by `getAnalytics` when `measurementId` is set)

🛡️ **Security Rules** (summary of `firestore.rules`)
- 👥 **users**: users can create/read/update their own profile; roles are driver or authority; cannot delete
- 🅿️ **parkingLots**:
	- 🌐 Public read access
	- ➕ Create: authorities only; must include name, address, location (GeoPoint), totalSpots ≥ availableSpots; managerId must equal auth uid
	- ✏️ Update: authorities on their own lots; and any authenticated user can update only `availableSpots` within bounds (for booking/QR events)
	- ❌ Delete: authority who manages the lot
- 📋 **bookings**:
	- 👀 Read: booking owner, the authority for that booking, or authorities in general
	- ➕ Create: drivers only; must include userId, parkingLotId, status, createdAt
	- ✏️ Update: booking owner; or authority managing that lot (QR scans/arrival); or system status updates (no_show, etc.)
	- ❌ Delete: owner only
- 📝 **reviews/payments/analytics**: limited and optional collections as defined in the rules

📑 **Indexes**
- Custom indexes are defined in `firestore.indexes.json`. If you see Firestore index errors (failed-precondition), deploy them.

—

## 🗄️ Data Model (Current)

### 🅿️ parkingLots (collection)
- 🆔 **id** (auto)
- 🏷️ **name**: string
- 📍 **address**: string
- 🌍 **location**: GeoPoint (preferred), or separate `lat` and `lng` numbers (fallback supported in code)
- 🔢 **totalSpots**: number
- 🔢 **availableSpots**: number
- 👤 **managerId**: string (authority uid)
- 💰 **pricePerHour**: number (optional; default 50)
- ⭐ **rating, ownerName, ownerContact, photos** (optional)

📄 **Example document**
```json
{
	"name": "Central Parkade",
	"address": "Main Rd, Panaji, Goa",
	"location": { "_lat": 15.4909, "_long": 73.8278 },
	"totalSpots": 50,
	"availableSpots": 30,
	"managerId": "<authority-uid>",
	"pricePerHour": 50
}
```

### 📋 bookings (collection)
- 🆔 **id** (auto)
- 👤 **userId**: string (driver uid)
- 🅿️ **parkingLotId**: string
- 👨‍💼 **managerId**: string | null (authority uid managing the lot)
- 📊 **status**: one of pending_arrival | active | in_parking | completed | cancelled | no_show
- 📅 **createdAt**: Timestamp
- ⏰ **startTime**: Date/Timestamp
- ⏰ **endTime**: Date/Timestamp
- 📅 **isAdvanceBooking**: boolean
- ⏰ **graceExpiryTime**: Date/Timestamp (no‑show cutoff)
- ✅ **arrivalConfirmed**: boolean
- 💰 **amount, pricePerHour, basePrice, surgeMultiplier, isSurgePricing**
- 📱 **qrCodeData**: string (JSON payload with bookingId, userId, parkingLotId, uniqueId, timestamp, version)
- 🚪 **entryScanned, exitScanned**: boolean
- ⏰ **entryTime, exitTime**: Timestamp
- 📝 **parkingLotName, parkingLotAddress, duration, userEmail, userName, deviceType, bookingSource**

### 👥 users (collection)
- 🆔 **id**: auth uid
- 📧 **email**: string
- 👥 **role**: "driver" | "authority"
- 📅 **createdAt**: Timestamp
- 🔄 **migratedFromOldSystem**: boolean (optional)

—

## 🔄 Key Workflows

### 🚗 Driver Booking Flow
1. 🔍 **Search** with natural language or choose a place via autocomplete
2. 🗺️ **Calculate route** and apply distance filter to see nearby lots
3. 📍 **Open a lot's info window** and Book Now or choose Advance Booking
4. ✅ **Booking is validated**, dynamic price computed, and a record is written to Firestore
5. 📱 **QR code is generated**; show it at entry and exit
6. 📊 **Live Bookings panel** updates in real time; you can cancel/end

### 🏢 Authority QR Scan Flow
1. 🔐 **Log in to the Authority Dashboard**
2. 📷 **Use Scan Entry QR**: 
   - Validates QR code uniqueness and parking lot match
   - Sets booking status → in_parking; decrements availableSpots
   - Prevents duplicate entry scans with detailed error messages
3. 📷 **Use Scan Exit QR**: 
   - Validates entry was scanned first
   - Sets booking status → completed; increments availableSpots  
   - Prevents duplicate exit scans and shows scan history
4. ✅ **Confirm Arrival** is also available for bookings in pending_arrival

### ➕ Add a Parking Lot
- 📊 From Authority Dashboard → Add New Parking Lot (uses a GeoPoint)
- 🗄️ Or add directly in Firestore with the fields listed above

—

## 🔒 QR Code Security Features

### 🛡️ Unique QR Code Generation
Each booking generates a QR code with:
- 🆔 **Unique Booking ID**: Links to specific booking record
- ⏰ **Timestamp**: When the booking was created  
- 🔑 **Unique Identifier**: Booking ID + timestamp + random string
- 🅿️ **Parking Lot ID**: Validates scan location
- 👤 **User Information**: Driver name and ID for verification
- 📱 **Version Control**: Future compatibility support

### 🔍 Scan Validation Process
1. **QR Code Parsing**: Validates JSON format and required fields
2. **Booking Lookup**: Finds booking in database or real-time cache
3. **Parking Lot Validation**: Ensures QR matches scan location
4. **Uniqueness Check**: Prevents reuse of QR codes across bookings
5. **Scan Status Validation**: Entry must precede exit; prevents duplicate scans
6. **Detailed Error Messages**: Clear explanations for any validation failures

### 🚨 Security Protections
- ❌ **Prevents QR Code Reuse**: Each QR is tied to one specific booking
- 🏢 **Location Validation**: QR codes only work at their designated parking lot
- ⏱️ **Temporal Validation**: QR codes include booking time validation
- 🔄 **State Management**: Tracks entry/exit status to prevent duplicate actions
- 📝 **Audit Trail**: Logs all scan attempts with detailed error reporting

—

## 🔧 Troubleshooting
- 🗺️ **Map doesn't load**: verify VITE_GOOGLE_MAPS_API_KEY and that Maps + Places APIs are enabled with billing
- 📍 **Geolocation denied**: allow browser location; HTTPS is required for precise location
- ⚠️ **"failed-precondition/index" errors**: deploy indexes listed in `firestore.indexes.json`
- 🚫 **Permission denied**: your user role may be missing; ensure a `users/{uid}` doc exists with role driver/authority
- 📊 **Analytics warnings in local dev**: `getAnalytics` requires a measurement ID and a browser context; safe to ignore if not configured
- 📱 **QR code "already scanned" errors**: Each QR code is unique per booking; ensure you're scanning the correct QR for the active booking
- 🔒 **QR validation failures**: QR codes contain parking lot validation; ensure you're scanning at the correct location

—

## 🚀 Build and Deploy

### 👀 Local Production Preview
```powershell
npm run build; npm run preview
```

### 🔥 Firebase Hosting (optional)
**1)** 📦 Install Firebase CLI if you don't have it
```powershell
npm install -g firebase-tools
```
**2)** 🔐 Login and select your project
```powershell
firebase login; firebase use <your-project-id>
```
**3)** 🚀 Deploy rules and indexes (and hosting if configured in `firebase.json`)
```powershell
firebase deploy --only firestore:rules,firestore:indexes,hosting
```

—

## 🗺️ Roadmap
- 💳 **Payments integration** and billing receipts
- 📊 **Rich analytics** (revenue, peak hours, heat maps)
- 🔔 **Push notifications** and reminders
- ⭐ **Reviews and ratings**, amenities and pricing filters
- 🧭 **Multi‑lot navigation** and ETA‑aware suggestions
- 🛠️ **Admin tooling** and audit logs

—

## 🏆 Credits
Built by the **PIXEL_WARRIORS** team for **INFOFEST**. Made with ❤️ using React, Firebase, and Google Maps.
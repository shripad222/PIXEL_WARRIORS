# Authentication System Implementation Guide

## Overview
This implementation adds a comprehensive authentication system with separate flows for **Drivers** and **Authorities**.

## File Structure

### New Pages Created
1. **LandingPage.jsx** - Initial page where users choose their role
2. **AuthorityPortal.jsx** - Authority entry portal
3. **AuthorityLogin.jsx** - Authority login page
4. **AuthorityRegister.jsx** - Authority registration page
5. **AuthorityDashboard.jsx** - Authority management dashboard

### Existing Pages (Driver)
1. **Login.jsx** - Driver login page
2. **Register.jsx** - Driver registration page
3. **App.jsx** - Driver main interface (parking search)

## Routes

### Landing & Role Selection
- `/` - LandingPage (choose Driver or Authority)

### Driver Routes
- `/login` - Driver login
- `/register` - Driver registration
- `/driver` - Driver dashboard (protected route)

### Authority Routes
- `/authority-portal` - Authority entry portal
- `/authority-login` - Authority login
- `/authority-register` - Authority registration
- `/authority-dashboard` - Authority dashboard (protected route)

## User Flow

### Driver Flow
1. User lands on `/` (LandingPage)
2. Clicks "Driver" button
3. Redirected to `/login`
4. Can login with email/password or Google
5. After login, redirected to `/driver` (parking search interface)
6. Driver can search parking, view map, calculate routes

### Authority Flow
1. User lands on `/` (LandingPage)
2. Clicks "Authority" button
3. Redirected to `/authority-portal`
4. Chooses "Login" or "Register"
5. For registration:
   - Fills in: Name, Organization, Email, Password
   - User document created in Firestore with `role: 'authority'`
6. After login, system checks if user has `role: 'authority'` in Firestore
7. Redirected to `/authority-dashboard`
8. Authority can:
   - View analytics (total capacity, occupancy %)
   - Manage parking lots (add new, update spots)
   - View live bookings

## Database Structure

### Users Collection (`users`)
```javascript
{
  uid: "user-uid",
  name: "John Doe",
  email: "john@example.com",
  role: "driver" | "authority",
  organization: "City Parking Authority", // Only for authorities
  createdAt: Timestamp
}
```

### Parking Lots Collection (`parkingLots`)
```javascript
{
  name: "Main Street Parking",
  address: "123 Main St, Goa",
  totalSpots: 100,
  availableSpots: 45,
  location: GeoPoint(lat, lng),
  managerId: "authority-uid",
  rating: 4.5
}
```

### Bookings Collection (`bookings`)
```javascript
{
  driverId: "driver-uid",
  managerId: "authority-uid",
  lotName: "Main Street Parking",
  duration: 2, // hours
  createdAt: Timestamp
}
```

## Authentication Security

### Driver Authentication
- Email/password registration with Firebase Auth
- Google OAuth signin
- Protected routes using ProtectedRoute component
- Role stored in `localStorage` (for UI) and Firestore (for security)

### Authority Authentication
- Email/password registration with Firebase Auth
- Role verification: checks Firestore for `role: 'authority'`
- If non-authority user tries to access authority dashboard, they're signed out
- Protected routes using ProtectedRoute component

## Key Features

### For Drivers
✅ Search parking by location
✅ AI-powered route calculation (Gemini)
✅ Distance-based filtering (500m, 1km, show all)
✅ Real-time parking availability
✅ Get directions to parking lots
✅ Interactive map with markers

### For Authorities
✅ Analytics dashboard (capacity, occupancy)
✅ Add new parking lots with coordinates
✅ Update parking spot availability (+/- buttons)
✅ View live bookings
✅ Occupancy trend charts (sample data)
✅ Multi-lot management

## Styling
- Both flows use the same **Auth.css** for consistent styling
- Authority pages use green accent color (#10b981)
- Driver pages use blue accent color (#2563eb)
- Responsive design with mobile support

## Environment Variables Required
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
VITE_GOOGLE_MAPS_API_KEY=
```

## How to Test

### Test Driver Flow
1. Navigate to `http://localhost:5173/`
2. Click "Driver"
3. Click "Register here"
4. Fill form and register
5. After login, you should see the parking map interface

### Test Authority Flow
1. Navigate to `http://localhost:5173/`
2. Click "Authority"
3. Click "Register as Authority"
4. Fill form with organization name
5. After login, you should see the authority dashboard
6. Try adding a parking lot
7. Try updating available spots

## Notes
- Driver and Authority accounts are completely separate
- Authorities cannot access driver interface
- Drivers cannot access authority dashboard
- All routes are protected with authentication
- Firebase security rules should be updated to match this structure

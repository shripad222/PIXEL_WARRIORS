# Smart Car Parking Availability and Management System

A modern web application built with React and Firebase that helps drivers find available parking spaces in real-time and enables authorities to manage parking facilities efficiently.

## 🚀 Features

### For Drivers
- **Real-time Location Tracking**: Automatically detects your current location
- **Smart Search**: Use natural language queries like "parking near Panjim bus stand"
- **AI-Powered Search**: Gemini AI parses your queries to understand intent
- **Interactive Map**: Google Maps integration with live parking availability
- **Visual Indicators**: 
  - 🔵 Blue marker = Your location
  - 🟢 Green marker = Available parking
  - 🔴 Red marker = Full parking
- **Radius Filtering**: Search within 500m or 1km radius
- **Detailed Info**: Hover over markers to see parking lot details

### For Authorities (Coming Soon)
- Manage parking lot information
- Update availability in real-time
- View analytics and usage statistics

## 🛠️ Tech Stack

- **Frontend**: React 19 with Hooks
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Custom CSS
- **Maps**: Google Maps API (@react-google-maps/api)
- **Backend**: Firebase
  - Firestore (Database)
  - Authentication (Anonymous sign-in)
  - Vertex AI (Gemini 2.0 Flash)
- **Notifications**: react-hot-toast
- **Icons**: react-icons

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Firebase project with Firestore and Vertex AI enabled
- Google Maps API key

## 🔧 Installation

1. **Clone the repository**
   ```bash
   cd PIXEL_WARRIORS
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Variables**
   
   The `.env` file is already configured with the project's API keys:
   ```
   VITE_FIREBASE_API_KEY
   VITE_FIREBASE_AUTH_DOMAIN
   VITE_FIREBASE_PROJECT_ID
   VITE_FIREBASE_STORAGE_BUCKET
   VITE_FIREBASE_MESSAGING_SENDER_ID
   VITE_FIREBASE_APP_ID
   VITE_FIREBASE_MEASUREMENT_ID
   VITE_GOOGLE_MAPS_API_KEY
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to `http://localhost:5173`

## 🗄️ Firestore Database Structure

### Collection: `parkingLots`

Each document should have:
```javascript
{
  name: "Parking Lot Name",
  address: "Full Address",
  lat: 15.496777,  // Latitude (number)
  lng: 73.827827,  // Longitude (number)
  totalSpots: 50,  // Total parking spaces (number)
  availableSpots: 30  // Currently available spaces (number)
}
```

## 🎨 UI/UX Features

- Modern, clean design with blue, gray, and white color scheme
- Responsive layout for mobile and desktop
- Smooth animations and transitions
- Interactive hover effects on map markers
- Clear visual feedback for all actions
- Professional gradient backgrounds

## 🔐 Authentication

The app uses Firebase Anonymous Authentication as a fallback for quick access:
- No registration required
- Instant access as Driver or Authority
- Secure connection to Firebase services

## 📱 Usage

### As a Driver:

1. Click "Login as Driver" on the welcome screen
2. Allow location access when prompted
3. Use the search bar to find parking:
   - Type a location or landmark
   - Use natural language (e.g., "find parking near beach")
   - Use Google Places autocomplete
4. Select search radius (500m or 1km)
5. View available parking on the map
6. Hover over markers to see details
7. Click markers for more information

### Search Examples:
- "parking near Panjim bus stand"
- "find parking at Miramar beach"
- "available parking spots in Panaji"

## 🚧 Development

### Project Structure
```
PIXEL_WARRIORS/
├── src/
│   ├── App.jsx          # Main application component
│   ├── App.css          # Component styles
│   ├── firebase.js      # Firebase configuration
│   ├── main.jsx         # React entry point
│   └── index.css        # Global styles
├── .env                 # Environment variables
├── index.html           # HTML template
├── package.json         # Dependencies
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind configuration
└── postcss.config.js    # PostCSS configuration
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🔄 Future Enhancements

- [ ] Authority dashboard for managing parking lots
- [ ] Real-time availability updates via WebSocket
- [ ] Booking/reservation system
- [ ] Payment integration
- [ ] User profiles and history
- [ ] Navigation to selected parking lot
- [ ] Push notifications for availability
- [ ] Advanced filtering (price, type, amenities)
- [ ] Reviews and ratings

## 🐛 Troubleshooting

### Map not loading
- Check if Google Maps API key is valid
- Ensure billing is enabled on Google Cloud Console
- Check browser console for errors

### Location not detected
- Enable location services in browser settings
- Check HTTPS connection (required for geolocation)

### No parking lots showing
- Verify Firestore collection name is "parkingLots"
- Check if documents have correct lat/lng fields
- Ensure Firebase rules allow read access

## 📄 License

This project is part of INFOFEST Technothon 2025.

## 👥 Team

PIXEL_WARRIORS

---

Built with ❤️ using React, Firebase, and Google Maps

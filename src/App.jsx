import { useState, useCallback, useEffect } from "react";
import { geminiModel, db, signInAnonymousUser } from "./firebase";
import { collection, getDocs } from "firebase/firestore";
import "./App.css";
import toast, { Toaster } from "react-hot-toast";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  Autocomplete,
  InfoWindow,
} from "@react-google-maps/api";
import { FaParking, FaCar, FaMapMarkerAlt } from "react-icons/fa";

const containerStyle = {
  width: "100%",
  height: "600px",
};

// Center on Goa
const center = {
  lat: 15.496777,
  lng: 73.827827,
};

function App() {
  // Authentication state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType, setUserType] = useState(null); // 'driver' or 'authority'

  // Search and location states
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [searchRadius, setSearchRadius] = useState(500); // Default 500m

  // Parking lot states
  const [parkingLots, setParkingLots] = useState([]);
  const [activeMarker, setActiveMarker] = useState(null);

  // Map states
  const [map, setMap] = useState(null);
  const [autocomplete, setAutocomplete] = useState(null);

  // Google Maps API loader
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["places"],
  });

  // Get user's current location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);
          console.log("User location obtained:", location);
        },
        (error) => {
          console.error("Error getting user's location:", error);
          toast.error("Could not get your location. Please enable location services.");
        }
      );
    } else {
      toast.error("Geolocation is not supported by your browser.");
    }
  }, []);

  // Handle login as driver
  const handleDriverLogin = async () => {
    try {
      await signInAnonymousUser();
      setUserType("driver");
      setIsLoggedIn(true);
      toast.success("Logged in as Driver");
    } catch (error) {
      toast.error("Login failed. Please try again.");
      console.error("Login error:", error);
    }
  };

  // Handle login as authority
  const handleAuthorityLogin = async () => {
    try {
      await signInAnonymousUser();
      setUserType("authority");
      setIsLoggedIn(true);
      toast.success("Logged in as Authority");
    } catch (error) {
      toast.error("Login failed. Please try again.");
      console.error("Login error:", error);
    }
  };

  // Fetch parking lots from Firestore (correctly parsing GeoPoint)
  const fetchParkingLots = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "parkingLots"));
      const lots = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();

        // Prefer GeoPoint in data.location; fallback to numeric lat/lng if present
        let lat;
        let lng;
        if (
          data?.location &&
          typeof data.location.latitude === "number" &&
          typeof data.location.longitude === "number"
        ) {
          lat = data.location.latitude;
          lng = data.location.longitude;
        } else if (
          typeof data?.lat === "number" &&
          typeof data?.lng === "number"
        ) {
          lat = data.lat;
          lng = data.lng;
        } else {
          console.warn(
            `Skipping parking lot ${docSnap.id} due to missing or invalid location`
          );
          return; // skip this doc
        }

        lots.push({
          id: docSnap.id,
          ...data,
          name: data.name || "Unnamed Parking Lot",
          address: data.address || "No address",
          lat,
          lng,
          totalSpots: data.totalSpots || 0,
          availableSpots: data.availableSpots || 0,
        });
      });

      setParkingLots(lots);
      console.log("Parking lots fetched:", lots);

      if (lots.length === 0) {
        toast.info("No parking lots found in the database.");
      }
    } catch (error) {
      console.error("Error fetching parking lots:", error);
      toast.error("Failed to fetch parking lots.");
    }
  };

  // Handle search with AI parsing
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a search query.");
      return;
    }

    try {
      toast.success("Processing your search...");
      
      // Use Gemini AI to parse natural language query
      const prompt = `Extract the destination from this parking search query: "${searchQuery}". 
      Return only a JSON object in this format:
      {
        "destination": "location name"
      }
      If no clear destination is found, return the query as-is.`;
      
      const result = await geminiModel.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      // Try to parse JSON from response
      let parsedDestination = searchQuery;
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          parsedDestination = parsed.destination || searchQuery;
        }
      } catch (e) {
        console.log("Could not parse AI response, using original query");
      }
      
      console.log("Parsed destination:", parsedDestination);
      setDestination(parsedDestination);
      
      // Fetch parking lots
      await fetchParkingLots();
      
      toast.success(`Searching for parking near ${parsedDestination}`);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Search failed. Please try again.");
    }
  };

  // Handle autocomplete place selection
  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry) {
        setDestination(place.formatted_address || place.name);
        if (map) {
          map.panTo(place.geometry.location);
          map.setZoom(15);
        }
      }
    }
  };

  // Map load callback
  const onLoad = useCallback((map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Load autocomplete
  const onAutocompleteLoad = (autocompleteInstance) => {
    setAutocomplete(autocompleteInstance);
  };

  // After successful anonymous sign-in, load parking lots
  useEffect(() => {
    if (isLoggedIn) {
      fetchParkingLots();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <Toaster />
        <div className="login-card">
          <div className="login-header">
            <FaParking className="login-icon" />
            <h1>Smart Car Parking System</h1>
            <p>Find and manage parking spaces efficiently</p>
          </div>
          <div className="login-buttons">
            <button className="login-btn driver-btn" onClick={handleDriverLogin}>
              <FaCar className="btn-icon" />
              Login as Driver
            </button>
            <button className="login-btn authority-btn" onClick={handleAuthorityLogin}>
              <FaMapMarkerAlt className="btn-icon" />
              Login as Authority
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Driver Main View
  return (
    <div className="app-container">
      <Toaster />
      
      <div className="header">
        <div className="header-content">
          <FaParking className="header-icon" />
          <h1>Smart Parking System</h1>
          <span className="user-badge">{userType === "driver" ? "Driver" : "Authority"}</span>
        </div>
      </div>

      <div className="search-container">
        {isLoaded && (
          <Autocomplete
            onLoad={onAutocompleteLoad}
            onPlaceChanged={onPlaceChanged}
          >
            <input
              className="search-input"
              type="text"
              placeholder="Search for parking (e.g., 'parking near Panjim bus stand')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </Autocomplete>
        )}
        <button className="search-button" onClick={handleSearch}>
          Search Parking
        </button>
        
        <div className="radius-filters">
          <span className="filter-label">Search Radius:</span>
          <button
            className={`radius-btn ${searchRadius === 500 ? "active" : ""}`}
            onClick={() => setSearchRadius(500)}
          >
            500m
          </button>
          <button
            className={`radius-btn ${searchRadius === 1000 ? "active" : ""}`}
            onClick={() => setSearchRadius(1000)}
          >
            1km
          </button>
        </div>
      </div>

      {destination && (
        <div className="info-bar">
          <div className="info-item">
            <span className="info-label">Searching near:</span>
            <span className="info-value">{destination}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Found:</span>
            <span className="info-value">{parkingLots.length} parking lots</span>
          </div>
        </div>
      )}

      <div className="map-container">
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={userLocation || center}
            zoom={userLocation ? 14 : 10}
            onLoad={onLoad}
            onUnmount={onUnmount}
          >
            {/* User location marker (blue dot) */}
            {userLocation && (
              <Marker
                position={userLocation}
                icon={{
                  url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                  scaledSize: new window.google.maps.Size(40, 40),
                }}
                title="Your Location"
              />
            )}

            {/* Parking lot markers */}
            {parkingLots.map((lot, idx) => (
              <Marker
                key={lot.id}
                position={{ lat: lot.lat, lng: lot.lng }}
                icon={{
                  url: lot.availableSpots > 0
                    ? "https://maps.google.com/mapfiles/ms/icons/green-dot.png"
                    : "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
                  scaledSize: new window.google.maps.Size(40, 40),
                }}
                onMouseOver={() => setActiveMarker(lot.id)}
                onMouseOut={() => setActiveMarker(null)}
                onClick={() => setActiveMarker(lot.id)}
              >
                {activeMarker === lot.id && (
                  <InfoWindow onCloseClick={() => setActiveMarker(null)}>
                    <div className="info-window">
                      <h3 className="info-window-title">{lot.name}</h3>
                      <p className="info-window-address">{lot.address}</p>
                      <div className="info-window-spots">
                        <span className={lot.availableSpots > 0 ? "spots-available" : "spots-full"}>
                          {lot.availableSpots} / {lot.totalSpots} spots available
                        </span>
                      </div>
                      <div className="info-window-status">
                        {lot.availableSpots > 0 ? (
                          <span className="status-badge available">Available</span>
                        ) : (
                          <span className="status-badge full">Full</span>
                        )}
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </Marker>
            ))}
          </GoogleMap>
        ) : (
          <div className="loading">Loading map...</div>
        )}
      </div>

      <div className="legend">
        <div className="legend-item">
          <div className="legend-marker blue"></div>
          <span>Your Location</span>
        </div>
        <div className="legend-item">
          <div className="legend-marker green"></div>
          <span>Available Parking</span>
        </div>
        <div className="legend-item">
          <div className="legend-marker red"></div>
          <span>Full Parking</span>
        </div>
      </div>
    </div>
  );
}

export default App;

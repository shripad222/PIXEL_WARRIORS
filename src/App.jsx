import { useState, useCallback, useEffect } from "react";
import { geminiModel, db } from "./firebase";
import { collection, getDocs, updateDoc, doc, increment } from "firebase/firestore";
import "./App.css";
import toast, { Toaster } from "react-hot-toast";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  Autocomplete,
  InfoWindow,
  DirectionsRenderer,
} from "@react-google-maps/api";
import { FaParking, FaSignOutAlt } from "react-icons/fa";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";

const containerStyle = {
  width: "100%",
  height: "600px",
};

// Center on Goa
const center = {
  lat: 15.496777,
  lng: 73.827827,
};

// Resolve app identifier for multi-tenant Firestore paths
const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";

// Haversine distance formula to calculate distance in meters
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180; // φ, λ in radians
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // in metres
}

function App() {
  // Authentication state
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const userType = "driver"; // Always driver in this component

  // Search and location states
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [minSearchRadius, setMinSearchRadius] = useState(500); // Minimum 500m
  const [maxSearchRadius, setMaxSearchRadius] = useState(1000); // Maximum 1km
  const [isSearching, setIsSearching] = useState(false);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [showRoute, setShowRoute] = useState(false);

  // Parking lot states
  const [parkingLots, setParkingLots] = useState([]);
  const [activeMarker, setActiveMarker] = useState(null);
  const [allParkingLots, setAllParkingLots] = useState([]);

  // Map states
  const [map, setMap] = useState(null);
  const [autocomplete, setAutocomplete] = useState(null);
  const [directionsResponse, setDirectionsResponse] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null); // {distance, duration}
  
  // AI parsing states
  const [parsedOrigin, setParsedOrigin] = useState(null);
  const [parsedDestination, setParsedDestination] = useState(null);
  const [showRouteButton, setShowRouteButton] = useState(false);

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

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
      // Direct path to parkingLots collection at root level
      const parkingLotsRef = collection(db, "parkingLots");
      const querySnapshot = await getDocs(parkingLotsRef);
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

      setAllParkingLots(lots);
      console.log("Parking lots fetched:", lots);

      if (lots.length === 0) {
        console.log("No parking lots found in the database.");
      } else {
        toast.success(`Loaded ${lots.length} parking lots from database`);
      }
    } catch (error) {
      console.error("Error fetching parking lots:", error);
      console.error("Error details:", error.message);
    }
  };

  // Handle search with AI parsing ONLY (no route calculation)
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a search query.");
      return;
    }

    if (isSearching) {
      return; // Prevent multiple simultaneous searches
    }

    setIsSearching(true);
    setShowRouteButton(false);
    setDirectionsResponse(null);
    setRouteInfo(null);
    setShowRoute(false);

    try {
      toast.success("Processing your search...");

      // Step 1: Ask Gemini to extract BOTH origin and destination
      const prompt = `From the text "${searchQuery}", extract the starting location (origin) and the ending location (destination). Your response MUST be a JSON object.
- If the user specifies where they are starting from, return: {"origin": "STARTING_LOCATION", "destination": "ENDING_LOCATION"}
- If the user does NOT specify a starting location, return: {"origin": "CURRENT_LOCATION", "destination": "ENDING_LOCATION"}

Example 1: "I am at Quepem and want to go to Navelim" -> {"origin": "Quepem", "destination": "Navelim"}
Example 2: "Show me parking near Margao" -> {"origin": "CURRENT_LOCATION", "destination": "Margao"}`;

      const result = await geminiModel.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Parse JSON response to get origin and destination
      let locations = { origin: "CURRENT_LOCATION", destination: searchQuery };
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed && parsed.destination) {
            locations = {
              origin: parsed.origin || "CURRENT_LOCATION",
              destination: String(parsed.destination)
            };
          }
        }
      } catch (e) {
        console.log("Could not parse AI response, using defaults");
      }

      if (!locations.destination) {
        toast.error("Couldn't understand the destination. Please try a clearer query.");
        setIsSearching(false);
        return;
      }

      // Step 2: Check if user location is available when needed
      if (locations.origin === "CURRENT_LOCATION" && !userLocation) {
        toast.error("Current location not available yet. Please allow location access.");
        setIsSearching(false);
        return;
      }

      // Store parsed locations
      setParsedOrigin(locations.origin);
      setParsedDestination(locations.destination);
      setDestination(locations.destination);
      
      // Show the route button
      setShowRouteButton(true);
      setIsSearching(false);
      
      toast.success(`Ready to find route from ${locations.origin === "CURRENT_LOCATION" ? "your location" : locations.origin} to ${locations.destination}`);

    } catch (error) {
      console.error("Search/AI parsing error:", error);
      toast.error("Something went wrong while processing your search. Please try again.");
      setIsSearching(false);
    }
  };

  // Separate function to calculate and display route
  const calculateRoute = async () => {
    // Allow route calc if we have either AI-parsed destination or a manual destination string
    const effectiveDestination = parsedDestination || destination;
    if (!effectiveDestination) {
      toast.error("Please enter a destination (or select a place) first.");
      return;
    }

    setIsCalculatingRoute(true);

    try {
      toast.success("Calculating route...");

      // Determine the route origin and destination
      // Prefer CURRENT_LOCATION or parsed origin; otherwise default to user's location
      const routeOrigin = !parsedOrigin || parsedOrigin === "CURRENT_LOCATION"
        ? userLocation
        : `${parsedOrigin}, Goa`;
      const routeDestination = `${effectiveDestination}, Goa`;

      // Calculate the route using Google Maps DirectionsService
      const directionsService = new window.google.maps.DirectionsService();

      directionsService.route(
        {
          origin: routeOrigin,
          destination: routeDestination,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (results, status) => {
          setIsCalculatingRoute(false);

          if (status === "OK") {
            setDirectionsResponse(results);
            setShowRoute(true);

            // Extract route information
            const leg = results.routes[0].legs[0];
            setRouteInfo({
              distance: leg.distance.text,
              duration: leg.duration.text
            });

            // If destination came from manual input, persist it into parsedDestination for UI
            if (!parsedDestination) {
              setParsedDestination(effectiveDestination);
            }

            // Store destination coordinates for parking lot filtering
            const destinationLatLng = leg.end_location;
            setDestinationCoords({
              lat: destinationLatLng.lat(),
              lng: destinationLatLng.lng()
            });

            console.log("Route calculated successfully");
            console.log("Destination coordinates:", destinationLatLng.lat(), destinationLatLng.lng());

            // Fit map to show entire route
            if (map && results.routes[0]) {
              const bounds = new window.google.maps.LatLngBounds();
              
              // Add route bounds
              bounds.union(results.routes[0].bounds);
              
              // Add user location
              if (userLocation) {
                bounds.extend(new window.google.maps.LatLng(userLocation.lat, userLocation.lng));
              }
              
              map.fitBounds(bounds);
            }

            // NOW IMMEDIATELY FILTER AND SHOW PARKING LOTS
            if (allParkingLots.length > 0) {
              // If "Show All" is active (maxSearchRadius is Infinity), show all parking lots
              const nearbyLots = maxSearchRadius === Infinity 
                ? allParkingLots 
                : allParkingLots.filter((lot) => {
                    const distance = getDistance(destinationLatLng.lat(), destinationLatLng.lng(), lot.lat, lot.lng);
                    console.log(`Distance to ${lot.name}: ${distance}m`);
                    // Show parking lots WITHIN the maxSearchRadius
                    return distance <= maxSearchRadius;
                  });
              
              if (maxSearchRadius === Infinity) {
                console.log(`Showing all ${nearbyLots.length} parking lots`);
              } else {
                console.log(`Found ${nearbyLots.length} parking lots within ${maxSearchRadius}m`);
              }
              
              setParkingLots(nearbyLots);
              
              if (nearbyLots.length === 0) {
                toast.info(`No parking lots found within ${maxSearchRadius}m. Try increasing the distance range.`);
              } else {
                if (maxSearchRadius === Infinity) {
                  toast.success(`Showing all ${nearbyLots.length} parking lots!`);
                } else {
                  toast.success(`Found ${nearbyLots.length} parking lots near your destination!`);
                }
              }
            } else {
              console.log("No parking lots available in database.");
            }

            toast.success(`Route found! ${leg.distance.text}, ${leg.duration.text}`);
          } else {
            console.error("Directions request failed:", status, results);
            
            // Handle different error cases
            if (status === "ZERO_RESULTS") {
              toast.error("No route found to that destination. Please try a different location.");
            } else if (status === "NOT_FOUND") {
              toast.error("Could not find the specified location. Please check your destination.");
            } else if (status === "INVALID_REQUEST") {
              toast.error("Invalid route request. Please try rephrasing your search.");
            } else {
              toast.error("Couldn't calculate a route to that destination. Please try again.");
            }
          }
        }
      );
    } catch (error) {
      console.error("Route calculation error:", error);
      toast.error("Something went wrong while calculating the route. Please try again.");
      setIsCalculatingRoute(false);
    }
  };

  // Fetch and filter parking lots based on destination
  const fetchAndFilterParkingLots = useCallback(async (destinationLatLng, options = { skipFetch: false }) => {
    try {
      let workingLots = allParkingLots;

      if (!options?.skipFetch) {
        // Direct path to parkingLots collection at root level
        const parkingLotsRef = collection(db, "parkingLots");
        const querySnapshot = await getDocs(parkingLotsRef);
        const fetchedLots = [];

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
            console.warn(`Skipping parking lot ${docSnap.id} due to missing or invalid location`);
            return;
          }

          fetchedLots.push({
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

        workingLots = fetchedLots;
        setAllParkingLots(fetchedLots);
      } else if (options?.skipFetch && workingLots.length === 0) {
        return;
      }

      if (!destinationLatLng) {
        setParkingLots(workingLots);
        return;
      }

      const destLat =
        typeof destinationLatLng.lat === "function"
          ? destinationLatLng.lat()
          : destinationLatLng.lat;
      const destLng =
        typeof destinationLatLng.lng === "function"
          ? destinationLatLng.lng()
          : destinationLatLng.lng;

      if (
        typeof destLat !== "number" ||
        typeof destLng !== "number" ||
        Number.isNaN(destLat) ||
        Number.isNaN(destLng)
      ) {
        console.warn("Invalid destination coordinates supplied for filtering");
        setParkingLots(workingLots);
        return;
      }

      // If "Show All" is active (maxSearchRadius is Infinity), show all parking lots
      const nearbyLots = maxSearchRadius === Infinity
        ? workingLots
        : workingLots.filter((lot) => {
            const distance = getDistance(destLat, destLng, lot.lat, lot.lng);
            console.log(`Distance to ${lot.name}: ${distance}m`);
            // Filter parking lots within the search radius
            return distance <= maxSearchRadius;
          });

      if (maxSearchRadius === Infinity) {
        console.log(`Showing all ${nearbyLots.length} parking lots`);
      } else {
        console.log(`Found ${nearbyLots.length} parking lots within ${maxSearchRadius}m of destination`);
      }
      
      setParkingLots(nearbyLots);

      if (!options?.skipFetch) {
        if (nearbyLots.length === 0) {
          toast.info(`No parking lots found within ${maxSearchRadius}m of ${parsedDestination}. Try a wider search.`);
        } else {
          if (maxSearchRadius === Infinity) {
            toast.success(`Showing all ${nearbyLots.length} parking lots`);
          } else {
            toast.success(`Found ${nearbyLots.length} parking lots near ${parsedDestination}`);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching/filtering parking lots:", error);
      // Only show error toast if it's an unexpected error during route calculation, not on initial load
      if (!options?.skipFetch && options?.showErrorToast !== false) {
        console.log("Parking lots may not be available yet. Continue with your route.");
      }
    }
  }, [allParkingLots, parsedDestination, minSearchRadius, maxSearchRadius]);

  const updateSlot = async (lot, delta) => {
    if (!lot) {
      return;
    }

    const projectedAvailable = lot.availableSpots + delta;
    if (projectedAvailable < 0 || projectedAvailable > lot.totalSpots) {
      toast.error("Slot update would exceed allowed limits.");
      return;
    }

    try {
      // Direct path to parkingLots collection at root level
      const lotRef = doc(db, "parkingLots", lot.id);

      await updateDoc(lotRef, {
        availableSpots: increment(delta),
      });

      const applyLocalUpdate = (collectionToUpdate) =>
        collectionToUpdate.map((existingLot) =>
          existingLot.id === lot.id
            ? {
                ...existingLot,
                availableSpots: Math.min(
                  existingLot.totalSpots,
                  Math.max(0, existingLot.availableSpots + delta)
                ),
              }
            : existingLot
        );

      setParkingLots((prev) => applyLocalUpdate(prev));
      setAllParkingLots((prev) => applyLocalUpdate(prev));

      toast.success(delta < 0 ? "Slot occupied." : "Slot freed.");
    } catch (error) {
      console.error("Failed to update slot availability:", error);
      toast.error("Failed to update slot availability.");
    }
  };

  // Clear route and reset state
  const clearRoute = () => {
    setDirectionsResponse(null);
    setRouteInfo(null);
    setShowRoute(false);
    setDestinationCoords(null);
    // Show all parking lots again when route is cleared
    setParkingLots(allParkingLots);
    setParsedOrigin(null);
    setParsedDestination(null);
    setDestination(null);
    setShowRouteButton(false);
    toast.success("Route cleared");
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
    if (user) {
      fetchParkingLots();
    }
  }, [user]);

  useEffect(() => {
    if (!destinationCoords) return;
    if (allParkingLots.length === 0) return;

    fetchAndFilterParkingLots(destinationCoords, { skipFetch: true }).catch((error) =>
      console.error("Error re-filtering parking lots:", error)
    );
  }, [minSearchRadius, maxSearchRadius, destinationCoords, allParkingLots, fetchAndFilterParkingLots]);

  // Driver Main View (rendered directly since auth is handled by ProtectedRoute)
  return (
    <div className="app-container">
      <Toaster />
      
      <div className="header">
        <div className="header-content">
          <FaParking className="header-icon" />
          <h1>Smart Parking System</h1>
          <span className="user-badge">Driver</span>
          <button className="clear-button" style={{marginLeft: 'auto'}} onClick={handleLogout}>
            <FaSignOutAlt style={{marginRight: '0.5rem'}} /> Logout
          </button>
        </div>
      </div>

  <div className="search-container controls-sticky">
        {isLoaded && (
          <Autocomplete
            onLoad={onAutocompleteLoad}
            onPlaceChanged={onPlaceChanged}
          >
            <input
              className="search-input"
              type="text"
              placeholder="Search for parking (e.g., 'parking near Panjim bus stand' or 'I am at Quepem, want to go to Panaji')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          </Autocomplete>
        )}
        
        <div className="button-group">
          <button 
            className="search-button" 
            onClick={handleSearch}
            disabled={isSearching || !userLocation}
          >
            {isSearching ? "Processing..." : "Search Parking"}
          </button>

          <button
            className="toggle-route-button"
            onClick={() => setShowRoute((prev) => !prev)}
            disabled={!directionsResponse}
          >
            {directionsResponse ? (showRoute ? "Hide Route" : "Show Route") : "Show Route"}
          </button>

          <button 
            className="route-button" 
            onClick={calculateRoute}
            disabled={isCalculatingRoute || !(parsedDestination || destination) || !userLocation}
          >
            {isCalculatingRoute ? "Calculating..." : "Find Route"}
          </button>

          {directionsResponse && (
            <button 
              className="clear-button" 
              onClick={clearRoute}
            >
              Clear Route
            </button>
          )}
        </div>
        
        <div className="radius-filters">
          <span className="filter-label">Distance Range:</span>
          <button
            className={`radius-btn ${minSearchRadius === 500 && maxSearchRadius === 500 ? "active" : ""}`}
            onClick={() => {
              setMinSearchRadius(500);
              setMaxSearchRadius(500);
            }}
            title="Show parking within 500m only"
          >
            500m only
          </button>
          <button
            className={`radius-btn ${minSearchRadius === 500 && maxSearchRadius === 1000 ? "active" : ""}`}
            onClick={() => {
              setMinSearchRadius(500);
              setMaxSearchRadius(1000);
            }}
            title="Show parking within 500m to 1km"
          >
            500m - 1km
          </button>
          <button
            className={`radius-btn ${minSearchRadius === 1000 && maxSearchRadius === 1000 ? "active" : ""}`}
            onClick={() => {
              setMinSearchRadius(1000);
              setMaxSearchRadius(1000);
            }}
            title="Show parking within 1km only"
          >
            1km only
          </button>
          <button
            className={`radius-btn ${maxSearchRadius === Infinity ? "active" : ""}`}
            onClick={() => {
              setMinSearchRadius(0);
              setMaxSearchRadius(Infinity);
            }}
            title="Show all parking lots regardless of distance"
          >
            Show All
          </button>
        </div>

        {!userLocation && (
          <div className="info-value" style={{marginTop: '0.5rem'}}>
            Tip: allow location access to enable Search and Find Route.
          </div>
        )}
      </div>

      {(destination || showRouteButton) && (
        <div className="info-bar">
          {parsedOrigin && parsedDestination && (
            <>
              <div className="info-item">
                <span className="info-label">From:</span>
                <span className="info-value">{parsedOrigin === "CURRENT_LOCATION" ? "Your Location" : parsedOrigin}</span>
              </div>
              <div className="info-item">
                <span className="info-label">To:</span>
                <span className="info-value">{parsedDestination}</span>
              </div>
            </>
          )}
          
          {parkingLots.length > 0 && (
            <div className="info-item">
              <span className="info-label">Found:</span>
              <span className="info-value">{parkingLots.length} parking lots</span>
            </div>
          )}
          
          {routeInfo && (
            <>
              <div className="info-item">
                <span className="info-label">Distance:</span>
                <span className="info-value">{routeInfo.distance}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Duration:</span>
                <span className="info-value">{routeInfo.duration}</span>
              </div>
            </>
          )}
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
            {/* User location marker (blue dot) - ORIGIN */}
            {userLocation && (
              <Marker
                position={userLocation}
                icon={{
                  url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                  scaledSize: new window.google.maps.Size(50, 50),
                }}
                title="Your Location (Origin)"
                zIndex={1000}
              />
            )}

            {/* Destination marker (red dot) - only show if we have destination coordinates */}
            {destinationCoords && (
              <Marker
                position={destinationCoords}
                icon={{
                  url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
                  scaledSize: new window.google.maps.Size(50, 50),
                }}
                title={`Destination: ${parsedDestination}`}
                zIndex={999}
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
                    : "https://maps.google.com/mapfiles/ms/icons/orange-dot.png",
                  scaledSize: new window.google.maps.Size(35, 35),
                }}
                onMouseOver={() => setActiveMarker(lot.id)}
                onClick={() => setActiveMarker(lot.id)}
                zIndex={500}
              >
                {activeMarker === lot.id && (
                  <InfoWindow onCloseClick={() => setActiveMarker(null)}>
                    <div 
                      className="info-window"
                      onMouseEnter={() => setActiveMarker(lot.id)}
                      onMouseLeave={() => setActiveMarker(null)}
                    >
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
                      <button
                        className="get-directions-btn"
                        onClick={() => {
                          if (userLocation) {
                            // Calculate route to this parking lot
                            const directionsService = new window.google.maps.DirectionsService();
                            directionsService.route(
                              {
                                origin: userLocation,
                                destination: { lat: lot.lat, lng: lot.lng },
                                travelMode: window.google.maps.TravelMode.DRIVING,
                              },
                              (results, status) => {
                                if (status === "OK") {
                                  setDirectionsResponse(results);
                                  setShowRoute(true);
                                  const leg = results.routes[0].legs[0];
                                  setRouteInfo({
                                    distance: leg.distance.text,
                                    duration: leg.duration.text
                                  });
                                  setParsedOrigin("CURRENT_LOCATION");
                                  setParsedDestination(lot.name);
                                  setDestination(lot.name);
                                  setDestinationCoords({ lat: lot.lat, lng: lot.lng });
                                  toast.success(`Route to ${lot.name}: ${leg.distance.text}, ${leg.duration.text}`);
                                  
                                  // Fit map to show the route
                                  if (map && results.routes[0]) {
                                    const bounds = new window.google.maps.LatLngBounds();
                                    bounds.union(results.routes[0].bounds);
                                    map.fitBounds(bounds);
                                  }
                                } else {
                                  toast.error("Could not calculate route to this parking lot.");
                                }
                              }
                            );
                          } else {
                            toast.error("Your location is not available.");
                          }
                        }}
                        style={{
                          marginTop: '10px',
                          padding: '8px 16px',
                          backgroundColor: '#4285F4',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          width: '100%',
                          justifyContent: 'center'
                        }}
                      >
                        <span style={{ fontSize: '16px' }}>📍</span> Get Directions
                      </button>
                    </div>
                  </InfoWindow>
                )}
              </Marker>
            ))}

            {/* Route visualization - DirectionsRenderer */}
            {directionsResponse && showRoute && (
              <DirectionsRenderer 
                directions={directionsResponse}
                options={{
                  polylineOptions: {
                    strokeColor: "#4285F4",
                    strokeWeight: 6,
                    strokeOpacity: 0.8,
                  },
                  suppressMarkers: true, // We handle markers ourselves
                }}
              />
            )}
          </GoogleMap>
        ) : (
          <div className="loading">Loading map...</div>
        )}
      </div>

      <div className="legend">
        <div className="legend-item">
          <div className="legend-marker blue"></div>
          <span>Your Location (Origin)</span>
        </div>
        <div className="legend-item">
          <div className="legend-marker red"></div>
          <span>Destination</span>
        </div>
        <div className="legend-item">
          <div className="legend-marker green"></div>
          <span>Available Parking</span>
        </div>
        <div className="legend-item">
          <div className="legend-marker orange"></div>
          <span>Full Parking</span>
        </div>
        {showRoute && (
          <div className="legend-item">
            <div className="legend-marker route"></div>
            <span>Driving Route</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

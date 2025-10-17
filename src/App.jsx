import { useState, useCallback, useEffect } from "react";
import { geminiModel, db } from "./firebase";
import { collection, getDocs, updateDoc, doc, increment, addDoc, serverTimestamp, getDoc, query, where, onSnapshot, orderBy } from "firebase/firestore";
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
import { FaParking, FaSignOutAlt, FaClock, FaMapMarkerAlt, FaUser, FaTimes } from "react-icons/fa";
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
  
  // Booking states
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedParkingLot, setSelectedParkingLot] = useState(null);
  const [bookingDuration, setBookingDuration] = useState(1); // hours
  const [bookingStartTime, setBookingStartTime] = useState(""); // Future start time (datetime-local format)
  const [isAdvanceBooking, setIsAdvanceBooking] = useState(false); // Toggle between now and future
  const [isBooking, setIsBooking] = useState(false);
  const [userBookings, setUserBookings] = useState([]); // Live bookings
  const [loadingBookings, setLoadingBookings] = useState(false);

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

  // Fetch and listen to user's live bookings
  const fetchUserBookings = useCallback(() => {
    console.log("🔵 fetchUserBookings called");
    console.log("   - User:", user ? user.uid : "NO USER");
    
    if (!user) {
      console.log("⚠️ No user logged in, clearing bookings");
      setUserBookings([]);
      return;
    }

    setLoadingBookings(true);
    console.log("🔍 Setting up real-time listener for bookings...");

    try {
      // Create a query to get only this user's active bookings
      const bookingsQuery = query(
        collection(db, "bookings"),
        where("userId", "==", user.uid),
        where("status", "==", "active")
        // Note: orderBy removed temporarily to avoid index requirement
        // Will sort in JavaScript after fetching
      );

      // Set up real-time listener
      const unsubscribe = onSnapshot(
        bookingsQuery,
        (snapshot) => {
          const bookings = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            bookings.push({
              id: doc.id,
              ...data,
              // Convert Firestore timestamps to readable format
              createdAt: data.createdAt?.toDate?.() || new Date(),
              startTime: data.startTime instanceof Date ? data.startTime : data.startTime?.toDate?.() || new Date(),
              endTime: data.endTime instanceof Date ? data.endTime : data.endTime?.toDate?.() || new Date(),
            });
          });
          
          // Sort by createdAt in JavaScript (newest first)
          bookings.sort((a, b) => b.createdAt - a.createdAt);
          
          console.log(`✅ Real-time update: Loaded ${bookings.length} active bookings for user ${user.uid}`);
          if (bookings.length > 0) {
            console.log("Booking IDs:", bookings.map(b => b.id));
            console.log("First booking:", bookings[0]);
          } else {
            console.log("⚠️ No bookings found for this user. Check:");
            console.log("   - userId in booking:", "Should be", user.uid);
            console.log("   - status in booking:", "Should be 'active'");
          }
          setUserBookings(bookings);
          setLoadingBookings(false);
        },
        (error) => {
          console.error("❌ Error fetching bookings:", error);
          console.error("Error details:", error.code, error.message);
          if (error.code === 'failed-precondition' || error.message?.includes('index')) {
            console.error("🔥 FIRESTORE INDEX REQUIRED! Run: firebase deploy --only firestore:indexes");
          }
          setLoadingBookings(false);
        }
      );

      // Return cleanup function
      return unsubscribe;
    } catch (error) {
      console.error("Error setting up bookings listener:", error);
      setLoadingBookings(false);
    }
  }, [user]);

  // Cancel/Complete booking
  const handleCancelBooking = async (booking) => {
    if (!confirm(`Cancel booking for ${booking.parkingLotName}?\n\nThis will free up the parking spot.`)) {
      return;
    }

    try {
      // Update booking status
      const bookingRef = doc(db, "bookings", booking.id);
      await updateDoc(bookingRef, {
        status: "cancelled",
        cancelledAt: serverTimestamp(),
      });

      // Free up the parking spot
      const lotRef = doc(db, "parkingLots", booking.parkingLotId);
      await updateDoc(lotRef, {
        availableSpots: increment(1),
      });

      // Update local parking lots state
      const applyLocalUpdate = (collectionToUpdate) =>
        collectionToUpdate.map((existingLot) =>
          existingLot.id === booking.parkingLotId
            ? {
                ...existingLot,
                availableSpots: existingLot.availableSpots + 1,
              }
            : existingLot
        );

      setParkingLots((prev) => applyLocalUpdate(prev));
      setAllParkingLots((prev) => applyLocalUpdate(prev));

      toast.success("Booking cancelled successfully! Parking spot is now available.");
    } catch (error) {
      console.error("Error cancelling booking:", error);
      toast.error("Failed to cancel booking. Please try again.");
    }
  };

  // Check for booking conflicts (prevent double booking)
  const checkBookingConflicts = async (parkingLotId, requestedStartTime, requestedEndTime) => {
    try {
      console.log("🔍 Checking for booking conflicts...");
      console.log("   - Parking Lot:", parkingLotId);
      console.log("   - Requested Start:", requestedStartTime);
      console.log("   - Requested End:", requestedEndTime);

      // Query all active bookings for this parking lot
      const bookingsRef = collection(db, "bookings");
      const q = query(
        bookingsRef,
        where("parkingLotId", "==", parkingLotId),
        where("status", "==", "active")
      );

      const querySnapshot = await getDocs(q);
      
      console.log(`   - Found ${querySnapshot.size} active bookings for this lot`);
      
      // Check if any existing booking overlaps with requested time
      const conflicts = [];
      querySnapshot.forEach((doc) => {
        const booking = doc.data();
        
        // Convert timestamps to Date objects
        let existingStart, existingEnd;
        
        try {
          existingStart = booking.startTime instanceof Date 
            ? booking.startTime 
            : booking.startTime?.toDate?.() || new Date(booking.startTime);
          existingEnd = booking.endTime instanceof Date 
            ? booking.endTime 
            : booking.endTime?.toDate?.() || new Date(booking.endTime);
        } catch (err) {
          console.warn("⚠️ Could not parse booking times for:", doc.id, err);
          return; // Skip this booking
        }

        // Check for time overlap
        // Overlap occurs if: (requestedStart < existingEnd) AND (requestedEnd > existingStart)
        if (requestedStartTime < existingEnd && requestedEndTime > existingStart) {
          conflicts.push({
            bookingId: doc.id,
            userName: booking.userName || "Another user",
            startTime: existingStart,
            endTime: existingEnd,
          });
        }
      });

      if (conflicts.length > 0) {
        console.log("❌ Booking conflicts found:", conflicts);
        return {
          hasConflict: true,
          conflicts: conflicts,
        };
      }

      console.log("✅ No conflicts found");
      return {
        hasConflict: false,
        conflicts: [],
      };

    } catch (error) {
      console.error("❌ Error checking booking conflicts:", error);
      console.error("   Error code:", error.code);
      console.error("   Error message:", error.message);
      
      // If it's an index error, log it but don't prevent booking
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        console.warn("⚠️ Firestore index required for conflict checking.");
        console.warn("   Proceeding with booking (conflict check skipped)");
        return {
          hasConflict: false,
          conflicts: [],
          indexError: true,
        };
      }
      
      // For other errors, re-throw
      throw error;
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

  // Handle booking confirmation
  const handleBooking = async () => {
    // ===== VALIDATION PHASE =====
    
    // 1. Check if user is authenticated
    if (!user) {
      toast.error("You must be logged in to book a parking slot.");
      return;
    }

    // 2. Check if parking lot is selected
    if (!selectedParkingLot) {
      toast.error("No parking lot selected. Please try again.");
      return;
    }

    // 3. Validate parking lot ID
    if (!selectedParkingLot.id) {
      toast.error("Invalid parking lot. Please select a different one.");
      return;
    }

    // 4. Check available spots (pre-booking validation)
    if (selectedParkingLot.availableSpots <= 0) {
      toast.error("No spots available at this parking lot. Please choose another.");
      setShowBookingModal(false);
      return;
    }

    // 5. Validate booking duration
    if (!bookingDuration || bookingDuration < 1 || bookingDuration > 24) {
      toast.error("Please select a valid booking duration (1-24 hours).");
      return;
    }

    // 6. Validate start time for advance booking
    let startTime, endTime;
    const now = new Date();

    if (isAdvanceBooking) {
      // Advance booking - user selected a future time
      if (!bookingStartTime) {
        toast.error("Please select a start time for your booking.");
        return;
      }

      startTime = new Date(bookingStartTime);
      
      // Validate start time is in the future
      if (startTime <= now) {
        toast.error("Start time must be in the future. Please select a later time.");
        return;
      }

      // Validate start time is not too far in the future (e.g., max 7 days)
      const maxFutureDays = 7;
      const maxFutureTime = new Date(now.getTime() + maxFutureDays * 24 * 60 * 60 * 1000);
      if (startTime > maxFutureTime) {
        toast.error(`Start time cannot be more than ${maxFutureDays} days in the future.`);
        return;
      }

      endTime = new Date(startTime.getTime() + bookingDuration * 60 * 60 * 1000);
    } else {
      // Immediate booking - starts now
      startTime = now;
      endTime = new Date(now.getTime() + bookingDuration * 60 * 60 * 1000);
    }

    // 7. Check for booking conflicts (prevent double booking)
    let conflictCheckSkipped = false;
    try {
      const conflictCheck = await checkBookingConflicts(
        selectedParkingLot.id,
        startTime,
        endTime
      );

      // If index error, warn but proceed
      if (conflictCheck.indexError) {
        conflictCheckSkipped = true;
        console.warn("⚠️ Conflict check skipped due to missing Firestore index");
      } else if (conflictCheck.hasConflict) {
        const conflict = conflictCheck.conflicts[0];
        const conflictStartStr = conflict.startTime.toLocaleString('en-IN', {
          dateStyle: 'short',
          timeStyle: 'short'
        });
        const conflictEndStr = conflict.endTime.toLocaleString('en-IN', {
          dateStyle: 'short',
          timeStyle: 'short'
        });

        toast.error(
          `⚠️ Time Slot Already Booked!\n\n` +
          `This parking slot is already reserved by ${conflict.userName}\n` +
          `From: ${conflictStartStr}\n` +
          `To: ${conflictEndStr}\n\n` +
          `Please choose a different time or parking lot.`,
          { duration: 6000 }
        );
        return;
      }
    } catch (error) {
      console.error("❌ Error checking conflicts:", error);
      
      // Show warning but allow booking to continue
      console.warn("⚠️ Proceeding with booking despite conflict check failure");
      conflictCheckSkipped = true;
      
      toast.error(
        "⚠️ Warning: Could not verify slot availability.\n\n" +
        "Proceeding with booking, but there might be conflicts.\n" +
        "Check Firebase Console for index requirements.",
        { duration: 5000 }
      );
      
      // Don't return - allow booking to proceed
    }

    // 8. Calculate booking amount
    const pricePerHour = selectedParkingLot.pricePerHour || 50;
    const totalAmount = bookingDuration * pricePerHour;

    if (totalAmount <= 0 || isNaN(totalAmount)) {
      toast.error("Invalid booking amount. Please try again.");
      return;
    }

    // 9. Confirm booking with user
    const startTimeStr = startTime.toLocaleString('en-IN', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
    const endTimeStr = endTime.toLocaleString('en-IN', {
      dateStyle: 'short',
      timeStyle: 'short'
    });

    const confirmMessage = `Confirm ${isAdvanceBooking ? 'Advance ' : ''}Booking:\n\n` +
      `Parking: ${selectedParkingLot.name}\n` +
      `Start Time: ${startTimeStr}\n` +
      `End Time: ${endTimeStr}\n` +
      `Duration: ${bookingDuration} hour(s)\n` +
      `Amount: ₹${totalAmount}\n\n` +
      `Proceed with booking?`;

    if (!confirm(confirmMessage)) {
      return; // User cancelled
    }

    // ===== BOOKING EXECUTION PHASE =====
    setIsBooking(true);

    try {
      console.log("Starting booking process...");
      console.log("User ID:", user.uid);
      console.log("Parking Lot ID:", selectedParkingLot.id);
      console.log("Duration:", bookingDuration);
      console.log("Start Time:", startTime);
      console.log("End Time:", endTime);
      console.log("Is Advance Booking:", isAdvanceBooking);

      // Step 1: Update available spots (with optimistic locking check)
      const lotRef = doc(db, "parkingLots", selectedParkingLot.id);
      
      // Re-fetch current availability to prevent race conditions
      const lotSnapshot = await getDoc(lotRef);
      if (!lotSnapshot.exists()) {
        throw new Error("Parking lot not found. It may have been removed.");
      }

      const currentAvailableSpots = lotSnapshot.data().availableSpots || 0;
      
      if (currentAvailableSpots <= 0) {
        throw new Error("Sorry, this parking lot just became full. Please choose another.");
      }

      // Update spots
      await updateDoc(lotRef, {
        availableSpots: increment(-1),
      });

      console.log("Parking spot reserved successfully");

      // Step 2: Create booking record with all required fields
      const bookingData = {
        // Required fields (matching Firestore security rules)
        userId: user.uid,
        parkingLotId: selectedParkingLot.id,
        managerId: selectedParkingLot.managerId || null, // Add manager ID for authority dashboard
        status: "active",
        createdAt: serverTimestamp(),
        
        // Time fields - using the calculated start and end times
        startTime: startTime, // Can be now or future time
        endTime: endTime, // Calculated based on duration
        isAdvanceBooking: isAdvanceBooking, // Track if it's advance or immediate
        
        // Additional metadata
        userEmail: user.email || "no-email",
        userName: user.displayName || "Anonymous User",
        parkingLotName: selectedParkingLot.name,
        parkingLotAddress: selectedParkingLot.address,
        duration: bookingDuration,
        amount: totalAmount,
        pricePerHour: pricePerHour,
        
        // Tracking fields
        bookingSource: "web-app",
        deviceType: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? "mobile" : "desktop",
      };

      // Add booking to Firestore
      const bookingsRef = collection(db, "bookings");
      const bookingDoc = await addDoc(bookingsRef, bookingData);

      console.log("✅ Booking created successfully!");
      console.log("   - Booking ID:", bookingDoc.id);
      console.log("   - User ID:", user.uid);
      console.log("   - Parking Lot:", selectedParkingLot.name);
      console.log("   - Manager ID:", selectedParkingLot.managerId || "N/A");
      console.log("   - Status: active");
      console.log("🔄 Real-time listener should detect this change automatically...");

      // Step 3: Update local state to reflect changes immediately
      const applyLocalUpdate = (collectionToUpdate) =>
        collectionToUpdate.map((existingLot) =>
          existingLot.id === selectedParkingLot.id
            ? {
                ...existingLot,
                availableSpots: Math.max(0, existingLot.availableSpots - 1),
              }
            : existingLot
        );

      setParkingLots((prev) => applyLocalUpdate(prev));
      setAllParkingLots((prev) => applyLocalUpdate(prev));

      // Step 4: Close modal and reset state
      setShowBookingModal(false);
      setSelectedParkingLot(null);
      setBookingDuration(1);
      setBookingStartTime("");
      setIsAdvanceBooking(false);
      
      // Success notification with booking details
      const bookingTypeText = isAdvanceBooking ? "Advance Booking" : "Booking";
      toast.success(
        `✅ ${bookingTypeText} Confirmed!\n\n` +
        `Booking ID: ${bookingDoc.id.substring(0, 8)}...\n` +
        `Start: ${startTime.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}\n` +
        `Duration: ${bookingDuration} hour(s)\n` +
        `Amount: ₹${totalAmount}\n\n` +
        `Your parking spot is reserved!`,
        { duration: 6000 }
      );

    } catch (error) {
      console.error("Booking error:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      
      // ===== ERROR HANDLING WITH SPECIFIC MESSAGES =====
      
      if (error.code === 'permission-denied') {
        toast.error(
          "❌ Permission Denied\n\n" +
          "You must be logged in as a DRIVER to book parking.\n" +
          "Please check your account type.",
          { duration: 5000 }
        );
      } else if (error.code === 'not-found') {
        toast.error(
          "❌ Parking Lot Not Found\n\n" +
          "This parking lot may have been removed.\n" +
          "Please refresh and try another location.",
          { duration: 5000 }
        );
      } else if (error.code === 'unavailable') {
        toast.error(
          "❌ Network Error\n\n" +
          "Unable to connect to the server.\n" +
          "Please check your internet connection.",
          { duration: 5000 }
        );
      } else if (error.message && error.message.includes("full")) {
        toast.error(
          "❌ Parking Full\n\n" +
          error.message,
          { duration: 4000 }
        );
      } else if (error.message && error.message.includes("availableSpots")) {
        toast.error(
          "❌ Update Failed\n\n" +
          "Unable to update parking availability.\n" +
          "Please try again.",
          { duration: 4000 }
        );
      } else {
        toast.error(
          "❌ Booking Failed\n\n" +
          "An unexpected error occurred.\n" +
          "Please try again or contact support.\n\n" +
          `Error: ${error.message}`,
          { duration: 5000 }
        );
      }
      
      // If booking failed, log error for debugging
      console.error("Full error object:", error);
      
    } finally {
      setIsBooking(false);
    }
  };

  // Open booking modal
  const openBookingModal = (lot) => {
    setSelectedParkingLot(lot);
    setShowBookingModal(true);
    setActiveMarker(null); // Close InfoWindow
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

  // Set up real-time listener for user's bookings
  useEffect(() => {
    if (user) {
      const unsubscribe = fetchUserBookings();
      // Cleanup listener on unmount
      return () => {
        if (unsubscribe && typeof unsubscribe === 'function') {
          unsubscribe();
        }
      };
    }
  }, [user]); // Remove fetchUserBookings from dependencies to prevent unnecessary re-renders

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

      {/* Live Bookings Section */}
      <div className="live-bookings-container">
        <div className="live-bookings-header">
          <h2>
            <FaParking style={{marginRight: '8px'}} />
            Live Bookings ({userBookings.length})
          </h2>
        </div>
        
        {loadingBookings ? (
          <div className="bookings-loading">
            <p>Loading your bookings...</p>
          </div>
        ) : userBookings.length > 0 ? (
          <div className="bookings-grid">
            {userBookings.map((booking) => (
              <div key={booking.id} className="booking-card">
                <div className="booking-card-header">
                  <h3>{booking.parkingLotName}</h3>
                  <span className="booking-status active">Active</span>
                </div>
                
                <div className="booking-card-body">
                  <div className="booking-info">
                    <FaMapMarkerAlt style={{color: '#6b7280', marginRight: '6px'}} />
                    <span className="booking-address">{booking.parkingLotAddress}</span>
                  </div>
                  
                  <div className="booking-details-grid">
                    <div className="booking-detail">
                      <FaClock style={{marginRight: '6px', color: '#3b82f6'}} />
                      <div>
                        <span className="detail-label">Duration</span>
                        <span className="detail-value">{booking.duration} hour(s)</span>
                      </div>
                    </div>
                    
                    <div className="booking-detail">
                      <span style={{marginRight: '6px', fontSize: '1.2rem'}}>💰</span>
                      <div>
                        <span className="detail-label">Amount</span>
                        <span className="detail-value">₹{booking.amount}</span>
                      </div>
                    </div>
                    
                    <div className="booking-detail">
                      <span style={{marginRight: '6px', fontSize: '1.2rem'}}>🕐</span>
                      <div>
                        <span className="detail-label">Start Time</span>
                        <span className="detail-value">
                          {booking.startTime?.toLocaleTimeString?.([], {hour: '2-digit', minute: '2-digit'}) || 'N/A'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="booking-detail">
                      <span style={{marginRight: '6px', fontSize: '1.2rem'}}>⏰</span>
                      <div>
                        <span className="detail-label">End Time</span>
                        <span className="detail-value">
                          {booking.endTime?.toLocaleTimeString?.([], {hour: '2-digit', minute: '2-digit'}) || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="booking-id">
                    <span>Booking ID: {booking.id.substring(0, 12)}...</span>
                  </div>
                </div>
                
                <div className="booking-card-footer">
                  <button 
                    className="cancel-booking-btn"
                    onClick={() => handleCancelBooking(booking)}
                  >
                    Cancel Booking
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-bookings">
            <FaParking style={{fontSize: '48px', color: '#d1d5db', marginBottom: '1rem'}} />
            <p>No active bookings.</p>
            <span>Book a parking slot to see it here!</span>
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
                      <button
                        className="book-now-btn"
                        onClick={() => openBookingModal(lot)}
                        disabled={lot.availableSpots <= 0}
                        style={{
                          marginTop: '8px',
                          padding: '8px 16px',
                          backgroundColor: lot.availableSpots > 0 ? '#34A853' : '#999',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: lot.availableSpots > 0 ? 'pointer' : 'not-allowed',
                          fontSize: '14px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          width: '100%',
                          justifyContent: 'center'
                        }}
                      >
                        <span style={{ fontSize: '16px' }}>🅿️</span> 
                        {lot.availableSpots > 0 ? 'Book Now' : 'Fully Booked'}
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

      {/* Booking Modal */}
      {showBookingModal && selectedParkingLot && (
        <div className="booking-modal-overlay" onClick={() => setShowBookingModal(false)}>
          <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
            <div className="booking-modal-header">
              <h2>Book Parking Slot</h2>
              <button 
                className="modal-close-btn" 
                onClick={() => setShowBookingModal(false)}
                aria-label="Close modal"
              >
                <FaTimes />
              </button>
            </div>

            <div className="booking-modal-content">
              {/* Parking Lot Info */}
              <div className="booking-section">
                <h3 className="booking-section-title">
                  <FaParking style={{ marginRight: '8px' }} />
                  Parking Details
                </h3>
                <div className="booking-info-grid">
                  <div className="booking-info-item">
                    <strong>Name:</strong>
                    <span>{selectedParkingLot.name}</span>
                  </div>
                  <div className="booking-info-item">
                    <strong>
                      <FaMapMarkerAlt style={{ marginRight: '4px' }} />
                      Address:
                    </strong>
                    <span>{selectedParkingLot.address}</span>
                  </div>
                  <div className="booking-info-item">
                    <strong>Available Spots:</strong>
                    <span className="spots-highlight">
                      {selectedParkingLot.availableSpots} / {selectedParkingLot.totalSpots}
                    </span>
                  </div>
                  <div className="booking-info-item">
                    <strong>Price:</strong>
                    <span className="price-highlight">
                      ₹{selectedParkingLot.pricePerHour || 50}/hour
                    </span>
                  </div>
                </div>
              </div>

              {/* Owner Details */}
              {selectedParkingLot.ownerName && (
                <div className="booking-section">
                  <h3 className="booking-section-title">
                    <FaUser style={{ marginRight: '8px' }} />
                    Owner Details
                  </h3>
                  <div className="booking-info-grid">
                    <div className="booking-info-item">
                      <strong>Name:</strong>
                      <span>{selectedParkingLot.ownerName || 'Not Available'}</span>
                    </div>
                    <div className="booking-info-item">
                      <strong>Contact:</strong>
                      <span>{selectedParkingLot.ownerContact || 'Not Available'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedParkingLot.description && (
                <div className="booking-section">
                  <h3 className="booking-section-title">Description</h3>
                  <p className="booking-description">
                    {selectedParkingLot.description}
                  </p>
                </div>
              )}

              {/* Photos Placeholder */}
              <div className="booking-section">
                <h3 className="booking-section-title">Photos</h3>
                <div className="booking-photos">
                  {selectedParkingLot.photos && selectedParkingLot.photos.length > 0 ? (
                    selectedParkingLot.photos.map((photo, index) => (
                      <img 
                        key={index}
                        src={photo} 
                        alt={`${selectedParkingLot.name} - ${index + 1}`}
                        className="booking-photo"
                      />
                    ))
                  ) : (
                    <div className="no-photos">
                      <FaParking style={{ fontSize: '48px', color: '#ccc' }} />
                      <p>No photos available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Booking Type Selection */}
              <div className="booking-section">
                <h3 className="booking-section-title">
                  <FaClock style={{ marginRight: '8px' }} />
                  Booking Type
                </h3>
                <div className="booking-type-selector">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="bookingType"
                      checked={!isAdvanceBooking}
                      onChange={() => {
                        setIsAdvanceBooking(false);
                        setBookingStartTime("");
                      }}
                    />
                    <span className="radio-label">
                      <strong>Book Now</strong>
                      <small>Parking starts immediately</small>
                    </span>
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="bookingType"
                      checked={isAdvanceBooking}
                      onChange={() => setIsAdvanceBooking(true)}
                    />
                    <span className="radio-label">
                      <strong>Advance Booking</strong>
                      <small>Reserve for a future time</small>
                    </span>
                  </label>
                </div>
              </div>

              {/* Start Time Selection (only for advance booking) */}
              {isAdvanceBooking && (
                <div className="booking-section">
                  <h3 className="booking-section-title">
                    <FaClock style={{ marginRight: '8px' }} />
                    Select Start Time
                  </h3>
                  <div className="datetime-selector">
                    <input
                      type="datetime-local"
                      value={bookingStartTime}
                      onChange={(e) => setBookingStartTime(e.target.value)}
                      min={new Date(Date.now() + 60000).toISOString().slice(0, 16)} // At least 1 minute from now
                      max={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)} // Max 7 days
                      className="datetime-input"
                      required={isAdvanceBooking}
                    />
                    <small className="datetime-hint">
                      📅 Select when you want your parking to start (up to 7 days in advance)
                    </small>
                  </div>
                </div>
              )}

              {/* Booking Duration */}
              <div className="booking-section">
                <h3 className="booking-section-title">
                  <FaClock style={{ marginRight: '8px' }} />
                  Select Duration
                </h3>
                <div className="duration-selector">
                  <label htmlFor="duration">Hours:</label>
                  <input
                    id="duration"
                    type="number"
                    min="1"
                    max="24"
                    value={bookingDuration}
                    onChange={(e) => setBookingDuration(Math.max(1, Math.min(24, parseInt(e.target.value) || 1)))}
                    className="duration-input"
                  />
                  <div className="duration-buttons">
                    <button 
                      className="duration-btn"
                      onClick={() => setBookingDuration(1)}
                    >
                      1h
                    </button>
                    <button 
                      className="duration-btn"
                      onClick={() => setBookingDuration(2)}
                    >
                      2h
                    </button>
                    <button 
                      className="duration-btn"
                      onClick={() => setBookingDuration(4)}
                    >
                      4h
                    </button>
                    <button 
                      className="duration-btn"
                      onClick={() => setBookingDuration(8)}
                    >
                      8h
                    </button>
                  </div>
                </div>
              </div>

              {/* Total Amount */}
              <div className="booking-total">
                <div className="total-row">
                  <span>Duration:</span>
                  <span>{bookingDuration} hour(s)</span>
                </div>
                <div className="total-row">
                  <span>Rate:</span>
                  <span>₹{selectedParkingLot.pricePerHour || 50}/hour</span>
                </div>
                <div className="total-row total-amount">
                  <strong>Total Amount:</strong>
                  <strong>₹{bookingDuration * (selectedParkingLot.pricePerHour || 50)}</strong>
                </div>
              </div>

              {/* Booking Actions */}
              <div className="booking-actions">
                <button
                  className="btn-cancel"
                  onClick={() => setShowBookingModal(false)}
                  disabled={isBooking}
                >
                  Cancel
                </button>
                <button
                  className="btn-confirm"
                  onClick={handleBooking}
                  disabled={isBooking || selectedParkingLot.availableSpots <= 0}
                >
                  {isBooking ? 'Processing...' : 'Confirm Booking'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

import { useState, useCallback, useEffect } from "react";
import { geminiModel } from "./firebase";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  DirectionsRenderer,
} from "@react-google-maps/api";
import toast, { Toaster } from "react-hot-toast";
import "./RouteDemo.css";

const containerStyle = {
  width: "100%",
  height: "600px",
};

const center = {
  lat: 15.496777,
  lng: 73.827827,
};

export default function RouteDemo() {
  const [userLocation, setUserLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [destination, setDestination] = useState("");
  const [directionsResponse, setDirectionsResponse] = useState(null);
  const [showRoute, setShowRoute] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);
  const [map, setMap] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [destinationCoords, setDestinationCoords] = useState(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["places"],
  });

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(loc);
          console.log("✓ User location:", loc);
          toast.success("Location obtained");
        },
        (error) => {
          console.error("✗ Location error:", error);
          toast.error("Could not get location. Please enable geolocation.");
        }
      );
    }
  }, []);

  // Parse destination using AI
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a destination");
      return;
    }

    try {
      toast.loading("Parsing with AI...");
      const prompt = `Extract the destination city/place from: "${searchQuery}". 
Return ONLY a JSON object: {"destination": "PLACE_NAME"}
Example: "I want to go to Quepem" -> {"destination": "Quepem"}`;

      const result = await geminiModel.generateContent(prompt);
      const text = result.response.text();
      const match = text.match(/\{[\s\S]*\}/);
      
      if (match) {
        const parsed = JSON.parse(match[0]);
        setDestination(parsed.destination);
        toast.success(`Parsed: ${parsed.destination}`);
        console.log("✓ AI parsed destination:", parsed.destination);
      }
    } catch (error) {
      console.error("✗ Parse error:", error);
      // Fallback: use the query as-is
      setDestination(searchQuery);
      toast.info("Using your input as destination");
    }
  };

  // Calculate route
  const handleFindRoute = async () => {
    if (!destination) {
      toast.error("Please search for a destination first");
      return;
    }

    if (!userLocation) {
      toast.error("Location not available yet");
      return;
    }

    setIsCalculating(true);
    try {
      toast.loading("Calculating route...");
      const directionsService = new window.google.maps.DirectionsService();

      const result = await directionsService.route({
        origin: userLocation,
        destination: `${destination}, Goa`,
        travelMode: window.google.maps.TravelMode.DRIVING,
      });

      if (result.status === "OK") {
        setDirectionsResponse(result);
        setShowRoute(true);

        const leg = result.routes[0].legs[0];
        setRouteInfo({
          distance: leg.distance.text,
          duration: leg.duration.text,
        });

        const destLatLng = leg.end_location;
        setDestinationCoords({
          lat: destLatLng.lat(),
          lng: destLatLng.lng(),
        });

        if (map && result.routes[0]) {
          const bounds = new window.google.maps.LatLngBounds();
          bounds.union(result.routes[0].bounds);
          if (userLocation) {
            bounds.extend(new window.google.maps.LatLng(userLocation.lat, userLocation.lng));
          }
          map.fitBounds(bounds);
        }

        toast.success(`Route found! ${leg.distance.text}, ${leg.duration.text}`);
        console.log("✓ Route calculated");
      } else {
        toast.error(`Route error: ${result.status}`);
        console.error("✗ Route error:", result.status);
      }
    } catch (error) {
      console.error("✗ Route calculation error:", error);
      toast.error("Failed to calculate route");
    } finally {
      setIsCalculating(false);
    }
  };

  const handleClear = () => {
    setDirectionsResponse(null);
    setShowRoute(false);
    setRouteInfo(null);
    setDestinationCoords(null);
    toast.success("Route cleared");
  };

  return (
    <div className="demo-container">
      <Toaster />
      
      <div className="demo-header">
        <h1>🗺️ Route Demo - Test AI Parsing & Directions</h1>
        <p>Type a destination, click Find Route, then Show Route to see the navigation</p>
      </div>

      <div className="demo-controls">
        <div className="control-group">
          <input
            type="text"
            className="demo-input"
            placeholder="e.g., 'I want to go to Quepem' or 'Panaji'"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          />
          <button className="demo-button demo-button-blue" onClick={handleSearch}>
            Parse Destination
          </button>
        </div>

        {destination && (
          <div className="info-parsed">
            ✓ Destination: <strong>{destination}</strong>
          </div>
        )}

        {!userLocation && (
          <div className="info-warning">
            ⚠️ Waiting for location... (enable geolocation)
          </div>
        )}

        <div className="control-group">
          <button
            className="demo-button demo-button-green"
            onClick={handleFindRoute}
            disabled={!destination || !userLocation || isCalculating}
          >
            {isCalculating ? "Calculating..." : "Find Route"}
          </button>

          <button
            className="demo-button demo-button-indigo"
            onClick={() => setShowRoute(!showRoute)}
            disabled={!directionsResponse}
          >
            {showRoute ? "Hide Route" : "Show Route"}
          </button>

          <button
            className="demo-button demo-button-red"
            onClick={handleClear}
            disabled={!directionsResponse}
          >
            Clear
          </button>
        </div>

        {routeInfo && (
          <div className="info-route">
            📍 <strong>Distance:</strong> {routeInfo.distance} | <strong>Duration:</strong> {routeInfo.duration}
          </div>
        )}
      </div>

      <div className="demo-map-container">
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={userLocation || center}
            zoom={userLocation ? 14 : 10}
            onLoad={(mapInstance) => setMap(mapInstance)}
          >
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

            {destinationCoords && (
              <Marker
                position={destinationCoords}
                icon={{
                  url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
                  scaledSize: new window.google.maps.Size(40, 40),
                }}
                title={`Destination: ${destination}`}
              />
            )}

            {directionsResponse && showRoute && (
              <DirectionsRenderer
                directions={directionsResponse}
                options={{
                  polylineOptions: {
                    strokeColor: "#2563eb",
                    strokeWeight: 5,
                    strokeOpacity: 0.9,
                  },
                  suppressMarkers: true,
                }}
              />
            )}
          </GoogleMap>
        ) : (
          <div className="demo-loading">Loading map...</div>
        )}
      </div>

      <div className="demo-footer">
        <p>All API calls are logged to the browser console. Check DevTools (F12) for details.</p>
      </div>
    </div>
  );
}

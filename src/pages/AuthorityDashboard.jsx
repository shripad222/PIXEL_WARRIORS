import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { db } from "../firebase";
import { 
  collection, query, where, onSnapshot, addDoc, updateDoc, doc, increment, GeoPoint, serverTimestamp 
} from "firebase/firestore";
import toast, { Toaster } from "react-hot-toast";
import { 
  FaParking, FaSignOutAlt, FaChartBar, FaBookmark, FaPlusCircle, 
  FaChevronDown, FaPlus, FaMinus, FaCheckCircle
} from "react-icons/fa";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import "./AuthorityDashboard.css";

export default function AuthorityDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [managedLots, setManagedLots] = useState([]);
  const [activeBookings, setActiveBookings] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '', address: '', totalSpots: '', availableSpots: '', lat: '', lng: ''
  });

  useEffect(() => {
    if (!user) {
      navigate("/authority-login");
      return;
    }

    const lotsQuery = query(collection(db, "parkingLots"), where("managerId", "==", user.uid));
    const bookingsQuery = query(collection(db, "bookings"), where("managerId", "==", user.uid));

    const unsubLots = onSnapshot(lotsQuery, (querySnapshot) => {
      setManagedLots(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubBookings = onSnapshot(bookingsQuery, (querySnapshot) => {
      const bookings = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`✅ Authority Dashboard: Loaded ${bookings.length} bookings (managerId: ${user.uid})`);
      if (bookings.length > 0) {
        console.log("Booking details:", bookings.map(b => ({
          id: b.id,
          parkingLot: b.parkingLotName,
          status: b.status,
          duration: b.duration
        })));
      }
      setActiveBookings(bookings);
    });

    return () => {
      unsubLots();
      unsubBookings();
    };
  }, [user, navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleUpdateSpots = async (lotId, currentSpots, totalSpots, change) => {
    const newSpots = currentSpots + change;
    if (newSpots < 0 || newSpots > totalSpots) return;

    try {
      await updateDoc(doc(db, "parkingLots", lotId), { availableSpots: newSpots });
    } catch (error) {
      toast.error("Could not update spots.");
    }
  };

  const handleConfirmArrival = async (booking) => {
    if (!confirm(`Confirm that ${booking.userName} has arrived at ${booking.parkingLotName}?`)) {
      return;
    }

    const loadingToast = toast.loading("Confirming arrival...");

    try {
      // Update booking status to 'active'
      const bookingRef = doc(db, "bookings", booking.id);
      await updateDoc(bookingRef, {
        status: "active",
        actualArrivalTime: serverTimestamp(),
      });

      toast.success(
        `✅ Driver arrival confirmed!\n\nDriver: ${booking.userName}\nParking: ${booking.parkingLotName}`,
        { id: loadingToast, duration: 5000 }
      );

      console.log(`✅ Booking ${booking.id} confirmed - Driver has arrived`);
    } catch (error) {
      console.error("Error confirming arrival:", error);
      toast.error("Failed to confirm arrival. Please try again.", { id: loadingToast });
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddParkingLot = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.address || !formData.totalSpots || !formData.lat || !formData.lng) {
      toast.error("Please fill all required fields.");
      return;
    }

    const loadingToast = toast.loading("Adding parking lot...");

    try {
      await addDoc(collection(db, "parkingLots"), {
        name: formData.name,
        address: formData.address,
        totalSpots: Number(formData.totalSpots),
        availableSpots: Number(formData.availableSpots || formData.totalSpots),
        location: new GeoPoint(Number(formData.lat), Number(formData.lng)),
        managerId: user.uid,
        rating: 0,
      });

      toast.success(`Lot "${formData.name}" added!`, { id: loadingToast });
      setFormData({ name: '', address: '', totalSpots: '', availableSpots: '', lat: '', lng: '' });
      setShowAddForm(false);
    } catch (error) {
      toast.error("Failed to add lot.", { id: loadingToast });
    }
  };

  const totalCapacity = managedLots.reduce((sum, lot) => sum + lot.totalSpots, 0);
  const totalAvailable = managedLots.reduce((sum, lot) => sum + lot.availableSpots, 0);
  const occupancyPercentage = totalCapacity > 0 ? (((totalCapacity - totalAvailable) / totalCapacity) * 100).toFixed(0) : 0;

  const occupancyData = [
    { hour: '8am', occupied: 20 }, { hour: '9am', occupied: 35 }, { hour: '10am', occupied: 45 },
    { hour: '11am', occupied: 60 }, { hour: '12pm', occupied: 75 }, { hour: '1pm', occupied: 70 },
    { hour: '2pm', occupied: 65 }, { hour: '3pm', occupied: 55 }, { hour: '4pm', occupied: 60 },
    { hour: '5pm', occupied: 80 },
  ];

  return (
    <div className="app-container">
      <Toaster />
      
      <div className="header">
        <div className="header-content">
          <FaParking className="header-icon" />
          <h1>Authority Dashboard</h1>
          <button className="signout-btn" onClick={handleLogout}>
            <FaSignOutAlt /> Sign Out
          </button>
        </div>
      </div>

      <div className="authority-dashboard">
        {/* Analytics Section */}
        <div className="dashboard-section">
          <h2><FaChartBar /> Analytics & Reporting</h2>
          <div className="metrics-grid">
            <div className="metric-card">
              <h3>Total Capacity</h3>
              <p>{totalCapacity}<span> spots</span></p>
            </div>
            <div className="metric-card">
              <h3>Live Occupancy</h3>
              <p>{occupancyPercentage}%</p>
            </div>
            <div className="metric-card">
              <h3>Today's Revenue</h3>
              <p>$0<span> (coming soon)</span></p>
            </div>
            <div className="metric-card">
              <h3>Monthly Revenue</h3>
              <p>$0<span> (coming soon)</span></p>
            </div>
          </div>
          <div className="chart-container">
            <h3>Hourly Occupancy Trend (Sample Data)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={occupancyData} margin={{ top: 20, right: 30, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="occupied" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Bookings Section */}
        <div className="dashboard-section">
          <h2><FaBookmark /> Live Bookings ({activeBookings.filter(b => b.status === 'active' || b.status === 'pending_arrival').length})</h2>
          <div className="bookings-list">
            {activeBookings.filter(b => b.status === 'active' || b.status === 'pending_arrival').length > 0 ? (
              activeBookings.filter(b => b.status === 'active' || b.status === 'pending_arrival').map(booking => {
                // Convert Firestore timestamps to Date objects
                const startTime = booking.startTime instanceof Date 
                  ? booking.startTime 
                  : booking.startTime?.toDate?.() || new Date();
                const endTime = booking.endTime instanceof Date 
                  ? booking.endTime 
                  : booking.endTime?.toDate?.() || new Date();
                const createdAt = booking.createdAt instanceof Date 
                  ? booking.createdAt 
                  : booking.createdAt?.toDate?.() || new Date();

                // Format dates for display
                const formatDateTime = (date) => {
                  return date.toLocaleString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  });
                };

                const formatTime = (date) => {
                  return date.toLocaleString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  });
                };

                const formatDate = (date) => {
                  return date.toLocaleString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });
                };

                // Check if booking is happening today
                const isToday = startTime.toDateString() === new Date().toDateString();
                const now = new Date();
                const isArrived = now >= startTime;
                const isPending = booking.status === 'pending_arrival';
                
                // Calculate grace period expiry
                const expiryTime = booking.expiryTime instanceof Date 
                  ? booking.expiryTime 
                  : booking.expiryTime?.toDate?.() || null;

                return (
                  <div key={booking.id} className={`booking-card enhanced ${isPending ? 'pending' : ''}`}>
                    <div className="booking-header">
                      <h4>{booking.parkingLotName || 'Unknown Parking Lot'}</h4>
                      <span className="booking-type-badge">
                        {booking.isAdvanceBooking ? '📅 Advance' : '⚡ Book Now'}
                      </span>
                    </div>

                    {/* Show pending status alert */}
                    {isPending && (
                      <div className="pending-alert">
                        <span className="alert-icon">⏳</span>
                        <div className="alert-content">
                          <strong>Awaiting Driver Arrival</strong>
                          <span className="alert-text">
                            Grace period expires at: {expiryTime ? formatDateTime(expiryTime) : 'N/A'}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="booking-details-grid">
                      {/* Arrival Information */}
                      <div className="detail-section arrival">
                        <span className="detail-icon">🚗</span>
                        <div className="detail-content">
                          <span className="detail-label">Arrival Time</span>
                          <span className="detail-value">{formatDateTime(startTime)}</span>
                          {!isArrived && (
                            <span className="status-tag upcoming">Upcoming</span>
                          )}
                          {isArrived && now < endTime && (
                            <span className="status-tag active">In Progress</span>
                          )}
                        </div>
                      </div>

                      {/* Departure Information */}
                      <div className="detail-section departure">
                        <span className="detail-icon">🏁</span>
                        <div className="detail-content">
                          <span className="detail-label">Departure Time</span>
                          <span className="detail-value">{formatDateTime(endTime)}</span>
                        </div>
                      </div>

                      {/* Duration */}
                      <div className="detail-section">
                        <span className="detail-icon">⏱️</span>
                        <div className="detail-content">
                          <span className="detail-label">Duration</span>
                          <span className="detail-value">{booking.duration} hour(s)</span>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="detail-section">
                        <span className="detail-icon">💰</span>
                        <div className="detail-content">
                          <span className="detail-label">Amount</span>
                          <span className="detail-value">₹{booking.amount}</span>
                        </div>
                      </div>
                    </div>

                    <div className="driver-info">
                      <div className="info-row">
                        <span className="info-label">👤 Driver:</span>
                        <span className="info-value">{booking.userName || 'Unknown Driver'}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">📧 Email:</span>
                        <span className="info-value">{booking.userEmail || 'N/A'}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">📅 Booked At:</span>
                        <span className="info-value">{formatDateTime(createdAt)}</span>
                      </div>
                    </div>

                    <div className="booking-footer">
                      <span className="booking-id">ID: {booking.id.slice(0, 12)}...</span>
                      <div className="booking-actions">
                        {isPending ? (
                          <button 
                            className="confirm-arrival-btn"
                            onClick={() => handleConfirmArrival(booking)}
                          >
                            <FaCheckCircle /> Confirm Arrival
                          </button>
                        ) : (
                          <span className="status-active">● Active</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="no-lots-message">No active bookings.</p>
            )}
          </div>
        </div>

        {/* Managed Parking Lots Section */}
        <div className="dashboard-section">
          <h2>Your Managed Parking Lots ({managedLots.length})</h2>
          <div className="lot-management-container">
            {managedLots.length > 0 ? (
              managedLots.map(lot => (
                <div key={lot.id} className="lot-card">
                  <div className="lot-info">
                    <h3>{lot.name}</h3>
                    <p>{lot.address}</p>
                  </div>
                  <div className="lot-stats">
                    <span>{lot.totalSpots} Total Spots</span>
                  </div>
                  <div className="spot-updater">
                    <button onClick={() => handleUpdateSpots(lot.id, lot.availableSpots, lot.totalSpots, -1)}>
                      <FaMinus />
                    </button>
                    <div className="spot-count">
                      <strong>{lot.availableSpots}</strong>
                      <span>Available</span>
                    </div>
                    <button onClick={() => handleUpdateSpots(lot.id, lot.availableSpots, lot.totalSpots, 1)}>
                      <FaPlus />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-lots-message">You haven't added any lots yet.</p>
            )}
          </div>
        </div>

        {/* Add New Parking Lot Section */}
        <div className="dashboard-section">
          <button className="toggle-form-btn" onClick={() => setShowAddForm(!showAddForm)}>
            <FaPlusCircle /> Add New Parking Lot
            <FaChevronDown className={`chevron ${showAddForm ? 'open' : ''}`} />
          </button>

          {showAddForm && (
            <form className="parking-lot-form" onSubmit={handleAddParkingLot}>
              <div className="form-grid">
                <input
                  type="text"
                  name="name"
                  placeholder="Parking Lot Name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
                <input
                  type="text"
                  name="address"
                  placeholder="Full Address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
                <input
                  type="number"
                  name="totalSpots"
                  placeholder="Total Spots"
                  value={formData.totalSpots}
                  onChange={handleChange}
                  required
                />
                <input
                  type="number"
                  name="availableSpots"
                  placeholder="Available Spots (optional)"
                  value={formData.availableSpots}
                  onChange={handleChange}
                />
                <input
                  type="text"
                  name="lat"
                  placeholder="Latitude"
                  value={formData.lat}
                  onChange={handleChange}
                  required
                />
                <input
                  type="text"
                  name="lng"
                  placeholder="Longitude"
                  value={formData.lng}
                  onChange={handleChange}
                  required
                />
              </div>
              <button type="submit" className="login-btn primary-btn">
                Add This Parking Lot
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { db } from "../firebase";
import { 
  collection, query, where, onSnapshot, addDoc, updateDoc, doc, increment, GeoPoint 
} from "firebase/firestore";
import toast, { Toaster } from "react-hot-toast";
import { 
  FaParking, FaSignOutAlt, FaChartBar, FaBookmark, FaPlusCircle, 
  FaChevronDown, FaPlus, FaMinus
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
      setActiveBookings(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
          <h2><FaBookmark /> Live Bookings ({activeBookings.length})</h2>
          <div className="bookings-list">
            {activeBookings.length > 0 ? (
              activeBookings.map(booking => (
                <div key={booking.id} className="booking-card">
                  <h4>{booking.lotName}</h4>
                  <p>Booked for <strong>{booking.duration} hour(s)</strong></p>
                  <span>Driver ID: {booking.driverId.slice(0, 8)}...</span>
                </div>
              ))
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

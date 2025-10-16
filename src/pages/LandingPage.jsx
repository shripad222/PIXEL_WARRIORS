import { useNavigate } from "react-router-dom";
import { FaParking, FaCar, FaBuilding } from "react-icons/fa";
import "./Auth.css";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '500px' }}>
        <div className="auth-header">
          <FaParking className="auth-icon" />
          <h1>Smart Car Parking System</h1>
          <p>Choose your role to continue</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button
            onClick={() => navigate("/login")}
            className="auth-button"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
            }}
          >
            <FaCar style={{ fontSize: '1.5rem' }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>Driver</div>
              <div style={{ fontSize: '0.85rem', fontWeight: '400', opacity: 0.9 }}>
                Find and book parking spaces
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate("/authority-portal")}
            className="auth-button"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            }}
          >
            <FaBuilding style={{ fontSize: '1.5rem' }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>Authority</div>
              <div style={{ fontSize: '0.85rem', fontWeight: '400', opacity: 0.9 }}>
                Manage parking lots and spaces
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

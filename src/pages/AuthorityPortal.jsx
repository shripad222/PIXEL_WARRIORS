import { useNavigate } from "react-router-dom";
import { FaBuilding, FaArrowLeft } from "react-icons/fa";
import "./Auth.css";

export default function AuthorityPortal() {
  const navigate = useNavigate();

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <FaBuilding className="auth-icon" style={{ color: '#10b981' }} />
          <h1>Authority Portal</h1>
          <p>Login or register to manage parking lots</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button
            onClick={() => navigate("/authority-login")}
            className="auth-button auth-button-primary"
          >
            Login as Authority
          </button>

          <button
            onClick={() => navigate("/authority-register")}
            className="auth-button"
            style={{
              background: '#10b981',
              color: 'white',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            }}
          >
            Register as Authority
          </button>
        </div>

        <div className="auth-footer">
          <button
            onClick={() => navigate("/")}
            style={{
              background: 'none',
              border: 'none',
              color: '#2563eb',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              margin: '0 auto',
              fontSize: '0.95rem',
            }}
          >
            <FaArrowLeft /> Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

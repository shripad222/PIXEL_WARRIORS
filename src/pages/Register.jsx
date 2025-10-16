import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { FaParking, FaGoogle, FaUser, FaEnvelope, FaLock } from "react-icons/fa";
import "./Auth.css";
import { Toaster } from "react-hot-toast";

export default function Register() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { registerWithEmail, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleEmailRegister = async (e) => {
    e.preventDefault();

    if (!displayName || !email || !password || !confirmPassword) {
      alert("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    try {
      await registerWithEmail(email, password, displayName);
      navigate("/driver");
    } catch (error) {
      console.error("Registration failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setIsLoading(true);
    try {
      await loginWithGoogle();
      navigate("/driver");
    } catch (error) {
      console.error("Google registration failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <Toaster />
      <div className="auth-card">
        <div className="auth-header">
          <FaParking className="auth-icon" />
          <h1>Smart Car Parking</h1>
          <p>Driver Registration</p>
        </div>

        <form onSubmit={handleEmailRegister} className="auth-form">
          <div className="form-group">
            <label>
              <FaUser className="input-icon" />
              Full Name
            </label>
            <input
              type="text"
              placeholder="John Doe"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label>
              <FaEnvelope className="input-icon" />
              Email
            </label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label>
              <FaLock className="input-icon" />
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label>
              <FaLock className="input-icon" />
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <button type="submit" className="auth-button auth-button-primary" disabled={isLoading}>
            {isLoading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div className="auth-divider">OR</div>

        <button
          onClick={handleGoogleRegister}
          className="auth-button auth-button-google"
          disabled={isLoading}
        >
          <FaGoogle /> Sign up with Google
        </button>

        <div className="auth-footer">
          <p>
            Already have an account?{" "}
            <Link to="/login" className="auth-link">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaBuilding, FaUser, FaEnvelope, FaLock, FaBriefcase, FaArrowLeft } from "react-icons/fa";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import toast, { Toaster } from "react-hot-toast";
import "./Auth.css";

export default function AuthorityRegister() {
  const [formData, setFormData] = useState({
    name: "",
    organization: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.organization || !formData.email || !formData.password || !formData.confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading("Creating account...");

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // Save authority user data to Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: formData.name,
        email: formData.email,
        organization: formData.organization,
        role: 'authority',
        createdAt: new Date()
      });

      toast.success("Account created successfully!", { id: loadingToast });
      navigate("/authority-dashboard");
    } catch (error) {
      console.error("Registration error:", error);
      if (error.code === "auth/email-already-in-use") {
        toast.error("Email already exists.", { id: loadingToast });
      } else {
        toast.error("Registration failed. Please try again.", { id: loadingToast });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <Toaster />
      <div className="auth-card" style={{ maxWidth: '500px' }}>
        <div className="auth-header">
          <FaBuilding className="auth-icon" style={{ color: '#10b981' }} />
          <h1>Authority Registration</h1>
          <p>Create your parking management account</p>
        </div>

        <form onSubmit={handleRegister} className="auth-form">
          <div className="form-group">
            <label>
              <FaUser className="input-icon" />
              Full Name
            </label>
            <input
              type="text"
              name="name"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label>
              <FaBriefcase className="input-icon" />
              Organization Name
            </label>
            <input
              type="text"
              name="organization"
              placeholder="City Parking Authority"
              value={formData.organization}
              onChange={handleChange}
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
              name="email"
              placeholder="authority@example.com"
              value={formData.email}
              onChange={handleChange}
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
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
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
              name="confirmPassword"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>

          <button type="submit" className="auth-button" style={{
            background: '#10b981',
            color: 'white',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
          }} disabled={isLoading}>
            {isLoading ? "Creating account..." : "Create Authority Account"}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{" "}
            <Link to="/authority-login" className="auth-link">
              Login here
            </Link>
          </p>
          <button
            onClick={() => navigate("/authority-portal")}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              fontWeight: '600',
              cursor: 'pointer',
              marginTop: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              margin: '1rem auto 0',
            }}
          >
            <FaArrowLeft /> Back to Authority Portal
          </button>
        </div>
      </div>
    </div>
  );
}

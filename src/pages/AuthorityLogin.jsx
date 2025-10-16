import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FaBuilding, FaEnvelope, FaLock, FaArrowLeft } from "react-icons/fa";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import toast, { Toaster } from "react-hot-toast";
import "./Auth.css";

export default function AuthorityLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading("Logging in...");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Check if user document exists
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // User exists in Auth but not in Firestore - create authority role
        console.log("Creating user document for existing auth user...");
        await setDoc(userDocRef, {
          email: user.email,
          role: 'authority',
          createdAt: serverTimestamp(),
          migratedFromOldSystem: true
        });
        toast.success("Welcome back! Your account has been updated.", { id: loadingToast });
        navigate("/authority-dashboard");
      } else if (userDoc.data().role === 'authority') {
        // Existing authority user
        toast.success("Login successful!", { id: loadingToast });
        navigate("/authority-dashboard");
      } else {
        // User exists but is a driver, not authority
        await auth.signOut();
        toast.error("This account is registered as a driver, not an authority.", { id: loadingToast });
      }
    } catch (error) {
      console.error("Login error:", error);
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        toast.error("Invalid email or password.", { id: loadingToast });
      } else if (error.code === 'auth/too-many-requests') {
        toast.error("Too many failed attempts. Please try again later.", { id: loadingToast });
      } else {
        toast.error("Login failed. Please try again.", { id: loadingToast });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <Toaster />
      <div className="auth-card">
        <div className="auth-header">
          <FaBuilding className="auth-icon" style={{ color: '#10b981' }} />
          <h1>Authority Login</h1>
          <p>Access your parking management dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group">
            <label>
              <FaEnvelope className="input-icon" />
              Email
            </label>
            <input
              type="email"
              placeholder="authority@example.com"
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

          <button type="submit" className="auth-button auth-button-primary" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account?{" "}
            <Link to="/authority-register" className="auth-link">
              Register here
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

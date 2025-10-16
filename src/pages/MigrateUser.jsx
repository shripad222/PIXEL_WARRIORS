import { useState } from "react";
import { auth, db } from "../firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { FaTools, FaCheck, FaTimes } from "react-icons/fa";
import toast, { Toaster } from "react-hot-toast";
import "./Auth.css";

export default function MigrateUser() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("authority");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleMigrate = async (e) => {
    e.preventDefault();

    if (!auth.currentUser) {
      toast.error("You must be logged in to migrate your account");
      return;
    }

    setIsLoading(true);
    setStatus("Checking current user...");

    try {
      const user = auth.currentUser;
      const userDocRef = doc(db, "users", user.uid);
      
      setStatus("Checking Firestore document...");
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        setStatus(`Document exists with role: ${userDoc.data().role}`);
        toast.info(`Your account already has role: ${userDoc.data().role}`);
        return;
      }

      setStatus("Creating user document in Firestore...");
      await setDoc(userDocRef, {
        email: user.email,
        displayName: user.displayName || null,
        role: role,
        createdAt: serverTimestamp(),
        migratedFromOldSystem: true,
        migratedAt: serverTimestamp()
      });

      setStatus(`✅ Success! User migrated as: ${role}`);
      toast.success(`Account migrated successfully as ${role}!`);
      
      // Also set in localStorage
      localStorage.setItem(`userRole_${user.uid}`, role);
      
      setTimeout(() => {
        window.location.href = role === 'authority' ? '/authority-dashboard' : '/driver';
      }, 2000);

    } catch (error) {
      console.error("Migration error:", error);
      setStatus(`❌ Error: ${error.message}`);
      toast.error("Migration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const checkCurrentStatus = async () => {
    if (!auth.currentUser) {
      toast.error("Please login first");
      return;
    }

    setIsLoading(true);
    try {
      const user = auth.currentUser;
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        setStatus(`
          ✅ Firestore Document Found
          - Email: ${data.email}
          - Role: ${data.role}
          - Created: ${data.createdAt?.toDate().toLocaleString()}
          ${data.migratedFromOldSystem ? '- Migrated from old system' : ''}
        `);
        toast.success(`Account exists with role: ${data.role}`);
      } else {
        const localRole = localStorage.getItem(`userRole_${user.uid}`);
        setStatus(`
          ⚠️ No Firestore Document Found
          - Auth User: ${user.email}
          - LocalStorage Role: ${localRole || 'Not set'}
          
          You can migrate this account below.
        `);
        toast.warning("No Firestore document found. Please migrate.");
      }
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
      toast.error("Failed to check status");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <Toaster />
      <div className="auth-card" style={{ maxWidth: '600px' }}>
        <div className="auth-header">
          <FaTools className="auth-icon" style={{ color: '#f59e0b' }} />
          <h1>Account Migration Tool</h1>
          <p>Fix "Not registered as authority" error</p>
        </div>

        {auth.currentUser ? (
          <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #86efac' }}>
            <p style={{ margin: 0, color: '#166534', fontWeight: 'bold' }}>
              <FaCheck style={{ marginRight: '0.5rem' }} />
              Logged in as: {auth.currentUser.email}
            </p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#15803d' }}>
              UID: {auth.currentUser.uid}
            </p>
          </div>
        ) : (
          <div style={{ marginBottom: '2rem', padding: '1rem', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fca5a5' }}>
            <p style={{ margin: 0, color: '#991b1b', fontWeight: 'bold' }}>
              <FaTimes style={{ marginRight: '0.5rem' }} />
              Not logged in
            </p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#b91c1c' }}>
              Please login first before using this tool
            </p>
          </div>
        )}

        <button
          onClick={checkCurrentStatus}
          disabled={!auth.currentUser || isLoading}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: auth.currentUser && !isLoading ? 'pointer' : 'not-allowed',
            opacity: auth.currentUser && !isLoading ? 1 : 0.5,
            marginBottom: '1.5rem'
          }}
        >
          {isLoading ? "Checking..." : "Check Current Status"}
        </button>

        {status && (
          <div style={{
            padding: '1rem',
            background: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            marginBottom: '1.5rem',
            whiteSpace: 'pre-line',
            fontFamily: 'monospace',
            fontSize: '0.875rem'
          }}>
            {status}
          </div>
        )}

        <form onSubmit={handleMigrate} className="auth-form">
          <h3 style={{ marginBottom: '1rem' }}>Migrate Account</h3>
          
          <div className="form-group">
            <label>Select Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={isLoading || !auth.currentUser}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '1rem'
              }}
            >
              <option value="authority">Authority (Parking Manager)</option>
              <option value="driver">Driver (Regular User)</option>
            </select>
            <small style={{ display: 'block', marginTop: '0.5rem', color: '#6b7280' }}>
              Choose the role for this account
            </small>
          </div>

          <button
            type="submit"
            className="auth-button auth-button-primary"
            disabled={!auth.currentUser || isLoading}
          >
            {isLoading ? "Migrating..." : "Migrate Account"}
          </button>
        </form>

        <div className="auth-footer" style={{ marginTop: '2rem' }}>
          <h4 style={{ marginBottom: '0.5rem' }}>Instructions:</h4>
          <ol style={{ textAlign: 'left', fontSize: '0.875rem', color: '#6b7280', paddingLeft: '1.5rem' }}>
            <li>Login with your existing email/password</li>
            <li>Click "Check Current Status" to see if you need migration</li>
            <li>If needed, select your role (Authority or Driver)</li>
            <li>Click "Migrate Account"</li>
            <li>You'll be redirected to the appropriate dashboard</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

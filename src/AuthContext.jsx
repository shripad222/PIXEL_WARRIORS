import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth } from "./firebase";
import toast from "react-hot-toast";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null); // 'driver' or 'authority'

  // Initialize auth state on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Get role from localStorage or default to 'driver'
        const storedRole = localStorage.getItem(`userRole_${currentUser.uid}`);
        setUserRole(storedRole || "driver");
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Register with email/password
  const registerWithEmail = async (email, password, displayName = "") => {
    try {
      setLoading(true);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile
      if (displayName) {
        await result.user.updateProfile({
          displayName: displayName,
        });
      }

      // Set default role as driver
      localStorage.setItem(`userRole_${result.user.uid}`, "driver");
      setUserRole("driver");
      setUser(result.user);

      toast.success("Registration successful! Welcome.");
      return result.user;
    } catch (error) {
      console.error("Registration error:", error);
      toast.error(error.message || "Registration failed");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Login with email/password
  const loginWithEmail = async (email, password) => {
    try {
      setLoading(true);
      const result = await signInWithEmailAndPassword(auth, email, password);
      const storedRole = localStorage.getItem(`userRole_${result.user.uid}`);
      setUserRole(storedRole || "driver");
      setUser(result.user);
      toast.success(`Welcome back, ${result.user.displayName || result.user.email}!`);
      return result.user;
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error.message || "Login failed");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Login with Google
  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Set default role as driver if new user
      const storedRole = localStorage.getItem(`userRole_${result.user.uid}`);
      if (!storedRole) {
        localStorage.setItem(`userRole_${result.user.uid}`, "driver");
        setUserRole("driver");
      } else {
        setUserRole(storedRole);
      }
      
      setUser(result.user);
      toast.success(`Welcome, ${result.user.displayName}!`);
      return result.user;
    } catch (error) {
      console.error("Google login error:", error);
      toast.error(error.message || "Google login failed");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      setUser(null);
      setUserRole(null);
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Logout failed");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Set user role (admin use)
  const setRole = (role) => {
    if (user) {
      localStorage.setItem(`userRole_${user.uid}`, role);
      setUserRole(role);
    }
  };

  const value = {
    user,
    loading,
    userRole,
    registerWithEmail,
    loginWithEmail,
    loginWithGoogle,
    logout,
    setRole,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

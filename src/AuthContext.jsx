import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
} from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import toast from "react-hot-toast";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null); // 'driver' or 'authority'

  // Initialize auth state on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Get role from Firestore
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role || "driver");
          } else {
            // Migrate from old localStorage system
            const storedRole = localStorage.getItem(`userRole_${currentUser.uid}`);
            const role = storedRole || "driver";
            
            // Create Firestore document for existing user
            await setDoc(userDocRef, {
              email: currentUser.email,
              role: role,
              createdAt: serverTimestamp(),
              migratedFromOldSystem: true
            });
            
            setUserRole(role);
            console.log("Migrated user from old system with role:", role);
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          // Fallback to localStorage if Firestore fails
          const storedRole = localStorage.getItem(`userRole_${currentUser.uid}`);
          setUserRole(storedRole || "driver");
        }
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

      // Create user document in Firestore with driver role
      const userDocRef = doc(db, "users", result.user.uid);
      await setDoc(userDocRef, {
        email: result.user.email,
        displayName: displayName || null,
        role: "driver",
        createdAt: serverTimestamp()
      });

      // Also set in localStorage for backward compatibility
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
      
      // Get role from Firestore
      const userDocRef = doc(db, "users", result.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      let role = "driver";
      if (userDoc.exists()) {
        role = userDoc.data().role || "driver";
      } else {
        // Migrate from localStorage if document doesn't exist
        const storedRole = localStorage.getItem(`userRole_${result.user.uid}`);
        role = storedRole || "driver";
        
        await setDoc(userDocRef, {
          email: result.user.email,
          role: role,
          createdAt: serverTimestamp(),
          migratedFromOldSystem: true
        });
      }
      
      setUserRole(role);
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
      
      // Check if user exists in Firestore
      const userDocRef = doc(db, "users", result.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      let role = "driver";
      if (!userDoc.exists()) {
        // New user or migrating from old system
        const storedRole = localStorage.getItem(`userRole_${result.user.uid}`);
        role = storedRole || "driver";
        
        await setDoc(userDocRef, {
          email: result.user.email,
          displayName: result.user.displayName,
          role: role,
          createdAt: serverTimestamp(),
          provider: "google"
        });
        
        localStorage.setItem(`userRole_${result.user.uid}`, role);
      } else {
        role = userDoc.data().role || "driver";
      }
      
      setUserRole(role);
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

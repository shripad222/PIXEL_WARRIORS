import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { Toaster } from "react-hot-toast";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        fontSize: "1.2rem",
        color: "#6b7280",
      }}>
        <Toaster />
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="brand-icon">🔍</span>
        Lost & Found
      </Link>
      <div className="navbar-links">
        <Link to="/" className="nav-link">Dashboard</Link>
        {user ? (
          <>
            {user.role === "admin" && (
              <Link to="/admin" className="nav-link nav-btn-admin">🛡️ Admin Panel</Link>
            )}
            <Link to="/items/new" className="nav-link nav-btn-add">+ Post Item</Link>
            <span className="nav-user">Hi, {user.name}</span>
            <button onClick={handleLogout} className="nav-btn-logout">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link">Login</Link>
            <Link to="/register" className="nav-link nav-btn-register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

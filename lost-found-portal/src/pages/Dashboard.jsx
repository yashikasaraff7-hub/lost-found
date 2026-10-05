import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getItems, getImageSrc } from "../api";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";

export default function Dashboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ category: "", status: "", type: "" });
  const { user } = useAuth();

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.category) params.category = filters.category;
      if (filters.status) params.status = filters.status;
      if (filters.type) params.type = filters.type;
      const { data } = await getItems(params);
      setItems(data);
    } catch (err) {
      console.error("Failed to fetch items:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [filters]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Lost & Found Dashboard</h1>
          <p className="dashboard-subtitle">Browse and search for lost or found items on campus</p>
        </div>
        {user && (
          <Link to="/items/new" className="btn-post">+ Post Item</Link>
        )}
      </div>

      <div className="filters-bar">
        <select name="type" value={filters.type} onChange={handleFilterChange}>
          <option value="">All Types</option>
          <option value="lost">Lost</option>
          <option value="found">Found</option>
        </select>
        <select name="category" value={filters.category} onChange={handleFilterChange}>
          <option value="">All Categories</option>
          <option value="Electronics">Electronics</option>
          <option value="Documents">Documents</option>
          <option value="Clothing">Clothing</option>
          <option value="Accessories">Accessories</option>
          <option value="Books">Books</option>
          <option value="Keys">Keys</option>
          <option value="Other">Other</option>
        </select>
        <select name="status" value={filters.status} onChange={handleFilterChange}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-state">Loading items...</div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📭</span>
          <p>No items found</p>
          <p className="empty-hint">Try adjusting your filters or post a new item.</p>
        </div>
      ) : (
        <div className="items-grid">
          {items.map((item) => (
            <Link to={`/items/${item._id}`} className="item-card" key={item._id}>
              <div className="item-image-wrapper">
                {item.imagePath ? (
                  <img src={getImageSrc(item.imagePath)} alt={item.description} />
                ) : (
                  <div className="no-image">📷</div>
                )}
                <span className={`item-badge ${item.type}`}>
                  {item.type === "lost" ? "Lost" : "Found"}
                </span>
                {item.status === "resolved" && (
                  <span className="item-badge resolved">Resolved</span>
                )}
              </div>
              <div className="item-info">
                <span className="item-category">{item.category}</span>
                <p className="item-description">{item.description}</p>
                <div className="item-meta">
                  <span>By {item.owner?.name || "Unknown"}</span>
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

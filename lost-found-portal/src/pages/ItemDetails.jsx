import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getItemById, resolveItem, deleteItem } from "../api";
import { useAuth } from "../context/AuthContext";
import "./ItemDetails.css";

const BACKEND_URL = "http://localhost:5001";

export default function ItemDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const { data } = await getItemById(id);
        setItem(data);
      } catch (err) {
        console.error("Failed to fetch item:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [id]);

  const isOwner = user && item && item.owner?._id === user.id;

  const handleResolve = async () => {
    setActionLoading(true);
    try {
      await resolveItem(id);
      setItem({ ...item, status: "resolved" });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to resolve item");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    setActionLoading(true);
    try {
      await deleteItem(id);
      navigate("/");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete item");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="details-loading">Loading...</div>;
  if (!item) return <div className="details-loading">Item not found</div>;

  return (
    <div className="details-container">
      <button className="btn-back" onClick={() => navigate("/")}>← Back to Dashboard</button>
      <div className="details-card">
        <div className="details-image-section">
          {item.imagePath ? (
            <img src={`${BACKEND_URL}${item.imagePath}`} alt={item.description} />
          ) : (
            <div className="details-no-image">📷 No Image</div>
          )}
        </div>
        <div className="details-info-section">
          <div className="details-badges">
            <span className={`detail-badge ${item.type}`}>
              {item.type === "lost" ? "🔴 Lost" : "🟢 Found"}
            </span>
            <span className={`detail-badge status-${item.status}`}>
              {item.status === "resolved" ? "✅ Resolved" : "⏳ Active"}
            </span>
          </div>
          <h2 className="details-category">{item.category}</h2>
          <p className="details-description">{item.description}</p>
          <div className="details-meta">
            <div className="meta-item">
              <span className="meta-label">Posted by</span>
              <span className="meta-value">{item.owner?.name || "Unknown"}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Contact</span>
              <span className="meta-value">{item.owner?.email || "N/A"}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Date</span>
              <span className="meta-value">{new Date(item.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {isOwner && (
            <div className="details-actions">
              <button
                onClick={() => navigate(`/items/${id}/edit`)}
                className="btn-edit"
                disabled={actionLoading}
              >
                ✏️ Edit
              </button>
              {item.status !== "resolved" && (
                <button onClick={handleResolve} className="btn-resolve" disabled={actionLoading}>
                  {actionLoading ? "..." : "✅ Mark as Resolved"}
                </button>
              )}
              <button onClick={handleDelete} className="btn-delete" disabled={actionLoading}>
                {actionLoading ? "..." : "🗑️ Delete"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getItems, deleteItem, resolveItem, adminLogin, getAdminStats, bulkDeleteItems, getImageSrc } from "../api";
import { useAuth } from "../context/AuthContext";
import "./AdminPanel.css";

export default function AdminPanel() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();

  // Admin Auth Gate State
  const [passcode, setPasscode] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [authMode, setAuthMode] = useState("passcode"); // 'passcode' | 'credentials'
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Admin Management State
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, lost: 0, found: 0, active: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'grid'
  const [selectedIds, setSelectedIds] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(null); // { type: 'single'|'bulk', item?: obj }
  const [previewImage, setPreviewImage] = useState(null);
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' }

  // Check if current user is admin
  const isAdmin = user && user.role === "admin";

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchItemsAndStats = async () => {
    setLoading(true);
    try {
      const [itemsRes, statsRes] = await Promise.allSettled([
        getItems({}),
        getAdminStats(),
      ]);

      if (itemsRes.status === "fulfilled") {
        setItems(itemsRes.value.data);
      }
      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value.data);
      } else if (itemsRes.status === "fulfilled") {
        // Fallback compute stats if endpoint fails
        const data = itemsRes.value.data;
        setStats({
          total: data.length,
          lost: data.filter((i) => i.type === "lost").length,
          found: data.filter((i) => i.type === "found").length,
          active: data.filter((i) => i.status === "active").length,
          resolved: data.filter((i) => i.status === "resolved").length,
        });
      }
    } catch (err) {
      console.error("Admin fetch error:", err);
      showToast("Failed to load items. Check server connection.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchItemsAndStats();
    }
  }, [isAdmin]);

  // Handle Admin Passcode / Credentials Login
  const handleAdminAuth = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      let payload = {};
      if (authMode === "passcode") {
        if (!passcode.trim()) {
          setAuthError("Please enter the admin passcode");
          setAuthLoading(false);
          return;
        }
        payload = { passcode: passcode.trim() };
      } else {
        if (!adminEmail.trim() || !adminPassword.trim()) {
          setAuthError("Email and password are required");
          setAuthLoading(false);
          return;
        }
        payload = { email: adminEmail.trim(), password: adminPassword.trim() };
      }

      const { data } = await adminLogin(payload);
      login(data.user, data.token);
      showToast("Admin access granted! Welcome to the control panel.");
    } catch (err) {
      setAuthError(err.response?.data?.message || "Invalid admin authorization credentials");
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Post Deletion
  const handleDeletePost = async (id) => {
    setDeletingId(id);
    try {
      await deleteItem(id);
      setItems((prev) => prev.filter((item) => item._id !== id));
      setSelectedIds((prev) => prev.filter((i) => i !== id));
      showToast("Post deleted successfully from the portal");
      setConfirmDeleteModal(null);
      // Refresh stats
      setStats((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
      }));
    } catch (err) {
      console.error("Delete error:", err);
      showToast(err.response?.data?.message || "Failed to delete post", "error");
    } finally {
      setDeletingId(null);
    }
  };

  // Handle Bulk Deletion
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setDeletingId("bulk");
    try {
      await bulkDeleteItems(selectedIds);
      setItems((prev) => prev.filter((item) => !selectedIds.includes(item._id)));
      showToast(`Successfully deleted ${selectedIds.length} posts`);
      setSelectedIds([]);
      setConfirmDeleteModal(null);
      fetchItemsAndStats();
    } catch (err) {
      console.error("Bulk delete error:", err);
      showToast("Failed to delete selected posts", "error");
    } finally {
      setDeletingId(null);
    }
  };

  // Toggle Post Status (active <-> resolved)
  const handleToggleStatus = async (item) => {
    const nextStatus = item.status === "resolved" ? "active" : "resolved";
    try {
      const { data } = await resolveItem(item._id, { status: nextStatus });
      setItems((prev) =>
        prev.map((i) => (i._id === item._id ? { ...i, status: data.status || nextStatus } : i))
      );
      showToast(`Post status updated to ${nextStatus.toUpperCase()}`);
    } catch (err) {
      console.error("Status toggle error:", err);
      showToast(err.response?.data?.message || "Failed to update post status", "error");
    }
  };

  // Filter and Search Logic
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        // Type filter
        if (filterType !== "all" && item.type !== filterType) return false;
        // Status filter
        if (filterStatus !== "all" && item.status !== filterStatus) return false;
        // Category filter
        if (filterCategory !== "all" && item.category !== filterCategory) return false;
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const desc = item.description?.toLowerCase() || "";
          const cat = item.category?.toLowerCase() || "";
          const ownerName = item.owner?.name?.toLowerCase() || "";
          const ownerEmail = item.owner?.email?.toLowerCase() || "";
          const id = item._id?.toLowerCase() || "";
          return desc.includes(q) || cat.includes(q) || ownerName.includes(q) || ownerEmail.includes(q) || id.includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "newest") return new Date(b.createdAt) - new Date(a.createdAt);
        if (sortBy === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
        if (sortBy === "category") return (a.category || "").localeCompare(b.category || "");
        return 0;
      });
  }, [items, searchQuery, filterType, filterStatus, filterCategory, sortBy]);

  // Bulk selection helpers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredItems.map((item) => item._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const isAllSelected = filteredItems.length > 0 && selectedIds.length === filteredItems.length;

  // Render Gate if not authorized
  if (!isAdmin) {
    return (
      <div className="admin-gate-container">
        <div className="admin-gate-card">
          <div className="gate-header">
            <div className="admin-badge-icon">🛡️</div>
            <h2>Admin Control Access</h2>
            <p>Enter the admin passcode or authenticate with an administrator account to manage portal posts.</p>
          </div>

          <div className="gate-tabs">
            <button
              type="button"
              className={`gate-tab ${authMode === "passcode" ? "active" : ""}`}
              onClick={() => {
                setAuthMode("passcode");
                setAuthError("");
              }}
            >
              🔑 Master Passcode
            </button>
            <button
              type="button"
              className={`gate-tab ${authMode === "credentials" ? "active" : ""}`}
              onClick={() => {
                setAuthMode("credentials");
                setAuthError("");
              }}
            >
              👤 Admin Account
            </button>
          </div>

          {authError && <div className="gate-error-banner">⚠️ {authError}</div>}

          <form onSubmit={handleAdminAuth} className="gate-form">
            {authMode === "passcode" ? (
              <div className="form-group">
                <label htmlFor="admin-passcode">Admin Passcode</label>
                <input
                  id="admin-passcode"
                  type="password"
                  placeholder="Enter secret admin passcode (e.g. admin123)"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  autoFocus
                  required
                />
                <span className="form-hint">Default development passcode: <code>admin123</code></span>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label htmlFor="admin-email">Admin Email</label>
                  <input
                    id="admin-email"
                    type="email"
                    placeholder="admin@example.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="admin-password">Password</label>
                  <input
                    id="admin-password"
                    type="password"
                    placeholder="Admin password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <button type="submit" className="btn-admin-submit" disabled={authLoading}>
              {authLoading ? "Verifying..." : "Unlock Admin Dashboard"}
            </button>
          </form>

          <div className="gate-footer">
            <Link to="/" className="gate-back-link">← Return to Public Portal</Link>
          </div>
        </div>
      </div>
    );
  }

  // Render Full Admin Panel
  return (
    <div className="admin-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`admin-toast ${toast.type}`}>
          <span className="toast-icon">{toast.type === "success" ? "✅" : "⚠️"}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Admin Top Header */}
      <div className="admin-top-bar">
        <div className="admin-title-group">
          <div className="admin-title-badge">
            <span className="admin-shield">🛡️</span>
            <span>ADMINISTRATOR PANEL</span>
          </div>
          <h1>Lost & Found Post Management</h1>
          <p>Delete any inappropriate or spam posts, oversee campus listings, and toggle post status.</p>
        </div>

        <div className="admin-top-actions">
          <button onClick={fetchItemsAndStats} className="btn-secondary" title="Refresh data">
            🔄 Refresh
          </button>
          <Link to="/" className="btn-secondary">
            🌐 Public Portal
          </Link>
          <button onClick={logout} className="btn-danger-outline" title="Exit admin session">
            🚪 Exit Admin
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="admin-stats-grid">
        <div className="stat-card">
          <div className="stat-icon total">📦</div>
          <div className="stat-data">
            <span className="stat-label">Total Listings</span>
            <span className="stat-value">{stats.total || items.length}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon lost">🔍</div>
          <div className="stat-data">
            <span className="stat-label">Lost Reports</span>
            <span className="stat-value">{stats.lost || items.filter(i => i.type === "lost").length}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon found">🎁</div>
          <div className="stat-data">
            <span className="stat-label">Found Reports</span>
            <span className="stat-value">{stats.found || items.filter(i => i.type === "found").length}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon active">⚡</div>
          <div className="stat-data">
            <span className="stat-label">Active Listings</span>
            <span className="stat-value">{stats.active || items.filter(i => i.status === "active").length}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon resolved">✅</div>
          <div className="stat-data">
            <span className="stat-label">Resolved</span>
            <span className="stat-value">{stats.resolved || items.filter(i => i.status === "resolved").length}</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Filters, View Modes */}
      <div className="admin-controls-panel">
        <div className="admin-search-wrapper">
          <span className="search-icon">🔎</span>
          <input
            type="text"
            placeholder="Search by description, owner, email, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="admin-search-input"
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery("")}>
              ✕
            </button>
          )}
        </div>

        <div className="admin-filter-group">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">Type: All</option>
            <option value="lost">Lost Only</option>
            <option value="found">Found Only</option>
          </select>

          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">Status: All</option>
            <option value="active">Active Only</option>
            <option value="resolved">Resolved Only</option>
          </select>

          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="all">Category: All</option>
            <option value="Electronics">Electronics</option>
            <option value="Documents">Documents</option>
            <option value="Clothing">Clothing</option>
            <option value="Accessories">Accessories</option>
            <option value="Books">Books</option>
            <option value="Keys">Keys</option>
            <option value="Other">Other</option>
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
            <option value="category">Sort: Category A-Z</option>
          </select>

          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === "table" ? "active" : ""}`}
              onClick={() => setViewMode("table")}
              title="Table View"
            >
              📋 Table
            </button>
            <button
              className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
              title="Grid View"
            >
              🎴 Cards
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar if items selected */}
      {selectedIds.length > 0 && (
        <div className="admin-bulk-bar">
          <span>
            <strong>{selectedIds.length}</strong> post{selectedIds.length > 1 ? "s" : ""} selected
          </span>
          <div className="bulk-actions">
            <button
              onClick={() => setConfirmDeleteModal({ type: "bulk", count: selectedIds.length })}
              className="btn-danger-solid"
            >
              🗑️ Delete {selectedIds.length} Selected Posts
            </button>
            <button onClick={() => setSelectedIds([])} className="btn-secondary-sm">
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Content Section */}
      {loading ? (
        <div className="admin-loading-box">
          <div className="spinner"></div>
          <p>Loading portal posts...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="admin-empty-box">
          <div className="empty-icon">📭</div>
          <h3>No posts found matching your criteria</h3>
          <p>Try resetting your search query or filters.</p>
          {(searchQuery || filterType !== "all" || filterStatus !== "all" || filterCategory !== "all") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setFilterType("all");
                setFilterStatus("all");
                setFilterCategory("all");
              }}
              className="btn-secondary"
            >
              Reset All Filters
            </button>
          )}
        </div>
      ) : viewMode === "table" ? (
        /* TABLE VIEW */
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: "40px" }}>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    title="Select all items"
                  />
                </th>
                <th>Image</th>
                <th>Type & Category</th>
                <th>Description</th>
                <th>Status</th>
                <th>Posted By</th>
                <th>Date</th>
                <th style={{ textAlign: "right" }}>Admin Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item._id} className={selectedIds.includes(item._id) ? "row-selected" : ""}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item._id)}
                      onChange={() => handleToggleSelect(item._id)}
                    />
                  </td>
                  <td>
                    {item.imagePath ? (
                      <div
                        className="table-img-thumb"
                        onClick={() => setPreviewImage(getImageSrc(item.imagePath))}
                        title="Click to zoom image"
                      >
                        <img src={getImageSrc(item.imagePath)} alt={item.category} />
                      </div>
                    ) : (
                      <div className="table-img-placeholder">📷</div>
                    )}
                  </td>
                  <td>
                    <div className="table-type-cat">
                      <span className={`badge-type ${item.type}`}>
                        {item.type === "lost" ? "LOST" : "FOUND"}
                      </span>
                      <span className="badge-cat">{item.category}</span>
                    </div>
                  </td>
                  <td>
                    <div className="table-desc-cell">
                      <p className="table-desc-text">{item.description}</p>
                      <span className="item-id-tag">ID: {item._id}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge-status ${item.status}`}>
                      {item.status === "resolved" ? "✓ Resolved" : "● Active"}
                    </span>
                  </td>
                  <td>
                    <div className="table-owner-cell">
                      <span className="owner-name">{item.owner?.name || "Anonymous"}</span>
                      <span className="owner-email">{item.owner?.email || "No email"}</span>
                    </div>
                  </td>
                  <td>
                    <span className="table-date">
                      {new Date(item.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <Link
                        to={`/items/${item._id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="action-btn view-btn"
                        title="View post on public site"
                      >
                        👁️ View
                      </Link>
                      <button
                        onClick={() => handleToggleStatus(item)}
                        className={`action-btn status-btn ${item.status}`}
                        title="Toggle resolved / active"
                      >
                        {item.status === "resolved" ? "Reactivate" : "Resolve"}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteModal({ type: "single", item })}
                        className="action-btn delete-btn"
                        title="Delete this post permanently"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* GRID CARD VIEW */
        <div className="admin-grid-view">
          {filteredItems.map((item) => (
            <div
              key={item._id}
              className={`admin-card ${selectedIds.includes(item._id) ? "card-selected" : ""}`}
            >
              <div className="admin-card-header">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item._id)}
                  onChange={() => handleToggleSelect(item._id)}
                />
                <div className="card-badges">
                  <span className={`badge-type ${item.type}`}>
                    {item.type === "lost" ? "LOST" : "FOUND"}
                  </span>
                  <span className={`badge-status ${item.status}`}>{item.status}</span>
                </div>
              </div>

              <div
                className="admin-card-image"
                onClick={() =>
                  item.imagePath && setPreviewImage(getImageSrc(item.imagePath))
                }
              >
                {item.imagePath ? (
                  <img src={getImageSrc(item.imagePath)} alt={item.description} />
                ) : (
                  <div className="no-image-placeholder">📷 No Image</div>
                )}
              </div>

              <div className="admin-card-body">
                <div className="card-category-line">
                  <span className="badge-cat">{item.category}</span>
                  <span className="card-date">{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="card-desc">{item.description}</p>
                <div className="card-owner">
                  <span>👤 {item.owner?.name || "Unknown"}</span>
                  <span className="owner-email-sm">{item.owner?.email}</span>
                </div>
              </div>

              <div className="admin-card-footer">
                <Link to={`/items/${item._id}`} className="card-btn-view" target="_blank">
                  👁️ View
                </Link>
                <button
                  onClick={() => handleToggleStatus(item)}
                  className="card-btn-toggle"
                >
                  {item.status === "resolved" ? "Reactivate" : "Resolve"}
                </button>
                <button
                  onClick={() => setConfirmDeleteModal({ type: "single", item })}
                  className="card-btn-delete"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal for Deletion */}
      {confirmDeleteModal && (
        <div className="modal-backdrop" onClick={() => setConfirmDeleteModal(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon-danger">⚠️</div>
            <h3>
              {confirmDeleteModal.type === "bulk"
                ? `Delete ${confirmDeleteModal.count} Posts?`
                : "Delete This Post Permanently?"}
            </h3>
            <p>
              {confirmDeleteModal.type === "bulk"
                ? `Are you sure you want to delete ${confirmDeleteModal.count} selected posts? This action cannot be undone.`
                : `Are you sure you want to delete the post for "${confirmDeleteModal.item?.category} - ${confirmDeleteModal.item?.description?.slice(0, 40)}..."?`}
            </p>

            <div className="modal-actions">
              <button
                onClick={() => setConfirmDeleteModal(null)}
                className="btn-modal-cancel"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmDeleteModal.type === "bulk") {
                    handleBulkDelete();
                  } else {
                    handleDeletePost(confirmDeleteModal.item._id);
                  }
                }}
                className="btn-modal-delete"
                disabled={deletingId !== null}
              >
                {deletingId ? "Deleting..." : "Yes, Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Zoom Modal */}
      {previewImage && (
        <div className="modal-backdrop" onClick={() => setPreviewImage(null)}>
          <div className="image-zoom-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-preview-btn" onClick={() => setPreviewImage(null)}>
              ✕
            </button>
            <img src={previewImage} alt="Enlarged Preview" />
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createItem, getItemById, updateItem } from "../api";
import { useAuth } from "../context/AuthContext";
import "./ItemForm.css";

export default function ItemForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState({
    type: "lost",
    category: "",
    description: "",
  });
  const [image, setImage] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (isEdit) {
      const fetchItem = async () => {
        try {
          const { data } = await getItemById(id);
          if (data.owner?._id !== user.id) {
            navigate("/");
            return;
          }
          setForm({
            type: data.type,
            category: data.category,
            description: data.description,
          });
        } catch (err) {
          console.error("Failed to fetch item:", err);
          navigate("/");
        }
      };
      fetchItem();
    }
  }, [id, user]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("type", form.type);
      formData.append("category", form.category);
      formData.append("description", form.description);
      if (image) formData.append("image", image);

      if (isEdit) {
        await updateItem(id, formData);
      } else {
        await createItem(formData);
      }
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <form className="item-form" onSubmit={handleSubmit}>
        <h2>{isEdit ? "Update Item" : "Post New Item"}</h2>
        <p className="form-subtitle">
          {isEdit ? "Update the details below" : "Report a lost or found item"}
        </p>
        {error && <div className="auth-error">{error}</div>}

        <div className="form-group">
          <label htmlFor="type">Type</label>
          <select id="type" name="type" value={form.type} onChange={handleChange} required>
            <option value="lost">Lost</option>
            <option value="found">Found</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="category">Category</label>
          <select id="category" name="category" value={form.category} onChange={handleChange} required>
            <option value="">Select a category</option>
            <option value="Electronics">Electronics</option>
            <option value="Documents">Documents</option>
            <option value="Clothing">Clothing</option>
            <option value="Accessories">Accessories</option>
            <option value="Books">Books</option>
            <option value="Keys">Keys</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            placeholder="Describe the item in detail (color, brand, location where lost/found, etc.)"
            value={form.description}
            onChange={handleChange}
            required
            rows={4}
          />
        </div>

        <div className="form-group">
          <label htmlFor="image">Image</label>
          <input
            id="image"
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files[0])}
            className="file-input"
          />
        </div>

        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? "Saving..." : isEdit ? "Update Item" : "Post Item"}
        </button>
      </form>
    </div>
  );
}

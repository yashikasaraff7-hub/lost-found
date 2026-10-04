import axios from "axios";

export const BACKEND_URL = import.meta.env.VITE_API_URL || "https://lostnfound-8hhj.onrender.com";

const API = axios.create({
  baseURL: `${BACKEND_URL}/api`,
});

// Attach JWT token to every request if available
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const registerUser = (formData) => API.post("/auth/register", formData);
export const loginUser = (formData) => API.post("/auth/login", formData);
export const adminLogin = (payload) => API.post("/auth/admin-login", payload);
export const getMe = () => API.get("/auth/me");

// Items API
export const getItems = (params) => API.get("/items", { params });
export const getItemById = (id) => API.get(`/items/${id}`);
export const createItem = (formData) =>
  API.post("/items", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const updateItem = (id, formData) =>
  API.put(`/items/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const resolveItem = (id, data) => API.patch(`/items/${id}/resolve`, data);
export const deleteItem = (id) => API.delete(`/items/${id}`);
export const getAdminStats = () => API.get("/items/admin/stats");
export const bulkDeleteItems = (ids) => API.post("/items/bulk-delete", { ids });


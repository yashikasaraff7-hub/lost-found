import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5001/api",
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
export const resolveItem = (id) => API.patch(`/items/${id}/resolve`);
export const deleteItem = (id) => API.delete(`/items/${id}`);

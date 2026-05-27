import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
  timeout: 20000,
});

// ── Products ──────────────────────────────────────────────────────────────────
export const getProducts = (params = {}) => api.get("/products", { params });
export const getMyProducts = (email) =>
  api.get("/products/mine", { params: { email } });
export const getProduct = (id) => api.get(`/products/${id}`);
export const createProduct = (data) => api.post("/products", data);
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);
export const deleteProduct = (id) => api.delete(`/products/${id}`);

// ── Image upload (via server — avoids browser storage hangs) ────────────────
const uploadHeaders = (accessToken) => ({
  Authorization: `Bearer ${accessToken}`,
  "Content-Type": "multipart/form-data",
});

export const uploadProductImage = (file, accessToken) => {
  const formData = new FormData();
  formData.append("image", file);
  return api.post("/upload/image", formData, {
    headers: uploadHeaders(accessToken),
    timeout: 30000,
  });
};

export const uploadProductImages = (files, accessToken) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));
  return api.post("/upload/images", formData, {
    headers: uploadHeaders(accessToken),
    timeout: 60000,
  });
};

// ── Categories ────────────────────────────────────────────────────────────────
export const getCategories = () => api.get("/categories");

// ── Employees ─────────────────────────────────────────────────────────────────
export const getEmployees = (params = {}) => api.get("/employees", { params });
export const getMyEmployees = (user_id) => api.get("/employees/mine", { params: { user_id } });
export const getEmployee = (id) => api.get(`/employees/${id}`);
export const createEmployee = (data) => api.post("/employees", data);
export const getEmployeeReviews = (id) => api.get(`/employees/${id}/reviews`);
export const createEmployeeReview = (id, data) => api.post(`/employees/${id}/reviews`, data);

// ── Profiles & Messages ────────────────────────────────────────────────────────
const authHeaders = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

export const updateProfile = (data, token) => api.put("/profiles", data, authHeaders(token));
export const sendMessage = (data, token) => api.post("/messages", data, authHeaders(token));
export const getConversations = (token) => api.get("/messages", authHeaders(token));
export const getMessageThread = (productId, otherUserId, token) =>
  api.get("/messages/thread", {
    ...authHeaders(token),
    params: { product_id: productId, other_user_id: otherUserId },
  });

export default api;

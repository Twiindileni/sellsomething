import axios from "axios";

/** Dev: CRA proxy on desktop; same LAN IP + port 5000 on phone/tablet. Prod: REACT_APP_API_URL. */
function resolveApiBaseUrl() {
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "/api";
    }
    return `http://${host}:5000/api`;
  }
  return process.env.REACT_APP_API_URL || "/api";
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: { "Content-Type": "application/json" },
  timeout: 20000,
});

const authHeaders = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

// ── Products ──────────────────────────────────────────────────────────────────
export const getProducts = (params = {}) => api.get("/products", { params });
export const getMyProducts = (email) =>
  api.get("/products/mine", { params: { email } });
export const getProduct = (id) => api.get(`/products/${id}`);
export const createProduct = (data, token) =>
  api.post("/products", data, authHeaders(token));
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
export const createEmployee = (data, token) =>
  api.post("/employees", data, authHeaders(token));
export const getEmployeeReviews = (id) => api.get(`/employees/${id}/reviews`);
export const createEmployeeReview = (id, data) => api.post(`/employees/${id}/reviews`, data);

// ── Profiles & Messages ────────────────────────────────────────────────────────
export const updateProfile = (data, token) => api.put("/profiles", data, authHeaders(token));
export const sendMessage = (data, token) => api.post("/messages", data, authHeaders(token));
export const getConversations = (token) => api.get("/messages", authHeaders(token));
export const getMessageThread = ({ productId, employeeId, otherUserId }, token) =>
  api.get("/messages/thread", {
    ...authHeaders(token),
    params: {
      ...(productId ? { product_id: productId } : {}),
      ...(employeeId ? { employee_id: employeeId } : {}),
      other_user_id: otherUserId,
    },
  });

// ── Orders (Escrow) ───────────────────────────────────────────────────────────
export const createOrder = (data, token) =>
  api.post("/orders", data, authHeaders(token));

export const getMyOrders = (role, token) =>
  api.get("/orders/mine", { ...authHeaders(token), params: { role } });

export const updateOrderStatus = (orderId, status, data, token) =>
  api.put(`/orders/${orderId}/status`, { status, ...data }, authHeaders(token));

export const getAllOrders = (token) =>
  api.get("/orders/admin", authHeaders(token));

export const adminUpdateOrderStatus = (orderId, status, token) =>
  api.put(`/orders/${orderId}/admin-status`, { status }, authHeaders(token));

// ── Admin: users ──────────────────────────────────────────────────────────────
export const getAdminUsers = (token) => api.get("/admin/users", authHeaders(token));
export const getAdminUserDetail = (userId, token) =>
  api.get(`/admin/users/${userId}`, authHeaders(token));

// ── Boosts (sponsored ads) ────────────────────────────────────────────────────
export const createBoost = (data, token) =>
  api.post("/boosts", data, authHeaders(token));

export const getMyBoosts = (token) =>
  api.get("/boosts/mine", authHeaders(token));

export const getAdminBoosts = (token) =>
  api.get("/boosts/admin", authHeaders(token));

export const adminUpdateBoostStatus = (boostId, data, token) =>
  api.put(`/boosts/${boostId}/admin-status`, data, authHeaders(token));

export default api;

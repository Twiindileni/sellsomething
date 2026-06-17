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

/** Multipart uploads must not use the axios default application/json Content-Type */
const multipartAuthConfig = (token, timeout = 60000) => ({
  headers: { Authorization: `Bearer ${token}` },
  timeout,
  transformRequest: [(data, headers) => {
    delete headers["Content-Type"];
    return data;
  }],
});

// ── Products ──────────────────────────────────────────────────────────────────
export const getProducts = (params = {}) => api.get("/products", { params });
export const getMyProducts = (email) =>
  api.get("/products/mine", { params: { email } });
export const getProduct = (id) => api.get(`/products/${id}`);
export const createProduct = (data, token) =>
  api.post("/products", data, authHeaders(token));
export const updateProduct = (id, data) => api.put(`/products/${id}`, data);
export const markProductSold = (id, sold, token) =>
  api.put(`/products/${id}/sold`, { sold }, authHeaders(token));
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
export const requestSellerVerification = (data, token) => {
  const formData = new FormData();
  formData.append("id_photo", data.idPhoto);
  formData.append("consent", "true");
  if (data.social_facebook) formData.append("social_facebook", data.social_facebook);
  if (data.social_instagram) formData.append("social_instagram", data.social_instagram);
  if (data.social_tiktok) formData.append("social_tiktok", data.social_tiktok);
  if (data.social_linkedin) formData.append("social_linkedin", data.social_linkedin);
  if (data.verification_note) formData.append("verification_note", data.verification_note);
  return api.post("/profiles/request-verification", formData, multipartAuthConfig(token));
};
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
export const adminSetUserVerification = (userId, payload, token) =>
  api.put(`/admin/users/${userId}/verification`, payload, authHeaders(token));

// ── Boosts (sponsored ads) ────────────────────────────────────────────────────
export const createBoost = (data, token) =>
  api.post("/boosts", data, authHeaders(token));

export const getMyBoosts = (token) =>
  api.get("/boosts/mine", authHeaders(token));

export const getAdminBoosts = (token) =>
  api.get("/boosts/admin", authHeaders(token));

export const adminUpdateBoostStatus = (boostId, data, token) =>
  api.put(`/boosts/${boostId}/admin-status`, data, authHeaders(token));

// ── Admin: mail (Resend) ─────────────────────────────────────────────────────
export const getAdminMailStatus = (token) =>
  api.get("/admin/mail/status", authHeaders(token));
export const getAdminMailPreview = (token) =>
  api.get("/admin/mail/preview", authHeaders(token));
export const getAdminMailLog = (token, limit = 50) =>
  api.get("/admin/mail/log", { ...authHeaders(token), params: { limit } });
export const sendAdminMailTest = (data, token) =>
  api.post("/admin/mail/test", data, authHeaders(token));
export const runAdminMailCampaign = (data, token) =>
  api.post("/admin/mail/run", data, authHeaders(token));
export const sendAdminMailToUser = (data, token) =>
  api.post("/admin/mail/send-user", data, authHeaders(token));

export const registerPushToken = (data, token) =>
  api.post("/push/register", {
    push_token: data.token,
    platform: data.platform,
    device_label: data.device_label,
  }, authHeaders(token));

export const unregisterPushToken = (data, token) =>
  api.delete("/push/register", {
    ...authHeaders(token),
    data: { push_token: data.token },
  });

export default api;

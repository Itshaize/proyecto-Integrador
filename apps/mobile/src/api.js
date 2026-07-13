const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api";
let token = "";
const setApiToken = (value) => {
  token = value;
};
async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { "Content-Type": "application/json", ...token ? { Authorization: `Bearer ${token}` } : {}, ...options.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(body.message ?? "No pudimos conectar con el servidor.", response.status, body.errors);
  return body;
}
class ApiError extends Error {
  constructor(message, status, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
  status;
  errors;
}
const api = {
  register: (data) => request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (correo, password) => request("/auth/login", { method: "POST", body: JSON.stringify({ correo, password }) }),
  me: () => request("/auth/me"),
  adults: () => request("/adults"),
  adult: (id) => request(`/adults/${id}`),
  createAdult: (data) => request(`/adults`, { method: "POST", body: JSON.stringify(data) }),
  updateAdult: (id, data) => request(`/adults/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  geocode: (direccion) => request("/geocoding/address", { method: "POST", body: JSON.stringify({ direccion }) }),
  latestLocation: (adultId) => request(`/locations/${adultId}/latest`),
  saveLocation: (data) => request("/locations", { method: "POST", body: JSON.stringify(data) }),
  safeZone: (adultId) => request(`/safe-zones/${adultId}`),
  createSafeZone: (data) => request("/safe-zones", { method: "POST", body: JSON.stringify(data) }),
  updateSafeZone: (id, data) => request(`/safe-zones/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteSafeZone: (id) => request(`/safe-zones/${id}`, { method: "DELETE" }),
  alerts: (adultId) => request(`/alerts/${adultId}`),
  createAlert: (data) => request("/alerts", { method: "POST", body: JSON.stringify(data) }),
  updateAlert: (id, estado) => request(`/alerts/${id}/status`, { method: "PUT", body: JSON.stringify({ estado }) }),
  contacts: (adultId) => request(`/contacts/${adultId}`),
  route: (origin, destination) => request("/routes", { method: "POST", body: JSON.stringify({ origin, destination }) }),
  nearbyPlaces: (latitude, longitude, categoria) => request("/nearby-places", { method: "POST", body: JSON.stringify({ latitude, longitude, categoria }) })
};
export {
  ApiError,
  api,
  setApiToken
};

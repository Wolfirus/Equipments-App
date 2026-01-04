import axios from "axios";

const baseURL =
  (process.env.REACT_APP_API_URL || "").replace(/\/$/, "") || "http://localhost:5000/api";

const client = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default client;

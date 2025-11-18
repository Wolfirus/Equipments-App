import axios from "axios";

const client = axios.create({
  baseURL: "http://localhost:5000/api",
});

// helper pour ajouter le token facilement
export const authHeader = (token) =>
  token ? { Authorization: `Bearer ${token}` } : {};

export default client;

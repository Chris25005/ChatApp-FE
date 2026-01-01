import axios from "axios";

export const API_URL = "https://chatapp-be-1-jety.onrender.com";

const api = axios.create({
  baseURL: API_URL,
  timeout: 20000, // Render cold start safe
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;

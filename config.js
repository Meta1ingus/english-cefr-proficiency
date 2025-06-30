// config.js

const host = window.location.hostname;

export const API_BASE_URL = (
  host === "localhost" || host === "127.0.0.1"
)
  ? "http://localhost:8000"                      // Local dev FastAPI
  : "https://your-api-name.onrender.com";        // 🔁 Replace this with your real Render backend URL

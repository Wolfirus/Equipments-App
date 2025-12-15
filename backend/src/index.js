// backend/src/index.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db"); // assure-toi que ce fichier existe et exporte une fonction

// Routes (adapte selon tes noms exacts dans src/routes)
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const profileRoutes = require("./routes/profileRoutes");
const equipmentRoutes = require("./routes/equipmentRoutes");
const reservationRoutes = require("./routes/reservationRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const messageRoutes = require("./routes/messageRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

// --- Middlewares ---
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// --- Healthcheck ---
app.get("/", (req, res) => {
  res.json({ success: true, message: "API is running" });
});

app.get("/api/health", (req, res) => {
  res.json({ success: true, status: "ok" });
});

// --- Routes API ---
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/profile", profileRoutes);

app.use("/api/categories", categoryRoutes);

// ⚠️ IMPORTANT: ces 2 routes doivent exister
app.use("/api/equipment", equipmentRoutes);
app.use("/api/reservations", reservationRoutes);

app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);

// --- 404 ---
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route introuvable: ${req.method} ${req.originalUrl}`,
  });
});

// --- Error handler global ---
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Erreur serveur",
  });
});

// --- Start ---
const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectDB();
    app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
})();

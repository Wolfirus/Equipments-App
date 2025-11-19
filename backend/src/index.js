const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function ensureDefaultAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn("ADMIN_EMAIL or ADMIN_PASSWORD missing in .env");
    return;
  }

  const existingAdmin = await User.findOne({ role: "admin" });

  if (existingAdmin) {
    console.log("Admin user already exists:", existingAdmin.email);
    return;
  }

  await User.create({
    name: "Administrateur",
    email,
    password,   // 👈 plain password, hook will hash
    role: "admin",
  });

  console.log("✅ Default admin created:", email);
}



dotenv.config();

const app = express();

// DB
connectDB();

// middlewares
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));

// health check
app.get("/", (req, res) => {
  res.send("API equipements OK");
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // 1) Connexion à MongoDB
    await connectDB();

    // 2) Création de l'admin par défaut si besoin
    await ensureDefaultAdmin();

    // 3) Lancer le serveur
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();


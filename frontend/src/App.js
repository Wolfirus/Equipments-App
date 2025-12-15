// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./layout/AppLayout";

// pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";
import SupervisorDashboard from "./pages/SupervisorDashboard";
import UserDashboard from "./pages/UserDashboard";
import Contact from "./pages/Contact";
import About from "./pages/About";
import AdminMessages from "./pages/AdminMessages";

import EquipmentCatalog from "./pages/EquipmentCatalog";
import ReservationManagement from "./pages/ReservationManagement";
import ProfilePage from "./pages/ProfilePage";

import "./index.css";
import "./App.css";

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app-root">
          <Navbar />

          <Routes>
            {/* PUBLIC */}
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* EQUIPMENT */}
            <Route
              path="/equipment"
              element={
                <ProtectedRoute roles={["user", "supervisor", "admin"]}>
                  <AppLayout>
                    <EquipmentCatalog />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/equipment/:id"
              element={
                <ProtectedRoute roles={["user", "supervisor", "admin"]}>
                  <AppLayout>
                    <EquipmentCatalog />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* RESERVATIONS */}
            {/* ✅ keep your broader access to avoid conflict with user flow */}
            <Route
              path="/reservations"
              element={
                <ProtectedRoute roles={["user", "supervisor", "admin"]}>
                  <AppLayout>
                    <ReservationManagement />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* PROFILE */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute roles={["user", "supervisor", "admin"]}>
                  <AppLayout>
                    <ProfilePage />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* ADMIN */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AppLayout>
                    <AdminDashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* ✅ protect messages (your teammate’s version had it public) */}
            <Route
              path="/admin/messages"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AppLayout>
                    <AdminMessages />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* SUPERVISOR */}
            <Route
              path="/supervisor"
              element={
                <ProtectedRoute roles={["supervisor", "admin"]}>
                  <AppLayout>
                    <SupervisorDashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* USER */}
            <Route
              path="/user"
              element={
                <ProtectedRoute roles={["user", "supervisor", "admin"]}>
                  <AppLayout>
                    <UserDashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />

            {/* FALLBACK */}
            <Route path="*" element={<Home />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;

// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./layout/DashboardLayout";

// pages public
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import About from "./pages/About";
import Contact from "./pages/Contact";

// pages communes
import EquipmentCatalog from "./pages/EquipmentCatalog";
import ProfilePage from "./pages/ProfilePage";

// pages user
import ReservationManagement from "./pages/ReservationManagement";
import UserDashboard from "./pages/UserDashboard";

// pages admin (réutilisées par supervisor)
import AdminDashboard from "./pages/AdminDashboard";
import AdminMessages from "./pages/AdminMessages";
import AdminEquipments from "./pages/AdminEquipments";
import AdminReservations from "./pages/AdminReservations";

// pages supervisor (optionnel: tu peux garder un dashboard supervisor séparé)
import SupervisorDashboard from "./pages/SupervisorDashboard";

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <DashboardLayout>
          <Routes>
            {/* PUBLIC */}
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* COMMUN (user/supervisor/admin) */}
            <Route
              path="/equipment"
              element={
                <ProtectedRoute roles={["user", "supervisor", "admin"]}>
                  <EquipmentCatalog />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute roles={["user", "supervisor", "admin"]}>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />

            {/* USER */}
            <Route
              path="/user"
              element={
                <ProtectedRoute roles={["user", "admin"]}>
                  <UserDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reservations"
              element={
                <ProtectedRoute roles={["user", "admin"]}>
                  <ReservationManagement />
                </ProtectedRoute>
              }
            />

            {/* SUPERVISOR (dashboard optionnel) */}
            <Route
              path="/supervisor"
              element={
                <ProtectedRoute roles={["supervisor", "admin"]}>
                  <SupervisorDashboard />
                </ProtectedRoute>
              }
            />

            {/* ✅ GESTION = mêmes pages admin, accessibles admin + supervisor */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={["admin", "supervisor"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/equipments"
              element={
                <ProtectedRoute roles={["admin", "supervisor"]}>
                  <AdminEquipments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reservations"
              element={
                <ProtectedRoute roles={["admin", "supervisor"]}>
                  <AdminReservations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/messages"
              element={
                <ProtectedRoute roles={["admin", "supervisor"]}>
                  <AdminMessages />
                </ProtectedRoute>
              }
            />

            {/* FALLBACK */}
            <Route path="*" element={<Home />} />
          </Routes>
        </DashboardLayout>
      </AuthProvider>
    </Router>
  );
}

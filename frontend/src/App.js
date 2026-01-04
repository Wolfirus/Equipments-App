import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./layout/DashboardLayout";

// pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";
import AdminMessages from "./pages/AdminMessages";
import EquipmentCatalog from "./pages/EquipmentCatalog";
import ReservationManagement from "./pages/ReservationManagement";
import ProfilePage from "./pages/ProfilePage";
import Contact from "./pages/Contact";
import About from "./pages/About";
import SupervisorDashboard from "./pages/SupervisorDashboard";
import UserDashboard from "./pages/UserDashboard";

// admin management pages
import AdminEquipments from "./pages/AdminEquipments";
import AdminReservations from "./pages/AdminReservations";

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <DashboardLayout>
          <Routes>
            {/* public */}
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* protected: user/supervisor/admin */}
            <Route
              path="/equipment"
              element={
                <ProtectedRoute roles={["user", "supervisor", "admin"]}>
                  <EquipmentCatalog />
                </ProtectedRoute>
              }
            />
            <Route
              path="/equipment/:id"
              element={
                <ProtectedRoute roles={["user", "supervisor", "admin"]}>
                  <EquipmentCatalog />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reservations"
              element={
                <ProtectedRoute roles={["user", "supervisor", "admin"]}>
                  <ReservationManagement />
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

            {/* admin */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/equipments"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminEquipments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reservations"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminReservations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/messages"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminMessages />
                </ProtectedRoute>
              }
            />

            {/* supervisor */}
            <Route
              path="/supervisor"
              element={
                <ProtectedRoute roles={["supervisor", "admin"]}>
                  <SupervisorDashboard />
                </ProtectedRoute>
              }
            />

            {/* user */}
            <Route
              path="/user"
              element={
                <ProtectedRoute roles={["user", "supervisor", "admin"]}>
                  <UserDashboard />
                </ProtectedRoute>
              }
            />

            {/* fallback */}
            <Route path="*" element={<Home />} />
          </Routes>
        </DashboardLayout>
      </AuthProvider>
    </Router>
  );
}

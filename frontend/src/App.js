import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Layouts
import RootLayout from "./layout/RootLayout";
import DashboardLayout from "./layout/DashboardLayout";

// Public pages
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Register from "./pages/Register";

// Private pages
import EquipmentCatalog from "./pages/EquipmentCatalog";
import ReservationManagement from "./pages/ReservationManagement";
import ProfilePage from "./pages/ProfilePage";
import NotificationsPage from "./pages/NotificationsPage";

// Admin / Manager pages
import AdminDashboard from "./pages/AdminDashboard";
import AdminEquipments from "./pages/AdminEquipments";
import AdminReservations from "./pages/AdminReservations";
import AdminMessages from "./pages/AdminMessages";

// Dashboard Home (role-based)
import DashboardHome from "./pages/DashboardHome";

export default function App() {
  const managerRoles = ["admin", "supervisor"];

  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* PUBLIC LAYOUT */}
          <Route element={<RootLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Public About/Contact (visitors) */}
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
          </Route>

          {/* DASHBOARD (SIDEBAR) LAYOUT */}
          <Route
            element={
              <ProtectedRoute roles={["user", "supervisor", "admin"]}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            {/* ✅ MAIN HOME INSIDE SIDEBAR */}
            <Route path="/dashboard" element={<DashboardHome />} />

            {/* ✅ Dashboard versions so sidebar stays visible */}
            <Route path="/dashboard/about" element={<About />} />
            <Route path="/dashboard/contact" element={<Contact />} />

            {/* User features */}
            <Route path="/equipment" element={<EquipmentCatalog />} />
            <Route path="/equipment/:id" element={<EquipmentCatalog />} />
            <Route path="/reservations" element={<ReservationManagement />} />

            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/notifications" element={<NotificationsPage />} />

            {/* Manager/Admin area */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={managerRoles}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/equipments"
              element={
                <ProtectedRoute roles={managerRoles}>
                  <AdminEquipments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reservations"
              element={
                <ProtectedRoute roles={managerRoles}>
                  <AdminReservations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/messages"
              element={
                <ProtectedRoute roles={managerRoles}>
                  <AdminMessages />
                </ProtectedRoute>
              }
            />

            {/* Old/legacy dashboard routes → redirect to /dashboard */}
            <Route path="/user" element={<Navigate to="/dashboard" replace />} />
            <Route path="/supervisor" element={<Navigate to="/dashboard" replace />} />
          </Route>

          {/* fallback */}
          <Route path="*" element={<Home />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

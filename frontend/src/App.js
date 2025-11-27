import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

// Existing pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Contact from "./pages/Contact";
import About from "./pages/About";
import AdminMessages from "./pages/AdminMessages";

// New pages - to be created
import EquipmentCatalog from "./pages/EquipmentCatalog";
import ReservationManagement from "./pages/ReservationManagement";
import ProfilePage from "./pages/ProfilePage";

// Enhanced dashboard pages - to be created
import AdminDashboard from "./pages/AdminDashboard";
import SupervisorDashboard from "./pages/SupervisorDashboard";
import UserDashboard from "./pages/UserDashboard";

import "./index.css";

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app-root">
          <Navbar />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />

            {/* Auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Equipment catalog - all authenticated users */}
            <Route
              path="/equipment"
              element={
                <ProtectedRoute roles={["user", "supervisor", "admin"]}>
                  <EquipmentCatalog />
                </ProtectedRoute>
              }
            />

            {/* Equipment details - all authenticated users */}
            <Route
              path="/equipment/:id"
              element={
                <ProtectedRoute roles={["user", "supervisor", "admin"]}>
                  {/* This will be handled within EquipmentCatalog component */}
                </ProtectedRoute>
              }
            />

            {/* Reservations - all authenticated users */}
            <Route
              path="/reservations"
              element={
                <ProtectedRoute roles={["user", "supervisor", "admin"]}>
                  <ReservationManagement />
                </ProtectedRoute>
              }
            />

            {/* Reservation details - all authenticated users */}
            <Route
              path="/reservations/:id"
              element={
                <ProtectedRoute roles={["user", "supervisor", "admin"]}>
                  {/* This will be handled within ReservationManagement component */}
                </ProtectedRoute>
              }
            />

            {/* Profile - all authenticated users */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute roles={["user", "supervisor", "admin"]}>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />

            {/* Admin dashboard */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Admin analytics */}
            <Route
              path="/admin/analytics"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Admin messages */}
            <Route
              path="/admin/messages"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminMessages />
                </ProtectedRoute>
              }
            />

            {/* Supervisor dashboard */}
            <Route
              path="/supervisor"
              element={
                <ProtectedRoute roles={["supervisor", "admin"]}>
                  <SupervisorDashboard />
                </ProtectedRoute>
              }
            />

            {/* User dashboard */}
            <Route
              path="/user"
              element={
                <ProtectedRoute roles={["user", "supervisor", "admin"]}>
                  <UserDashboard />
                </ProtectedRoute>
              }
            />

            {/* Legacy routes for backward compatibility */}
            <Route path="*" element={<Home />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;

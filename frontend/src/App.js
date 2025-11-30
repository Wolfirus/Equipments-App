import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";
import SupervisorDashboard from "./pages/SupervisorDashboard";
import UserDashboard from "./pages/UserDashboard";
import UserAccount from "./pages/UserAccount"; // ajout
import Contact from "./pages/Contact";
import About from "./pages/About";
import AdminMessages from "./pages/AdminMessages";

import "./index.css";

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app-root">
          <Navbar />

          <Routes>
            {/* PUBLIC ROUTES */}
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* USER ACCOUNT ROUTE */}
            <Route
              path="/account"
              element={
                <ProtectedRoute roles={["user", "supervisor", "admin"]}>
                  <UserAccount />
                </ProtectedRoute>
              }
            />

            {/* PROTECTED ADMIN ROUTES */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminDashboard />
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

            {/* SUPERVISOR ROUTE */}
            <Route
              path="/supervisor"
              element={
                <ProtectedRoute roles={["supervisor", "admin"]}>
                  <SupervisorDashboard />
                </ProtectedRoute>
              }
            />

            {/* USER ROUTE */}
            <Route
              path="/user"
              element={
                <ProtectedRoute roles={["user", "supervisor", "admin"]}>
                  <UserDashboard />
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

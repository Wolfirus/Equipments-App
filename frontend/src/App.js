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

import "./index.css";

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app-root">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />

            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/supervisor"
              element={
                <ProtectedRoute roles={["supervisor", "admin"]}>
                  <SupervisorDashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/user"
              element={
                <ProtectedRoute roles={["user", "supervisor", "admin"]}>
                  <UserDashboard />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Home />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;

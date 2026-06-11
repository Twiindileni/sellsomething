import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProductProvider } from "./context/ProductContext";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import ListingDetail from "./pages/ListingDetail";
import SellPage from "./pages/SellPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import AuthCallback from "./pages/AuthCallback";
import DashboardPage from "./pages/DashboardPage";
import EmployeeDirectory from "./pages/EmployeeDirectory";
import EmployeeDetail from "./pages/EmployeeDetail";
import AdminPage from "./pages/AdminPage";
import "./App.css";

export default function App() {
  return (
    <AuthProvider>
      <ProductProvider>
        <Router>
          <div className="app">
            <Navbar />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/listing/:id" element={<ListingDetail />} />
                <Route
                  path="/sell"
                  element={
                    <ProtectedRoute>
                      <SellPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/professionals" element={<EmployeeDirectory />} />
                <Route path="/professionals/:id" element={<EmployeeDetail />} />
                <Route
                  path="/professionals/register"
                  element={<Navigate to="/sell?type=service" replace />}
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <AdminPage />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </main>
          </div>
        </Router>
      </ProductProvider>
    </AuthProvider>
  );
}

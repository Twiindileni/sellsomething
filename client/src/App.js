import React from "react";
import { Analytics } from "@vercel/analytics/react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
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
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import EmployeeDirectory from "./pages/EmployeeDirectory";
import EmployeeDetail from "./pages/EmployeeDetail";
import AdminPage from "./pages/AdminPage";
import HelpSupportPage from "./pages/HelpSupportPage";
import AboutPage from "./pages/AboutPage";
import HowItWorksPage from "./pages/HowItWorksPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import Footer from "./components/Footer";
import CampaignPopupModal from "./components/CampaignPopupModal";
import MobileNav from "./components/MobileNav";
import "./App.css";
import "./mobile-redesign.css";

export default function App() {
  return (
    <HelmetProvider>
    <AuthProvider>
      <ProductProvider>
        <Router>
          <div className="app">
            <Navbar />
            <CampaignPopupModal />
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
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
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
                <Route path="/help" element={<HelpSupportPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/how-it-works" element={<HowItWorksPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
              </Routes>
            </main>
            <Footer />
            <MobileNav />
          </div>
        </Router>
        <Analytics />
      </ProductProvider>
    </AuthProvider>
    </HelmetProvider>
  );
}

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getEmployees } from "../services/api";
import EmployeeCard from "../components/EmployeeCard";
import { useAuth } from "../context/AuthContext";
import "./EmployeeDirectory.css";

const CATEGORIES = [
  "All",
  "Nanny",
  "Gardener",
  "IT",
  "Painter",
  "Builder",
  "Plumber",
  "Electrician",
  "Cleaner",
  "Other"
];

export default function EmployeeDirectory() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    setLoading(true);
    getEmployees({ category, search })
      .then((res) => setEmployees(res.data || []))
      .catch((err) => console.error("Failed to load professionals:", err))
      .finally(() => setLoading(false));
  }, [category, search]);

  return (
    <div className="directory-page">
      <header className="directory-hero">
        <h1 className="directory-hero-title">Find Trusted Professionals</h1>
        <p className="directory-hero-subtitle">
          Browse verified service providers, check their references, and read reviews.
        </p>
        
        <div className="directory-search">
          <input
            type="text"
            placeholder="Search by name or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      <section className="directory-categories">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`directory-category-btn ${category === cat ? "active" : ""}`}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </section>

      <section className="directory-content">
        <div className="directory-section-header">
          <h2 className="directory-section-title">Available Professionals</h2>
          {user && (
            <Link to="/sell?type=service" className="submit-btn" style={{ width: "auto", padding: "0.6rem 1.25rem", fontSize: "0.9rem" }}>
              + Offer Your Service
            </Link>
          )}
        </div>

        {loading ? (
          <div className="loading-wrap">
            <div className="spinner" />
            Loading professionals...
          </div>
        ) : employees.length === 0 ? (
          <div className="empty-state">
            <h3>No professionals found.</h3>
            <p>Try adjusting your search or category.</p>
          </div>
        ) : (
          <div className="directory-grid">
            {employees.map((employee) => (
              <EmployeeCard key={employee.id} employee={employee} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

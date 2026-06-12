import React from "react";
import { Link } from "react-router-dom";
import { isCurrentlyBoosted } from "../utils/boostHelpers";

const PROFESSION_ICONS = {
  Nanny: "👶",
  Gardener: "🌿",
  IT: "💻",
  Painter: "🎨",
  Builder: "🔨",
  Plumber: "🚰",
  Electrician: "⚡",
  Cleaner: "🧹",
  Other: "💼"
};

export default function EmployeeCard({ employee }) {
  const icon = PROFESSION_ICONS[employee.profession] || "💼";
  const cover = employee.image || (employee.images && employee.images[0]);
  const sponsored = isCurrentlyBoosted(employee);

  return (
    <Link to={`/professionals/${employee.id}`} className={`product-card employee-card${sponsored ? " product-card--sponsored" : ""}`}>
      {cover ? (
        <>
          <img src={cover} alt={employee.name} className="card-img" />
          {sponsored && <span className="sponsored-badge">Sponsored</span>}
        </>
      ) : (
        <div className="card-img-placeholder" style={{ background: "var(--sand)" }}>
          {sponsored && <span className="sponsored-badge">Sponsored</span>}
          {icon}
        </div>
      )}
      <div className="card-body">
        <div className="card-header-flex">
          <span className="card-cat">{employee.profession}</span>
          <div className="employee-rating-badge" title={`${employee.rating} stars out of 5`}>
            {employee.rating > 0 ? (
              <>
                <span style={{ color: "#f59e0b", marginRight: "4px" }}>★</span>
                {Number(employee.rating).toFixed(1)} 
                <span style={{ fontSize: "0.8rem", color: "var(--muted)", marginLeft: "4px" }}>
                  ({employee.review_count})
                </span>
              </>
            ) : (
              <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>New</span>
            )}
          </div>
        </div>
        <h3 className="card-title" style={{ marginTop: '0.5rem' }}>{employee.name}</h3>
        {employee.description && (
          <p className="card-desc" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {employee.description}
          </p>
        )}
        <div className="card-footer" style={{ marginTop: '1rem', borderTop: '1px solid var(--clay-light)', paddingTop: '0.5rem' }}>
          {employee.location && (
            <span className="card-location">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="7" r="3"/>
              </svg>
              {employee.location}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

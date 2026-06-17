import React from "react";
import { Link } from "react-router-dom";
import { isCurrentlyBoosted } from "../utils/boostHelpers";
import { 
  Baby, Leaf, Laptop, Paintbrush, Hammer, Droplets, Zap, Sparkles, Briefcase, 
  MapPin, Star 
} from "lucide-react";

const PROFESSION_ICONS = {
  Nanny: Baby,
  Gardener: Leaf,
  IT: Laptop,
  Painter: Paintbrush,
  Builder: Hammer,
  Plumber: Droplets,
  Electrician: Zap,
  Cleaner: Sparkles,
  Other: Briefcase
};

export default function EmployeeCard({ employee }) {
  const IconComponent = PROFESSION_ICONS[employee.profession] || Briefcase;
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
          <IconComponent size={64} strokeWidth={1.5} color="currentColor" />
        </div>
      )}
      <div className="card-body">
        <div className="card-header-flex">
          <span className="card-cat">{employee.profession}</span>
          <div className="employee-rating-badge" title={`${employee.rating} stars out of 5`}>
            {employee.rating > 0 ? (
              <>
                <Star size={14} fill="#f59e0b" color="#f59e0b" style={{ marginRight: "4px", position: "relative", top: "2px" }} />
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
              <MapPin size={12} strokeWidth={2.5} />
              {employee.location}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

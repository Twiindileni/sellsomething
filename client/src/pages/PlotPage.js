import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { getProducts } from "../services/api";
import SEO from "../components/SEO";
import { Map, MapPin, Search, PlusCircle, Calendar, Ruler } from "lucide-react";
import "./PropertyPages.css";

const LOCATIONS = [
  "All Locations",
  "Windhoek", "Walvis Bay", "Swakopmund", "Oshakati", "Rundu",
  "Katima Mulilo", "Keetmanshoop", "Lüderitz", "Otjiwarongo",
  "Grootfontein", "Gobabis", "Rehoboth", "Mariental", "Other",
];

function formatPrice(price) {
  return "N$ " + Number(price).toLocaleString("en-NA", { minimumFractionDigits: 0 });
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-NA", { day: "numeric", month: "short" });
}

function SkeletonCard() {
  return (
    <div className="prop-skeleton">
      <div className="prop-skeleton-img" />
      <div className="prop-skeleton-body">
        <div className="prop-skeleton-line" style={{ width: "60%" }} />
        <div className="prop-skeleton-line" style={{ width: "40%" }} />
        <div className="prop-skeleton-line" style={{ width: "80%" }} />
      </div>
    </div>
  );
}

export default function PlotPage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("All Locations");

  const load = useCallback(() => {
    setLoading(true);
    getProducts({ category: "Plot" })
      .then((res) => setListings(res.data || []))
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = listings.filter((l) => {
    const matchSearch = !search.trim() || l.title?.toLowerCase().includes(search.toLowerCase()) || l.description?.toLowerCase().includes(search.toLowerCase());
    const matchLocation = location === "All Locations" || l.location === location;
    return matchSearch && matchLocation;
  });

  return (
    <>
      <SEO
        title="Plots & Land for Sale in Namibia | SellSomething"
        description="Buy and sell land and plots across Namibia. Find residential, commercial and agricultural plots at SellSomething marketplace."
        url="/plots"
      />

      <div className="prop-page">
        {/* Hero */}
        <section className="prop-hero">
          <div className="prop-hero-icon">
            <Map size={32} strokeWidth={1.5} />
          </div>
          <h1 className="prop-hero-title">
            Find <em>land & plots</em><br />for sale in Namibia
          </h1>
          <p className="prop-hero-sub">
            Browse residential, commercial and agricultural plots across Namibia's regions
          </p>
          <div className="prop-hero-stats">
            <div className="prop-hero-stat">
              <span className="prop-hero-stat-num">{listings.length}</span>
              <span className="prop-hero-stat-label">Plots Listed</span>
            </div>
            <div className="prop-hero-stat">
              <span className="prop-hero-stat-num">14</span>
              <span className="prop-hero-stat-label">Regions</span>
            </div>
            <div className="prop-hero-stat">
              <span className="prop-hero-stat-num">Secure</span>
              <span className="prop-hero-stat-label">Escrow Payment</span>
            </div>
          </div>
        </section>

        {/* Filters */}
        <div className="prop-filters">
          <div className="prop-filters-inner">
            <div className="prop-search-wrap">
              <Search size={16} className="prop-search-icon" />
              <input
                className="prop-search-input"
                type="text"
                placeholder="Search plots..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="prop-filter-select"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <span className="prop-results-count">
              {loading ? "Loading..." : `${filtered.length} plot${filtered.length !== 1 ? "s" : ""} found`}
            </span>
          </div>
        </div>

        {/* Grid */}
        <div className="prop-content">
          {loading ? (
            <div className="prop-loading">
              {[1,2,3,4,5,6].map((i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="prop-grid">
              {filtered.length === 0 ? (
                <div className="prop-empty">
                  <div className="prop-empty-icon">
                    <Map size={36} strokeWidth={1.5} />
                  </div>
                  <h2 className="prop-empty-title">No plots found</h2>
                  <p className="prop-empty-sub">
                    {search || location !== "All Locations"
                      ? "Try adjusting your search or location filter"
                      : "Be the first to list a plot for sale in Namibia!"}
                  </p>
                  <Link to="/sell?type=plot" className="prop-empty-btn">
                    <PlusCircle size={18} /> List a Plot
                  </Link>
                </div>
              ) : (
                filtered.map((listing) => {
                  const images = Array.isArray(listing.images) ? listing.images : [];
                  const img = images[0] || listing.image || null;
                  return (
                    <Link key={listing.id} to={`/listing/${listing.id}`} className="prop-card">
                      <div className="prop-card-img-wrap">
                        {img ? (
                          <img src={img} alt={listing.title} className="prop-card-img" />
                        ) : (
                          <div className="prop-card-img-placeholder">
                            <Map size={48} strokeWidth={1} />
                          </div>
                        )}
                        <span className="prop-card-badge plot">Plot</span>
                      </div>
                      <div className="prop-card-body">
                        <h3 className="prop-card-title">{listing.title}</h3>
                        {listing.location && (
                          <p className="prop-card-location">
                            <MapPin size={13} /> {listing.location}
                          </p>
                        )}
                        {listing.description && (
                          <p className="prop-card-desc">{listing.description}</p>
                        )}
                      </div>
                      <div className="prop-card-footer">
                        <div>
                          <span className="prop-card-price">{formatPrice(listing.price)}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {listing.created_at && (
                            <span style={{ fontSize: "0.78rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "3px" }}>
                              <Calendar size={12} /> {timeAgo(listing.created_at)}
                            </span>
                          )}
                          <span className="prop-card-cta">View →</span>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* CTA banner */}
        <div className="prop-cta-banner">
          <h2>Have land or a plot to sell?</h2>
          <p>List your plot and reach serious buyers across Namibia — safe escrow payments included</p>
          <Link to="/sell?type=plot" className="prop-cta-btn">
            <PlusCircle size={18} /> List Your Plot
          </Link>
        </div>
      </div>
    </>
  );
}

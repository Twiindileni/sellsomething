import React, { useEffect, useState, useCallback } from "react";
import { useProducts } from "../context/ProductContext";
import ProductCard from "../components/ProductCard";

const LOCATIONS = [
  "Windhoek",
  "Walvis Bay",
  "Swakopmund",
  "Oshakati",
  "Rundu",
  "Katima Mulilo",
  "Keetmanshoop",
  "Lüderitz",
  "Otjiwarongo",
  "Grootfontein",
  "Gobabis",
  "Rehoboth",
  "Mariental",
];

export default function Home() {
  const { products, categories, loading, error, fetchProducts, fetchCategories } = useProducts();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [location, setLocation] = useState("");
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const loadProducts = useCallback(() => {
    const params = {};
    if (activeCategory !== "All") params.category = activeCategory;
    if (search.trim()) params.search = search.trim();
    if (minPrice) params.minPrice = minPrice;
    if (maxPrice) params.maxPrice = maxPrice;
    if (location) params.location = location;
    if (sort) params.sort = sort;
    fetchProducts(params);
  }, [activeCategory, search, minPrice, maxPrice, location, sort, fetchProducts]);

  useEffect(() => {
    loadProducts();
  }, [activeCategory, location, sort]); // eslint-disable-line

  function handleSearchSubmit(e) {
    e.preventDefault();
    loadProducts();
  }

  function handleResetFilters() {
    setMinPrice("");
    setMaxPrice("");
    setLocation("");
    setSort("newest");
    setSearch("");
    const params = {};
    if (activeCategory !== "All") params.category = activeCategory;
    fetchProducts(params);
  }

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <h1 className="hero-title">
          Buy &amp; sell <em>anything</em><br />in Namibia
        </h1>
        <p className="hero-sub">Post a free ad and reach buyers across the country</p>
        <form className="search-wrap" onSubmit={handleSearchSubmit}>
          <input
            className="search-input"
            type="text"
            placeholder="Search listings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="search-btn">Search</button>
        </form>
        <button
          type="button"
          className="filters-toggle-btn"
          onClick={() => setShowFilters(!showFilters)}
        >
          ⚙️ {showFilters ? "Hide Filters" : "Filter & Sort"}
        </button>
      </section>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div style={{ maxWidth: "1200px", margin: "1.5rem auto 0", padding: "0 2rem" }}>
          <form onSubmit={handleSearchSubmit} className="filters-panel">
            <div className="filter-group">
              <label htmlFor="location-filter">Location</label>
              <select
                id="location-filter"
                className="form-input"
                style={{ padding: "0.6rem 1rem", fontSize: "0.95rem" }}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              >
                <option value="">All Namibia</option>
                {LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Price (N$)</label>
              <div className="filter-input-row">
                <input
                  type="number"
                  placeholder="Min"
                  className="form-input"
                  style={{ padding: "0.6rem 1rem", fontSize: "0.95rem" }}
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  aria-label="Minimum price"
                />
                <span style={{ color: "var(--muted)" }}>-</span>
                <input
                  type="number"
                  placeholder="Max"
                  className="form-input"
                  style={{ padding: "0.6rem 1rem", fontSize: "0.95rem" }}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  aria-label="Maximum price"
                />
              </div>
            </div>

            <div className="filter-group">
              <label htmlFor="sort-filter">Sort By</label>
              <select
                id="sort-filter"
                className="form-input"
                style={{ padding: "0.6rem 1rem", fontSize: "0.95rem" }}
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="likes_desc">Popularity (Likes)</option>
              </select>
            </div>

            <div className="filter-actions">
              <button
                type="button"
                className="cat-btn"
                onClick={handleResetFilters}
              >
                Reset
              </button>
              <button
                type="submit"
                className="search-btn"
                style={{ padding: "0.75rem 1.75rem", fontSize: "0.95rem" }}
              >
                Apply Filters
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Category Strip */}
      <div className="categories-section">
        <div className="category-strip">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`cat-btn${activeCategory === cat ? " active" : ""}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="products-section">
        <div className="section-header">
          <h2 className="section-title">
            {activeCategory === "All" ? "Latest Listings" : activeCategory}
          </h2>
          <span className="section-count">{products.length} ad{products.length !== 1 ? "s" : ""}</span>
        </div>

        {loading && (
          <div className="loading-wrap">
            <div className="spinner" />
            Loading listings…
          </div>
        )}

        {error && !loading && (
          <div className="error-wrap">{error}</div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="empty-wrap">
            <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🌵</div>
            No listings found. Be the first to post one!
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="products-grid">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

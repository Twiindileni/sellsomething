import React, { useEffect, useState, useCallback } from "react";
import { useProducts } from "../context/ProductContext";
import ProductCard from "../components/ProductCard";

export default function Home() {
  const { products, categories, loading, error, fetchProducts, fetchCategories } = useProducts();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const loadProducts = useCallback(() => {
    const params = {};
    if (activeCategory !== "All") params.category = activeCategory;
    if (search.trim()) params.search = search.trim();
    fetchProducts(params);
  }, [activeCategory, search, fetchProducts]);

  useEffect(() => {
    loadProducts();
  }, [activeCategory]); // eslint-disable-line

  function handleSearchSubmit(e) {
    e.preventDefault();
    loadProducts();
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
      </section>

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

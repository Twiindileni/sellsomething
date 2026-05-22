import React, { createContext, useContext, useState, useCallback } from "react";
import { getProducts, getCategories, deleteProduct } from "../services/api";

const ProductContext = createContext();

export function ProductProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProducts = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getProducts(params);
      setProducts(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await getCategories();
      setCategories(["All", ...res.data]);
    } catch {
      setCategories(["All"]);
    }
  }, []);

  const removeProduct = useCallback(async (id) => {
    await deleteProduct(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return (
    <ProductContext.Provider
      value={{ products, categories, loading, error, fetchProducts, fetchCategories, removeProduct }}
    >
      {children}
    </ProductContext.Provider>
  );
}

export const useProducts = () => useContext(ProductContext);

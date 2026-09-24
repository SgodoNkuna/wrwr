import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { Category, Product } from "./types";

export function useCatalogue() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [c, p] = await Promise.all([
        supabase.from("categories").select("*").eq("published", true).order("sort_order"),
        supabase.from("products").select("*, categories(slug, name)").eq("published", true).order("sort_order"),
      ]);
      if (c.error || p.error) setError("We couldn't load the catalogue. Please refresh or WhatsApp us.");
      setCategories(c.data ?? []);
      setProducts((p.data as Product[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return { categories, products, loading, error };
}

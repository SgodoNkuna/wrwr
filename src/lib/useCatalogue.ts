import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { Category, Product } from "./types";

export function useCatalogue() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animalCounts, setAnimalCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const [c, p, a] = await Promise.all([
        supabase.from("categories").select("*").eq("published", true).order("sort_order"),
        supabase.from("products").select("*, categories(slug, name)").eq("published", true).order("sort_order"),
        supabase.from("animals").select("product_id, quantity").eq("published", true).eq("status", "available"),
      ]);
      const counts: Record<string, number> = {};
      for (const row of (a.data ?? []) as { product_id: string; quantity: number }[]) counts[row.product_id] = (counts[row.product_id] ?? 0) + row.quantity;
      setAnimalCounts(counts);
      if (c.error || p.error) setError("We couldn't load the catalogue. Please refresh or WhatsApp us.");
      setCategories(c.data ?? []);
      setProducts((p.data as Product[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return { categories, products, loading, error, animalCounts };
}

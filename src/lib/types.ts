export type Role = "admin" | "editor";

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  published: boolean;
}

export interface Product {
  id: string;
  category_id: string | null;
  slug: string;
  name: string;
  summary: string | null;
  description: string | null;
  image_url: string | null;
  unit: string | null;
  price_cents: number | null;
  show_price: boolean;
  in_stock: boolean;
  featured: boolean;
  published: boolean;
  highlights: string[];
  sort_order: number;
  categories?: Pick<Category, "slug" | "name"> | null;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  published: boolean;
  sort_order: number;
}

export interface Enquiry {
  id: string;
  product_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  message: string;
  quantity: string | null;
  status: "new" | "contacted" | "closed";
  admin_notes: string | null;
  consent_at: string | null;
  created_at: string;
  products?: Pick<Product, "name"> | null;
}

export interface BusinessSettings {
  name: string;
  tagline: string;
  phone: string;
  alt_phone: string;
  whatsapp: string;
  email: string;
  address: string;
  hours: string;
  map_query: string;
  legal_name: string;
  registration_number: string;
  information_officer: string;
}

export interface HomeSettings {
  hero_title: string;
  hero_subtitle: string;
  announcement: string;
}

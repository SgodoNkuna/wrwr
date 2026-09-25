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
  orderable: boolean;
  stock_qty: number | null;
  max_per_order: number;
  updated_at?: string;
  price_updated_at?: string;
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

export type OrderStatus = "new" | "confirmed" | "ready" | "completed" | "cancelled";
export type PaymentStatus = "unpaid" | "pending" | "paid" | "refunded" | "failed";
export type PaymentMethod = "payfast" | "eft" | "cash";

export interface OrderItem {
  id?: number;
  product_id?: string | null;
  product_name?: string;
  name?: string;
  unit: string | null;
  unit_price_cents?: number;
  quantity: number;
  line_total_cents: number;
}

export interface Order {
  id: string;
  reference: string;
  customer_id: string | null;
  customer_name: string;
  phone: string;
  email: string | null;
  fulfilment: "collect" | "delivery";
  delivery_address: string | null;
  notes: string | null;
  subtotal_cents: number;
  delivery_cents: number;
  total_cents: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_reference: string | null;
  paid_at: string | null;
  status: OrderStatus;
  admin_notes: string | null;
  is_test: boolean;
  created_at: string;
  order_items?: OrderItem[];
}

export interface TrackedOrder {
  reference: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  fulfilment: "collect" | "delivery";
  subtotal_cents?: number;
  delivery_cents?: number;
  total_cents: number;
  created_at: string;
  items: OrderItem[];
}

export interface PaymentSettings {
  online_enabled: boolean;
  provider: string;
  eft_enabled: boolean;
  cash_enabled: boolean;
  bank_name: string;
  account_name: string;
  account_number: string;
  branch_code: string;
  eft_note: string;
  delivery_note: string;
  hold_hours: number;
  cash_hold_hours: number;
}

export interface SecuritySettings {
  require_staff_mfa: boolean;
  two_person_approval: boolean;
  captcha_site_key: string;
}

export interface Animal {
  id: string;
  product_id: string;
  tag: string;
  title: string | null;
  breed: string | null;
  sex: "male" | "female" | "mixed" | null;
  age_months: number | null;
  weight_kg: number | null;
  quantity: number;
  price_cents: number | null;
  show_price: boolean;
  status: "available" | "reserved" | "sold";
  image_url: string | null;
  notes: string | null;
  published: boolean;
  sort_order: number;
  products?: { name: string; slug: string } | null;
}

export type ApprovalAction = "grant_admin" | "revoke_admin" | "delete_order" | "refund_order" | "anonymise_customer" | "disable_two_person";
export interface PendingApproval {
  id: string;
  action: ApprovalAction;
  target_id: string;
  summary: string;
  reason: string;
  status: "pending" | "executed" | "rejected" | "failed" | "expired";
  requested_by: string | null;
  requested_by_email: string | null;
  decided_by: string | null;
  decided_by_email: string | null;
  decision_note: string | null;
  result: string | null;
  created_at: string;
  decided_at: string | null;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
}

export interface DataRequest {
  id: string;
  user_id: string | null;
  email: string;
  kind: "access" | "correction" | "deletion" | "objection";
  details: string | null;
  status: "open" | "in_progress" | "done" | "rejected";
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

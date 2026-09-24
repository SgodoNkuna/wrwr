import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";
import { AuthProvider } from "./lib/auth";
import { SettingsProvider } from "./lib/settings";
import { ConsentProvider } from "./lib/consent";
import { CookiePolicy, PaiaNotice, PrivacyPolicy, ReturnsPolicy, TermsOfUse } from "./pages/Legal";
import { CartProvider } from "./lib/cart";
import Basket from "./pages/Basket";
import Checkout from "./pages/Checkout";
import OrderPage from "./pages/OrderPage";
import Track from "./pages/Track";
import Account from "./pages/Account";
const OrdersAdmin = lazy(() => import("./admin/OrdersAdmin"));
const CustomersAdmin = lazy(() => import("./admin/CustomersAdmin"));
const PaymentsAdmin = lazy(() => import("./admin/PaymentsAdmin"));
const PrivacyAdmin = lazy(() => import("./admin/PrivacyAdmin"));
import SiteLayout from "./components/SiteLayout";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import About from "./pages/About";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
const AdminLayout = lazy(() => import("./admin/AdminLayout"));
const Dashboard = lazy(() => import("./admin/Dashboard"));
const ProductsAdmin = lazy(() => import("./admin/ProductsAdmin"));
const CategoriesAdmin = lazy(() => import("./admin/CategoriesAdmin"));
const ServicesAdmin = lazy(() => import("./admin/ServicesAdmin"));
const EnquiriesAdmin = lazy(() => import("./admin/EnquiriesAdmin"));
const SettingsAdmin = lazy(() => import("./admin/SettingsAdmin"));
const UsersAdmin = lazy(() => import("./admin/UsersAdmin"));
const AuditAdmin = lazy(() => import("./admin/AuditAdmin"));
const ResetPassword = lazy(() => import("./admin/ResetPassword"));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ConsentProvider>
      <SettingsProvider>
        <AuthProvider>
        <CartProvider>
          <Suspense fallback={<p className="p-8 text-ink/60">Loading…</p>}>
          <Routes>
            <Route element={<SiteLayout />}>
              <Route index element={<Home />} />
              <Route path="products" element={<Products />} />
              <Route path="products/:slug" element={<ProductDetail />} />
              <Route path="about" element={<About />} />
              <Route path="contact" element={<Contact />} />
              <Route path="privacy" element={<PrivacyPolicy />} />
              <Route path="terms" element={<TermsOfUse />} />
              <Route path="cookies" element={<CookiePolicy />} />
              <Route path="paia" element={<PaiaNotice />} />
              <Route path="returns" element={<ReturnsPolicy />} />
              <Route path="basket" element={<Basket />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="order/:reference" element={<OrderPage />} />
              <Route path="track" element={<Track />} />
              <Route path="account" element={<Account />} />
              <Route path="*" element={<NotFound />} />
            </Route>
            <Route path="admin/reset" element={<ResetPassword />} />
            <Route path="account/reset" element={<ResetPassword next="/account" />} />
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="orders" element={<OrdersAdmin />} />
              <Route path="enquiries" element={<EnquiriesAdmin />} />
              <Route path="customers" element={<CustomersAdmin />} />
              <Route path="payments" element={<PaymentsAdmin />} />
              <Route path="privacy" element={<PrivacyAdmin />} />
              <Route path="products" element={<ProductsAdmin />} />
              <Route path="categories" element={<CategoriesAdmin />} />
              <Route path="services" element={<ServicesAdmin />} />
              <Route path="settings" element={<SettingsAdmin />} />
              <Route path="users" element={<UsersAdmin />} />
              <Route path="audit" element={<AuditAdmin />} />
            </Route>
          </Routes>
          </Suspense>
        </CartProvider>
        </AuthProvider>
      </SettingsProvider>
      </ConsentProvider>
    </BrowserRouter>
  </StrictMode>,
);

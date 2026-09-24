import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";
import { AuthProvider } from "./lib/auth";
import { SettingsProvider } from "./lib/settings";
import SiteLayout from "./components/SiteLayout";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import About from "./pages/About";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import AdminLayout from "./admin/AdminLayout";
import Dashboard from "./admin/Dashboard";
import ProductsAdmin from "./admin/ProductsAdmin";
import CategoriesAdmin from "./admin/CategoriesAdmin";
import ServicesAdmin from "./admin/ServicesAdmin";
import EnquiriesAdmin from "./admin/EnquiriesAdmin";
import SettingsAdmin from "./admin/SettingsAdmin";
import UsersAdmin from "./admin/UsersAdmin";
import AuditAdmin from "./admin/AuditAdmin";
import ResetPassword from "./admin/ResetPassword";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <AuthProvider>
          <Routes>
            <Route element={<SiteLayout />}>
              <Route index element={<Home />} />
              <Route path="products" element={<Products />} />
              <Route path="products/:slug" element={<ProductDetail />} />
              <Route path="about" element={<About />} />
              <Route path="contact" element={<Contact />} />
              <Route path="*" element={<NotFound />} />
            </Route>
            <Route path="admin/reset" element={<ResetPassword />} />
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="enquiries" element={<EnquiriesAdmin />} />
              <Route path="products" element={<ProductsAdmin />} />
              <Route path="categories" element={<CategoriesAdmin />} />
              <Route path="services" element={<ServicesAdmin />} />
              <Route path="settings" element={<SettingsAdmin />} />
              <Route path="users" element={<UsersAdmin />} />
              <Route path="audit" element={<AuditAdmin />} />
            </Route>
          </Routes>
        </AuthProvider>
      </SettingsProvider>
    </BrowserRouter>
  </StrictMode>,
);

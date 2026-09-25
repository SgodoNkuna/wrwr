import { Link } from "react-router-dom";
import { usePageMeta } from "../lib/usePageMeta";
export default function NotFound() {
  usePageMeta("Page not found", "This page could not be found.", { noindex: true });
  return (
    <div className="container-x py-24 text-center">
      <h1 className="text-7xl text-farm-900">404</h1>
      <p className="mt-2 text-farm-950/70">This page wandered off the farm.</p>
      <Link to="/" className="btn-green mt-6">Go home</Link>
    </div>
  );
}

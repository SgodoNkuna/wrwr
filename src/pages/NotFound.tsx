import { Link } from "react-router-dom";
export default function NotFound() {
  return (
    <div className="container-x py-24 text-center">
      <h1 className="text-5xl">404</h1>
      <p className="mt-2 text-farm-950/70">This page wandered off the farm.</p>
      <Link to="/" className="btn-green mt-6">Go home</Link>
    </div>
  );
}

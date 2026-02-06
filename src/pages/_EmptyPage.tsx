import { Link } from "react-router-dom";
import "./empty.css";

export default function EmptyPage({ title }: { title: string }) {
  return (
    <div className="empty">
      <h1>{title}</h1>
      <p>Temporary page.</p>
      <Link to="/" className="back">
        ← Back Home
      </Link>
    </div>
  );
}

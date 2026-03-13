import { useNavigate } from "react-router-dom";
import "./home.css";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home">
      <div className="home-card">
        <div className="home-header">
          <h1>Welcome To AAC Talker!</h1>
          <p>Select where you want to go.</p>
        </div>

        <div className="home-grid">
          <button className="home-btn search" onClick={() => navigate("/search")}>
            Search
          </button>

          <button className="home-btn favorites" onClick={() => navigate("/favorites")}>
            Favorites
          </button>

          <button className="btn btn-primary home-btn-primary" onClick={() => navigate("/talk")}>
            Let’s Talk
          </button>

          <button className="home-btn therapy" onClick={() => navigate("/therapy")}>
            Therapy
          </button>

          <button className="home-btn profile" onClick={() => navigate("/profile")}>
            Profile
          </button>
        </div>

        <div className="home-footer">
          <button className="home-btn footer" onClick={() => navigate("/settings")}>
            Settings
          </button>
        </div>
      </div>
    </div>
  );
}

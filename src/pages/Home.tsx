import { useNavigate } from "react-router-dom";
import "./home.css";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home">
      <div className="home-card">
        <div className="home-header text-outline">
          <h1>Welcome To AAC Talker!</h1>
          <p>Select where you would like to go</p>
        </div>

        <div className="cloud cloud1">
        </div>
        <div className="cloud cloud2">
        </div>

        <div className="home-grid">

          <button className="btn btn-primary home-btn-primary text-outline" onClick={() => navigate("/talk")}>
            Let’s Talk
          </button>

          <button className="btn btn-secondary stats-btn text-outline" onClick={() => navigate("/therapy")}>
            Statistics
          </button>

          <button className="btn btn-secondary config-btn text-outline" onClick={() => navigate("/profile")}>
            Configuration
          </button>
        </div>

      </div>
    </div>
  );
}

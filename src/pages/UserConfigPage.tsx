import { useNavigate } from "react-router-dom";
import "./UserConfigPage.css";

export default function UserConfigPage() {
  const navigate = useNavigate();

  return (
    <section className="userConfig">
      <div className="userConfig-frame">
        <div className="userConfig-card">
          <header className="userConfig-header">
            <h1>Configure Your Patient&apos;s User Profile</h1>
          </header>

          <div className="userConfig-grid">
            <button
              className="userConfig-pill userConfig-pill--audio"
              onClick={() => navigate("/audio")}
            >
              <span className="userConfig-pill__label">Audio Settings</span>
            </button>

            <button
              className="userConfig-pill userConfig-pill--grid"
              onClick={() => navigate("/grid")}
            >
              <span className="userConfig-pill__label">Grid Settings</span>
            </button>
          </div>

          <button
            className="userConfig-back"
            onClick={() => navigate("/home")}
          >
            ← Back To Home
          </button>
        </div>
      </div>
    </section>
  );
}
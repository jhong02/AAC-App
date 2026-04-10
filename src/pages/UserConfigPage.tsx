import { useNavigate } from "react-router-dom";
import "./UserConfigPage.css";
import { Link } from "react-router-dom";

export default function UserConfigPage(){
    const navigate = useNavigate();

    return (
    <div className="userConfig">
      <div className="userConfig-card">
        <div className="userConfig-header">
          <h1>Configure Your Patient's User Profile</h1>
        </div>

        <div className="userConfig-grid">
          <button className="userConfig-btn audio" onClick={() => navigate("/audio")}>
            Audio
          </button>

          <button className="userConfig-btn grid" onClick={() => navigate("/grid")}>
            Grid
          </button>

          <Link to="/" className="back">
             ← Back Home
          </Link>
        </div>

      </div>
    </div>
  );


}




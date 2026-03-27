import { useNavigate } from "react-router-dom";
import "./UserConfigPage.css";

export default function UserConfigPage(){
    const navigate = useNavigate();

    return (
    <div className="userConfig">
      <div className="userConfig-card">
        <div className="userConfig-header text-outline">
          <h1>Configure Your Patient's User Profile</h1>
        </div>

        <div className="userConfig-grid">
          <button className="btn btn-secondary btn-userConfig-audio" onClick={() => navigate("/audio")}>
            Audio
          </button>

          <button className="btn btn-secondary btn-userConfig-grid" onClick={() => navigate("/grid")}>
            Grid
          </button>
        </div>

      </div>
    </div>
  );


}




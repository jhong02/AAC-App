import { useMemo } from "react";
import "../styles/loadingScreen.css";

import loadingGif1 from "../assets/gifs/loading1.gif";
import loadingGif2 from "../assets/gifs/loading2.gif";
import loadingGif3 from "../assets/gifs/loading3.gif";

const GIFS = [loadingGif1, loadingGif2, loadingGif3];

const LoadingScreen = () => {
  const selectedGif = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * GIFS.length);
    return GIFS[randomIndex];
  }, []);

  return (
    <div className="loading-page">
      <div className="loading-shell">
        <div className="loading-gif-wrap" aria-hidden="true">
          <img
            src={selectedGif}
            alt=""
            className="loading-gif"
            draggable="false"
          />
        </div>

        <div className="loading-panel">
          <p className="loading-subtitle">Getting your words ready...</p>

          <div className="loading-bar" aria-label="Loading">
            <div className="loading-bar__fill" />
          </div>

          <p className="loading-small-text">Please wait</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
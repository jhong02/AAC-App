import { useEffect, useState } from "react";
import LoadingScreen from "./components/LoadingScreen";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import TalkPage from "./pages/TalkPage";
import StatsPage from "./pages/StatsPage";
import SettingsPage from "./pages/SettingsPage";
import UserConfigPage from "./pages/UserConfigPage";
import AudioPage from "./pages/AudioPage";
import GridPage from "./pages/GridPage";
import { BoardConfigProvider } from "./context/BoardConfigContext";

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadingTimer = window.setTimeout(() => {
      setIsLoading(false);
    }, 2500);

    return () => window.clearTimeout(loadingTimer);
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <BoardConfigProvider>
      <Routes>
        <Route path="/" element={<TalkPage />} />
        <Route path="/home" element={<Home />} />
        <Route path="/talk" element={<TalkPage />} />
        <Route path="/user-config" element={<UserConfigPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/audio" element={<AudioPage />} />
        <Route path="/grid" element={<GridPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BoardConfigProvider>
  );
}
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import TalkPage from "./pages/TalkPage";
import StatsPage from "./pages/StatsPage";
import SettingsPage from "./pages/SettingsPage";
import UserConfigPage from "./pages/UserConfigPage";
import AudioPage from "./pages/AudioPage";
import GridPage from "./pages/GridPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route path="/home" element={<Home />} />
      <Route path="/talk" element={<TalkPage />} />
      <Route path="/user-config" element={<UserConfigPage />} />
      <Route path="/stats" element={<StatsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/audio" element={<AudioPage />} />
      <Route path="grid" element={<GridPage/>} />
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
}

import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import TalkPage from "./pages/TalkPage";
import TherapyPage from "./pages/TherapyPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route path="/talk" element={<TalkPage />} />
      <Route path="/therapy" element={<TherapyPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

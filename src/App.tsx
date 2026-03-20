import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import SearchPage from "./pages/SearchPage";
import FavoritesPage from "./pages/FavoritesPage";
import TalkPage from "./pages/TalkPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import UserConfigPage from "./pages/UserConfigPage";
import AudioPage from "./pages/AudioPage";
import GridPage from "./pages/GridPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/favorites" element={<FavoritesPage />} />
      <Route path="/talk" element={<TalkPage />} />
      <Route path="/userConfig" element={<UserConfigPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/audio" element={<AudioPage />} />
      <Route path="grid" element={<GridPage/>} />
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
}

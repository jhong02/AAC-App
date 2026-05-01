import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import "./styles/global.css";
import { loadDemoData } from "./utils/seedDemoData";
import { getDB, schedulePersist } from "./db/database";

// Expose demo data loader to browser console
// Usage: window.__loadDemoData()
(window as any).__loadDemoData = async () => {
  let attempts = 0;
  let db = null;

  // Retry up to 10 times with 500ms delay — database may still be initializing
  while (!db && attempts < 10) {
    try {
      db = await getDB();
    } catch {
      attempts++;
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  if (!db) {
    console.warn("[Demo] Could not connect to database after 5 seconds. Navigate to the app first.");
    return;
  }

  loadDemoData(db);
  schedulePersist(db);
  // Give OPFS time to write before user refreshes
  await new Promise((r) => setTimeout(r, 1500));
  console.log("[Demo] Done. Refresh the page to see updated stats.");
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
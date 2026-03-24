import { invoke } from "@tauri-apps/api/core";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { seedDatabase } from "./lib/onboarding";
import "./index.css";

// Expose for console testing in dev only
if (import.meta.env.DEV) {
	Object.assign(window, { seedDatabase, invoke });
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);

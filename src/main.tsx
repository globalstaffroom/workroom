import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

async function log(msg: string) {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("write_log", { message: msg });
  } catch {
    console.error("[log failed]", msg);
  }
}

window.addEventListener("error", (e) => {
  const stack = e.error instanceof Error ? (e.error.stack ?? "") : "";
  void log(`ERROR: ${e.message} @ ${e.filename}:${e.lineno}\n${stack}`);
});

window.addEventListener("unhandledrejection", (e) => {
  void log(`UNHANDLED_REJECTION: ${String(e.reason)}`);
});

function mount() {
  let root = document.getElementById("root");
  if (!root) {
    root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);
  }
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}

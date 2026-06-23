import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Mitigate benign iframe-related browser errors such as ResizeObserver loop exceed limits
if (typeof window !== "undefined") {
  const originalError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    const msgStr = String(message || "");
    if (
      msgStr.includes("ResizeObserver") ||
      msgStr.includes("Script error.") ||
      msgStr.includes("ResizeObserver loop limit exceeded") ||
      msgStr.includes("ResizeObserver loop completed with undelivered notifications")
    ) {
      console.warn("Muted benign sandbox ResizeObserver/Script error:", message);
      return true; // Suppress from propagating to iframe environment error trackers
    }
    if (originalError) {
      return originalError.apply(this, arguments as any);
    }
    return false;
  };

  window.addEventListener("unhandledrejection", (event) => {
    const reasonStr = event.reason ? String(event.reason.message || event.reason) : "";
    if (reasonStr.includes("ResizeObserver") || reasonStr.includes("local storage")) {
      console.warn("Muted unhandled rejection in sandbox:", reasonStr);
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);


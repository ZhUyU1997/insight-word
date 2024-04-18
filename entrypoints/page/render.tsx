import ReactDOM from "react-dom/client";
import { App } from "./App";
import React from "react";

export default function Render(app: HTMLElement) {
  const root = ReactDOM.createRoot(app);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  return root;
}

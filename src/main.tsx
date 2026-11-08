import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource-variable/source-serif-4";
import "./index.css";
import { App } from "./App";
import { startInstallCapture } from "./install/store";

// L'invito a installare può arrivare prima che la pagina sia pronta: si ascolta fin da subito.
startInstallCapture();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

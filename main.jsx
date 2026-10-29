import "@material/web/button/filled-button.js";
import "@material/web/button/filled-tonal-button.js";
import "@material/web/button/text-button.js";
import "@material/web/iconbutton/icon-button.js";
import "@material/web/menu/menu-item.js";
import "@material/web/menu/menu.js";
import React from "react";
import { createRoot } from "react-dom/client";
import "./app.css";
import App from "./App.jsx";

if ("serviceWorker" in navigator && import.meta.env.PROD) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
            scope: import.meta.env.BASE_URL,
        });
    });
}

createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);

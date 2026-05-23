import React from "react";
import { createRoot } from "react-dom/client";
import { MenuApp } from "./MenuApp";
import "./menu.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MenuApp />
  </React.StrictMode>
);

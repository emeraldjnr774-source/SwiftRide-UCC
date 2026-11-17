import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { APIProvider } from "@vis.gl/react-google-maps";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode><APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ""}><BrowserRouter><App /></BrowserRouter></APIProvider></React.StrictMode>
);
import { createRoot } from "react-dom/client";
import { App } from "./app.jsx";
import "./index.css";
import { TerminalContextProvider } from "re-terminal";
const root = createRoot(document.getElementById("app"));
root.render(
  <TerminalContextProvider>
    <App  />
  </TerminalContextProvider>
);

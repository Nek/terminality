import { createRoot } from "react-dom/client";
import { App } from "./app.tsx";
import "./index.css";
import { TerminalContextProvider } from "react-terminal";
const root = createRoot(document.getElementById("app")!);
root.render(
  <TerminalContextProvider>
    <App  />
  </TerminalContextProvider>
);

import { render } from "preact";
import { App } from "./app.tsx";
import "./index.css";
import { TerminalContextProvider } from "react-terminal";

render(
  <TerminalContextProvider>
    <App />
  </TerminalContextProvider>,
  document.getElementById("app")!
);

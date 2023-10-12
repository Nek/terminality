import { ReactTerminal } from "react-terminal";

export function App() {
  // Define commands here
  const commands = {
    whoami: "jackharper",
    cd: (directory: string) => `changed path to ${directory}`
  };

  return (
    <ReactTerminal
      commands={commands}
    />
  );
}
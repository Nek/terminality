import { ReTerminal, useEditorCommands } from "re-terminal";
import { proxy, snapshot } from "valtio";
import { useProxy } from "valtio/utils";
import ReactPlayer from "react-player";
import { useState } from "react";
import { get } from "lodash";
import { assert, is } from "superstruct";

import { File, Directory, StoreStruct, VideoFile, Commands, TextFile} from "./spec";

const SPECIAL_SYMBOLS = {
  HOME: "~",
  UP: "..",
  PREVIOUS: "-",
};

const root = {
  [SPECIAL_SYMBOLS.HOME]: {
    "bubbly-bobbles.mov": {
      url: "https://vimeo.com/734325235",
    },
    "flowy-cubes.mov": {
      url: "https://vimeo.com/734324970",
    },
    "about.txt": {
      contents: "Definitely a software developer. Absolutely a musician. Certainly a curious mind!",
    },
    projects: {
      "project-1.txt": {
        contents: "Hello world!",
      },
      "project-2.txt": {
        contents: "Hello world!",
      },
      "project-3.txt": {
        contents: "Hello world!",
      },
    },
    expertise: {
      "programming-languages.chart": {
        title: "Programming Languages",
        data: "",
      },
      "programming-paradigms.chart": {
        title: "Programming Paradigms",
        data: "",
      },
    },
  },
};

assert(root, Directory);

const state = proxy({
  root,
  currentDirectory: [SPECIAL_SYMBOLS.HOME],
  previousDirectory: null,
});

assert(state, StoreStruct);

const NodeView = ({ name, node, currentDirectory }) => {
  const { setEditorInput, setProcessCurrentLine } = useEditorCommands();
  if (is(node, File)) {
    return (
      <div style={{ fontWeight: "200" }} key={name} id={name}>
        {name}
      </div>
    );
  }
  return (
    <div
      key={name}
      onClick={() => {
        setEditorInput(`cd ${currentDirectory.join("/")}/${name}`);
        setProcessCurrentLine(true);
      }}
      id={name}
      style={{ fontWeight: "400" }}
    >
      {name}
    </div>
  );
};

function interpretPart(part, newDirectory) {
  switch (part) {
    case SPECIAL_SYMBOLS.HOME:
      newDirectory.splice(0, Infinity, SPECIAL_SYMBOLS.HOME);
      return {
        nextAction: "next-part",
      };
    case SPECIAL_SYMBOLS.UP:
      newDirectory.pop();
      return {
        nextAction: "next-part",
      };
    case SPECIAL_SYMBOLS.PREVIOUS:
      return {
        nextAction: "error",
      };
    default:
      newDirectory.push(part);
      return {
        nextAction: "next-part",
      };
  }
}

function walkPath(path, currentDirectory) {
  const parts = path.split("/").filter((s) => "" !== s);
  let newDirectory = [...currentDirectory];
  for (let part of parts) {
    const { nextAction } = interpretPart(part, newDirectory);
    if (nextAction === "done") {
      break;
    }
    if (nextAction === "error") {
      return "error";
    }
  }
  return newDirectory;
}

function PausableVideo({ url }) {
  const [playing, setPlaying] = useState(true);
  return (
    <div onClick={() => setPlaying(!playing)}>
      <ReactPlayer url={url} playing={true} controls={true} />
    </div>
  );
}

export function App() {
  const $state = useProxy(state);
  const snap = snapshot(state);

  // Define commands here
  const commands = {
    open: (name) => {
      // check if file exists
      // check if it's video
      // open
      // otherwise error
      const file = get($state.root, [...snap.currentDirectory, name]);
      if (file) {
        if (is(file, VideoFile)) {
          return <PausableVideo url={file.url} />;
        } else {
          return "File type isn't supported yet.";
        }
      } else {
        return "No such file!";
      }
    },
    less: (name) => {
      // check if file exists
      // check if it's video
      // open
      // otherwise error
      const file = get($state.root, [...snap.currentDirectory, name]);
      if (file) {
        if (is(file, TextFile)) {
          return <div style={{ fontWeight: "200" }} key={name} id={name}>
          {file.contents}
        </div>;
        } else {
          return "File type isn't supported yet.";
        }
      } else {
        return "No such file!";
      }
    },
    help: (prompt) => {
      if (prompt === "cd") {
        return (
          <>
            <p>cd: change directory</p>
            <p>special directory names</p>
            <p>~ change to home</p>
            <p>.. change to one level up</p>
            <p>- change to the previous directory</p>
          </>
        );
      }
      return (
        <>
          <p>ls: list directory</p>
          <p>cd: change directory</p>
        </>
      );
    },
    ls: () => {
      const currentDirChildren = get(
        $state.root,
        $state.currentDirectory,
        null
      );
      if (currentDirChildren !== null) {
        const nameNodePairs = Object.entries(currentDirChildren)
          .sort(([a], [b]) => {
            if (a < b) {
              return -1;
            }
            if (a > b) {
              return 1;
            }
            return 0;
          })
          .map(([name, node]) => [name, node]);
        const dirs =
          $state.currentDirectory.length === 1
            ? nameNodePairs
            : ["..", ...nameNodePairs];
        return dirs.map(([name, node]) => (
          <NodeView
            currentDirectory={snap.currentDirectory}
            name={name}
            node={node}
          />
        ));
      }
    },
    cd: (path) => {
      if (path === SPECIAL_SYMBOLS.PREVIOUS) {
        if ($state.previousDirectory) {
          const temp = $state.currentDirectory;
          $state.currentDirectory = $state.previousDirectory;
          $state.previousDirectory = temp;
        }
        return undefined;
      }
      if (path === SPECIAL_SYMBOLS.HOME) {
        if ($state.previousDirectory) {
          const temp = $state.currentDirectory;
          $state.currentDirectory = [SPECIAL_SYMBOLS.HOME];
          $state.previousDirectory = temp;
        }
        return undefined;
      }
      if (path) {
        const newDirectoryOrError = walkPath(
          path,
          $state.currentDirectory,
          $state.previousDirectory
        );
        if (newDirectoryOrError !== "error") {
          const directoryExists = get($state.root, newDirectoryOrError, false);
          if (directoryExists) {
            const temp = $state.currentDirectory;
            $state.currentDirectory = newDirectoryOrError;
            $state.previousDirectory = temp;
            return undefined;
          }
        }
        return `Error: directory "${path}" doesn't exist.`;
      }
    },
  };

  assert(commands, Commands);

  // const { setEditorInput, setProcessCurrentLine } = useEditorCommands();

  const prompt = [...$state.currentDirectory].join("/") + ">";

  return (
    <>
      {/* <button
        onClick={() => {
          setEditorInput("ls");
          setProcessCurrentLine(true);
        }}
      >
        ls
      </button> */}
      <ReTerminal
        theme="dracula"
        showControlBar={false}
        commands={commands}
        prompt={prompt}
      />
    </>
  );
}
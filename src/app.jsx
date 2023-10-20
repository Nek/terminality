import { ReTerminal, useEditorCommands } from "re-terminal";
import { proxy, snapshot } from "valtio";
import { useProxy } from "valtio/utils";
import { flatten, getOr, pathOr, zip } from "lodash/fp";
// import { Directory } from "./spec";

import {
  assert,
  object,
  string,
  array,
  lazy,
  record,
  union,
  nullable,
  is,
} from "superstruct";
import { get } from "lodash";

export const TextFile = object({
  contents: string(),
});

export const VideoFile = object({
  url: string(),
});

export const ChartFile = object({
  title: string(),
  data: string(),
});

const File = union([TextFile, VideoFile, ChartFile])

export const Directory = record(
  string(),
  lazy(() => union([TextFile, VideoFile, ChartFile, Directory]))
);

const SPECIAL_SYMBOLS = {
  HOME: "~",
  UP: "..",
  PREVIOUS: "-",
};

const root = {
  [SPECIAL_SYMBOLS.HOME]: {
    "about.txt": {
      contents: "Hello world!",
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

const StoreStruct = object({
  root: Directory,
  currentDirectory: array(string()),
  previousDirectory: nullable(array(string())),
});

const state = proxy({
  root,
  currentDirectory: [SPECIAL_SYMBOLS.HOME],
  previousDirectory: null,
});

assert(state, StoreStruct);

function getFullPathToDir(dir) {
  return [
    ...flatten(
      zip(
        dir,
        dir.map((_) => "children")
      )
    ).slice(0, -1),
  ];
}

const NodeView = ({ name, node, currentDirectory }) => {
  const { setEditorInput, setProcessCurrentLine } = useEditorCommands();
  if(is(node, File)) {
    return (
      <div style={{ fontWeight: "200" }} key={name} id={name}>
        {name}
      </div>
    )
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

export function App() {
  const $state = useProxy(state);
  const snap = snapshot(state);

  // Define commands here
  const commands = {
    // open: (file: string) => {
    //   // check if file exists
    //   // check if it's video
    //   // open
    //   // otherwise error
    //   const maybeFile = pathOr<
    //     DivineDirectory,
    //     keyof DivineDirectory
    //   >($state.root, [...snap.currentDirectory, "children"], null);

    // },
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
      const currentDirChildren = get($state.root,$state.currentDirectory, null);
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
            console.log(nameNodePairs)
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
          const fullPathToDir = getFullPathToDir(newDirectoryOrError);
          const directoryExists = pathOr($state.root, fullPathToDir, false);
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

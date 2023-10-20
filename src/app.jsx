import { ReTerminal, useEditorCommands } from "re-terminal";
import { proxy, snapshot, ref } from "valtio";
import { useProxy } from "valtio/utils";
import ReactPlayer from "react-player/vimeo";
import { useEffect, useRef, useState } from "react";
import get from "lodash/get";
import { assert, is } from "superstruct";
import {
  File,
  Directory,
  State,
  VideoFile,
  Commands,
  TextFile,
  ChartFile,
} from "./spec";

import RadarChart from "react-svg-radar-chart";

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
      contents:
        "This is my personal playground. It might be buggy at times, but it's always fun. After all, it's the journey that's important, not the destination!",
    },
    "who-am-i.txt": {
      contents:
        "Definitely a software developer. Undoubtedly a musician. Always a curious mind! The name is Nikita Dudnik.",
    },
    // projects: {
    //   "project-1.txt": {
    //     contents: "Hello world!",
    //   },
    //   "project-2.txt": {
    //     contents: "Hello world!",
    //   },
    //   "project-3.txt": {
    //     contents: "Hello world!",
    //   },
    // },
    expertise: {
      "programming-languages.chart": {
        title: "Programming Languages",
        captions: ref({
          ts: "TypeScript",
          js: "JavaScript",
          cjs: "Clojure/Script",
          lua: "Lua",
          py: "Python",
          hx: "Haxe",
          cpp: "C++",
          as: "ActionScript",
        }),
        data: ref([
          {
            data: {
              ts: 1,
              js: 1,
              cjs: 0.6,
              lua: 0.4,
              py: 0.3,
              hx: 0.5,
              cpp: 0.2,
              as: 0.7,
            },
            meta: { color: "red" },
          },
        ]),
      },
      "programming-paradigms.chart": {
        title: "Programming Paradigms",
        captions: ref({
          p: "Procedural",
          oop: "Object Oriented",
          fn: "Functional",
          l: "Logic",
          r: "Reactive",
          d: "Dataflow",
          s: "Stack-based",
        }),
        data: ref([
          {
            data: {
              p: 0.8,
              oop: 0.8,
              fn: 1,
              l: 0.4,
              r: 0.8,
              d: 0.7,
              s: 0.2,
            },
            meta: { color: "red" },
          },
        ]),
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

assert(state, State);

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
    open: [
      (name) => {
        const file = get($state.root, [...snap.currentDirectory, name]);
        if (file) {
          if (is(file, VideoFile)) {
            return <PausableVideo url={file.url} />;
          } else if (is(file, ChartFile)) {
            return (
              <>
                <p>{file.title}</p>
                <RadarChart
                  options={{ captionMargin: 20 }}
                  captions={file.captions}
                  data={file.data}
                  size={600}
                />
              </>
            );
          } else {
            return "File type isn't supported yet.";
          }
        } else {
          return "No such file!";
        }
      },
      "Opens media.",
    ],
    less: [
      (name) => {
        const file = get($state.root, [...snap.currentDirectory, name]);
        if (file) {
          if (is(file, TextFile)) {
            return (
              <div style={{ fontWeight: "200" }} key={name} id={name}>
                {file.contents}
              </div>
            );
          } else {
            return "File type isn't supported yet.";
          }
        } else {
          return "No such file!";
        }
      },
      "Shows text files' content.",
    ],
    help: [
      () => {
        const commandsNameMetas = Object.entries(commands).map(
          ([name, [_, meta]]) => [name, meta]
        );
        return (
          <>
            {commandsNameMetas.map(([name, meta]) => (
              <p>
                {name}: {meta}
              </p>
            ))}
          </>
        );
      },
      "You've guessed it!",
    ],
    ls: [
      () => {
        const currentDir = get($state.root, $state.currentDirectory, null);
        console.log("currentDir", currentDir);
        console.log("!!!!!!", is(currentDir, Directory))
        if (is(currentDir, Directory)) {
          const nameNodePairs = Object.entries(currentDir)
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
          const dirs = [[".."], ...nameNodePairs];
          console.log("dirs", dirs);

          return dirs.map(([name, node]) => (
            <NodeView
              currentDirectory={snap.currentDirectory}
              name={name}
              node={node}
            />
          ));
        }
      },
      "Lists a directory.",
    ],
    cd: [
      (path) => {
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
            const directoryExists = get(
              $state.root,
              newDirectoryOrError,
              false
            );
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
      "Changes directory.",
    ],
  };

  assert(commands, Commands);

  const { setEditorInput, setProcessCurrentLine } = useEditorCommands();

  const ref = useRef();

  useEffect(() => {
    if (ref.current) {
      setEditorInput("help");
      setProcessCurrentLine(true);
      ref.current.base.focus();
    }
  }, [ref]);

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
        ref={ref}
        theme="dracula"
        showControlBar={false}
        commands={Object.fromEntries(
          Object.entries(commands).map(([name, [c, _]]) => [name, c])
        )}
        prompt={prompt}
      />
    </>
  );
}

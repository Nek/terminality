import { ReactTerminal, useEditorCommands } from "react-terminal";
import { proxy, snapshot } from "valtio";
import { useProxy } from "valtio/utils";
import { flatten, pathOr, zip } from "remeda";

type FileSystemNode<T extends NodeType> = {
  type: T;
};

enum NodeType {
  DIRECTORY,
  TEXT,
  CHART,
  IMAGE,
}

const COMMANDS = ["ls", "cd"] as const;
type CommandNames = (typeof COMMANDS)[number];

type Name = string;
type DirChildren = {
  [name in Name]: File | Directory;
};

type Directory = FileSystemNode<NodeType.DIRECTORY> & {
  children: DirChildren;
};
type TextFile = FileSystemNode<NodeType.TEXT> & {
  contents: string;
};
type ChartFile = FileSystemNode<NodeType.CHART> & {
  title: string;
  data: any;
};
type ImageFile = FileSystemNode<NodeType.IMAGE> & {
  url: string;
};
type File = TextFile | ChartFile | ImageFile;

enum SPECIAL_SYMBOLS {
  HOME = "~",
  UP = "..",
  PREVIOUS = "-",
}

const root: Directory = {
  type: NodeType.DIRECTORY,
  children: {
    [SPECIAL_SYMBOLS.HOME]: {
      type: NodeType.DIRECTORY,
      children: {
        "about.txt": {
          type: NodeType.TEXT,
          contents: "Hello world!",
        },
        projects: {
          type: NodeType.DIRECTORY,
          children: {
            "project-1.txt": {
              type: NodeType.TEXT,
              contents: "Hello world!",
            },
            "project-2.txt": {
              type: NodeType.TEXT,
              contents: "Hello world!",
            },
            "project-3.txt": {
              type: NodeType.TEXT,
              contents: "Hello world!",
            },
          },
        },
        expertise: {
          type: NodeType.DIRECTORY,
          children: {
            "programming-languages.chart": {
              type: NodeType.CHART,
              title: "Programming Languages",
              data: "",
            },
            "programming-paradigms.chart": {
              type: NodeType.CHART,
              title: "Programming Paradigms",
              data: "",
            },
          },
        },
      },
    },
  },
};

type Store = {
  root: Directory;
  currentDirectory: string[];
  previousDirectory: string[] | null;
};

const state = proxy<Store>({
  root,
  currentDirectory: [SPECIAL_SYMBOLS.HOME],
  previousDirectory: null,
});

function getFullPathToDir(dir: ("children" | string)[]) {
  return [
    "children",
    ...flatten(
      zip(
        dir,
        dir.map((_: string) => "children")
      )
    ).slice(0, -1),
  ];
}

const NodeView = ({ name, type }: { name: string; type: NodeType }) => {
  const { setEditorInput, setProcessCurrentLine } = useEditorCommands();

  switch (type) {
    case NodeType.TEXT:
    case NodeType.CHART:
    case NodeType.IMAGE:
      return <div id={name}>{name}</div>;
    default:
      return (
        <div
          onClick={() => {
            setEditorInput("cd " + name);
            setProcessCurrentLine(true);
          }}
          id={name}
          style={{ fontWeight: "bold" }}
        >
          {name}
        </div>
      );
  }
};

type Command = (prompt?: string) => JSX.Element[] | string | undefined;

function interpretPart(
  part: string,
  newDirectory: string[],
): {
  nextAction: "next-part" | "done" | "error";
} {
  console.log(part);
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

function walkPath(
  path: string,
  currentDirectory: string[],
  previousDirectory: string[] | null
): string[] | "error" {
  const parts = path.split("/").filter((s) => "" !== s);
  let newDirectory: string[] = [...currentDirectory];
  for (let part of parts) {
    const { nextAction } = interpretPart(part, newDirectory, previousDirectory);
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

  // Define commands here
  const commands: { [name in CommandNames]: Command } = {
    ls: () => {
      const pathToCurrentDir = getFullPathToDir($state.currentDirectory);
      const currentDirChildren: DirChildren | null = pathOr<
        Directory,
        keyof Directory
      >($state.root, [...pathToCurrentDir, "children"], null);
      if (currentDirChildren !== null) {
        const nameNodePairs = Object.entries<[string, File | Directory]>(
          currentDirChildren
        )
          .sort(([a], [b]) => {
            if (a < b) {
              return -1;
            }
            if (a > b) {
              return 1;
            }
            return 0;
          })
          .map(([name, node]) => [name, node.type]);
        const dirs =
          $state.currentDirectory.length === 1
            ? nameNodePairs
            : [["..", NodeType.DIRECTORY], ...nameNodePairs];
        return dirs.map(([name, type]) => <NodeView name={name} type={type} />);
      }
    },
    cd: (path?: string) => {
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
          console.log("!!!!", newDirectoryOrError, fullPathToDir, newDirectoryOrError)
          if (directoryExists) {
            const temp = $state.currentDirectory;
            $state.currentDirectory = newDirectoryOrError;
            $state.previousDirectory = temp;
            return undefined;
          }
        }
        return `Error: directory "${path}" doesn't exist.`;
      }
      // switch (path) {
      //   case SPECIAL_SYMBOLS.HOME:
      //     if (
      //       $state.currentDirectory[$state.currentDirectory.length - 1] ==
      //       SPECIAL_SYMBOLS.HOME
      //     ) {
      //       break;
      //     }
      //     const temp = $state.currentDirectory;
      //     $state.currentDirectory = [SPECIAL_SYMBOLS.HOME];
      //     $state.previousDirectory = temp;
      //     break;
      //   case SPECIAL_SYMBOLS.PREVIOUS:
      //     if ($state.previousDirectory) {
      //       const temp = $state.currentDirectory;
      //       $state.currentDirectory = $state.previousDirectory;
      //       $state.previousDirectory = temp;
      //     }
      //     break;
      //   case SPECIAL_SYMBOLS.UP:
      //     if ($state.currentDirectory.length > 1) {
      //       const temp = $state.currentDirectory;
      //       $state.currentDirectory = $state.currentDirectory.slice(0, -1);
      //       $state.previousDirectory = temp;
      //     }
      //     break;
      //   default:
      //     const fullPathToDir = getFullPathToDir([
      //       ...$state.currentDirectory,
      //       path,
      //     ]);
      //     const newDir = pathOr($state.root, fullPathToDir, null);
      //     if (newDir !== null) {
      //       const temp = $state.currentDirectory;
      //       $state.currentDirectory = [...$state.currentDirectory, path];
      //       $state.previousDirectory = temp;
      //     } else {
      //       return `Error: directory "${path}" doesn't exist.`;
      //     }
      //     break;
      // }
    },
  };

  const { setEditorInput, setProcessCurrentLine } = useEditorCommands();

  const prompt = [...$state.currentDirectory].join("/") + ">";

  return (
    <>
      <button
        onClick={() => {
          setEditorInput("ls");
          setProcessCurrentLine(true);
        }}
      >
        ls
      </button>
      <ReactTerminal
        showControlBar={false}
        commands={commands}
        prompt={prompt}
      />
    </>
  );
}

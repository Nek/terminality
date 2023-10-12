import { ReactTerminal } from "react-terminal";
import { proxy } from "valtio";
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

type Name = string;
type Directory = FileSystemNode<NodeType.DIRECTORY> & {
  children: {
    [name in Name]: File | Directory;
  };
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

function getFullPathToDir(dir: string[]) {
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

const NodeView = ({name, type}: {name: string, type: NodeType}) => {
  switch (type) {
    case NodeType.TEXT:
    case NodeType.CHART:
    case NodeType.IMAGE:
      return <div>{name}</div>;
    default:
      return <div style={"font-weight: bold;"}>{name}</div>;
  } 
}

export function App() {
  const $state = useProxy(state);
  // Define commands here
  const commands = {
    ls: () => {
      const pathToCurrentDir = getFullPathToDir($state.currentDirectory)
      const currentDirChildren = pathOr($state.root, [...pathToCurrentDir, "children"], null)
      if (currentDirChildren !== null) {
        const nameNodePairs = Object.entries(currentDirChildren).sort(([a], [b]) => {
          if (a < b) {
            return -1;
          }
          if (a > b) {
            return 1;
          }
          return 0;
        }).map(([name, node]) => [name, node.type]);
        const dirs =  $state.currentDirectory.length === 1 ? nameNodePairs : [['..', NodeType.DIRECTORY], ...nameNodePairs];
        return dirs.map(([name, type]) => <NodeView name={name} type={type} />)
      }
    },
    cd: (directory: string | SPECIAL_SYMBOLS) => {
      switch (directory) {
        case SPECIAL_SYMBOLS.HOME:
          if (
            $state.currentDirectory[$state.currentDirectory.length - 1] ==
            SPECIAL_SYMBOLS.HOME
          ) {
            break;
          }
          const temp = $state.currentDirectory;
          $state.currentDirectory = [SPECIAL_SYMBOLS.HOME];
          $state.previousDirectory = temp;
          break;
        case SPECIAL_SYMBOLS.PREVIOUS:
          if ($state.previousDirectory) {
            const temp = $state.currentDirectory;
            $state.currentDirectory = $state.previousDirectory;
            $state.previousDirectory = temp;
          }
          break;
        case SPECIAL_SYMBOLS.UP:
          if ($state.currentDirectory.length > 1) {
            const temp = $state.currentDirectory;
            $state.currentDirectory = $state.currentDirectory.slice(0, -1);
            $state.previousDirectory = temp;
          }
          break;
        default:
          const fullPathToDir = getFullPathToDir([
            ...$state.currentDirectory,
            directory,
          ]);
          console.log(fullPathToDir);
          const newDir = pathOr($state.root, fullPathToDir, null);
          console.log(newDir);
          if (newDir !== null) {
            const temp = $state.currentDirectory;
            $state.currentDirectory = [...$state.currentDirectory, directory];
            $state.previousDirectory = temp;
          } else {
            return `Error: directory "${directory}" doesn't exist.`;
          }
          // console.log(Object.entries(temp).filter(([_name, node]) => node.type == NodeType.DIRECTORY))
          // const temp = pick($state.currentDirectory)
          break;
      }
      return "";
    },
  };

  const prompt = [...$state.currentDirectory].join("/") + ">";

  return (
    <ReactTerminal showControlBar={false} commands={commands} prompt={prompt} />
  );
}

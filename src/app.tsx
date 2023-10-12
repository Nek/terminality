import { ReactTerminal } from "react-terminal";
import { proxy } from "valtio";
import { useProxy } from "valtio/utils";
import { flatten, keys, pathOr, pick, pickBy, zip } from "remeda";

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

const home: Directory = {
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
};

enum SPECIAL_SYMBOLS {
  HOME = "~",
  UP = "..",
  PREVIOUS = "-",
}

type Store = {
  home: Directory;
  currentDirectory: string[];
  previousDirectory: string[] | null;
};

const state = proxy<Store>({
  home,
  currentDirectory: [],
  previousDirectory: null,
});

export function App() {
  const $state = useProxy(state);
  // Define commands here
  const commands = {
    whoami: "jackharper",
    cd: (directory: string | SPECIAL_SYMBOLS) => {
      switch (directory) {
        case SPECIAL_SYMBOLS.HOME:
          const temp = $state.currentDirectory;
          $state.currentDirectory = [];
          if ($state.previousDirectory) {
            $state.previousDirectory = temp;
          }
          break;
        case SPECIAL_SYMBOLS.PREVIOUS:
          if ($state.previousDirectory) {
            const temp = $state.currentDirectory;
            $state.currentDirectory = $state.previousDirectory;
            $state.previousDirectory = temp;
          }
          break;
        case SPECIAL_SYMBOLS.UP:
          if ($state.currentDirectory.length > 0) {
            const temp = $state.currentDirectory;
            $state.currentDirectory = $state.currentDirectory.slice(1);
            $state.previousDirectory = temp;
          }
          break;
        default:
          console.log([
            "children",
            ...flatten(
              zip(
                $state.currentDirectory,
                $state.currentDirectory.map((_) => "children")
              )
            ),
          ]);
          const newPath = [
            ...flatten(
              zip(
                $state.currentDirectory,
                $state.currentDirectory.map((_) => "children")
              )
            ),
            directory,
          ];
          const newDirChildren = pathOr($state.home.children, newPath, null);
          if (newDirChildren !== null) {
            const temp = $state.currentDirectory;
            $state.currentDirectory = [...$state.currentDirectory, directory];
            console.log($state.currentDirectory)
            $state.previousDirectory = temp;
          } else {
            return `Error: directory "${directory}" doesn't exist.`
          }
          // console.log(Object.entries(temp).filter(([_name, node]) => node.type == NodeType.DIRECTORY))
          // const temp = pick($state.currentDirectory)
          break;
      }
      return "";
    },
  };

  const prompt =
    $state.currentDirectory.length == 0
      ? "~>"
      : ["~", ...$state.currentDirectory].join("/")+">";

  return (
    <ReactTerminal showControlBar={false} commands={commands} prompt={prompt} />
  );
}

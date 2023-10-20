import {
  object,
  string,
  array,
  lazy,
  record,
  union,
  nullable,
  func,
  enums,
  tuple,
  number,
  any,
} from "superstruct";

export const TextFile = object({
  contents: string(),
});

export const VideoFile = object({
  url: string(),
});

export const ChartFile = object({
  title: string(),
  captions: record(string(), string()),
  data: any(),
});

export const File = union([TextFile, VideoFile, ChartFile]);

export const Directory = record(
  string(),
  lazy(() => union([TextFile, VideoFile, ChartFile, Directory]))
);

export const State = object({
  root: Directory,
  currentDirectory: array(string()),
  previousDirectory: nullable(array(string())),
});

export const CommandNames = enums(["ls", "cd", "help", "open", "less", "help"]);
export const Commands = record(CommandNames, tuple(func(), string()));

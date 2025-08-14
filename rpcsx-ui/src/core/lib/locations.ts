import path from "path";

export const builtinResourcesPath = import.meta.dirname;
export const rootPath = path.dirname(process.execPath);
export const configPath = rootPath;
export const extensionsPath = path.join(rootPath, "extensions");
export const localExtensionsPath = path.join(extensionsPath, ".local");

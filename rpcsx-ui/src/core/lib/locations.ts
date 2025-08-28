import path from "path";

export const builtinResourcesPath = import.meta.dirname;
export const rootPath = path.dirname(process.execPath);
export const configPath = rootPath;
export const extensionsPath = path.join(rootPath, "extensions");
export const localExtensionsPath = "resourcesPath" in process && typeof process.resourcesPath == "string" ?
    path.join(process.resourcesPath, "extensions") :
    path.resolve(builtinResourcesPath, "..", "extensions");

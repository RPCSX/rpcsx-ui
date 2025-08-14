import path from "path";
import { fileURLToPath } from "url";

export const builtinResourcesPath = path.dirname(fileURLToPath(import.meta.url));
export const rootPath = path.dirname(process.execPath);
export const configPath = rootPath;
export const extensionsPath = path.join(rootPath, "extensions");
export const localExtensionsPath = path.join(extensionsPath, ".local");

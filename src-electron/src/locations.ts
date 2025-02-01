import path from "path";
import { fileURLToPath } from "url";

export const rootPath = path.dirname(fileURLToPath(import.meta.url));
export const configPath = rootPath;

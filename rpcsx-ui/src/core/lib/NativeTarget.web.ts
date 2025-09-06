import { Target } from "./Target";

export const NativeTarget = new Target(process.platform === "win32" ? "pe" : "elf", process.arch, process.platform);

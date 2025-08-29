
// FIXME: remove this import
import type { Readable, Writable } from 'stream';
import { Target } from "./Target";

export type Process = {
    stdin: Writable;
    stdout: Readable;
    stderr: Readable;
    kill: (signal: number | NodeJS.Signals) => void;
    on: (event: 'close' | 'exit', listener: (...args: any[]) => void) => void;
    once: (event: 'close' | 'exit', listener: (...args: any[]) => void) => void;
    off: (event: 'close' | 'exit', listener: (...args: any[]) => void) => void;
    getPid(): number;
}

export type LaunchParams = {
    launcherRequirements: object;
    signal?: AbortSignal;
}

export type Launcher = {
    launch: (path: string, args: string[], params: LaunchParams) => Promise<Process> | Process;
}

const launcherStorage: {
    [key: string]: Launcher
} = {};

export function addLauncher(target: Target, launcher: Launcher) {
    launcherStorage[target.format()] = launcher;
}

export function deleteLauncher(target: Target) {
    delete launcherStorage[target.format()];
}

export function getLauncher(target: Target | string) {
    if (target instanceof Target) {
        target = target.format();
    }

    if (target in launcherStorage) {
        return launcherStorage[target];
    }

    return undefined;
}

export function getLauncherList() {
    return Object.keys(launcherStorage);
}

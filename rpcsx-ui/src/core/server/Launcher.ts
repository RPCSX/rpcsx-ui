import { fork, spawn } from 'child_process';
import { Duplex, Readable, Writable } from 'stream';
import { dirname } from 'path';
import EventEmitter from 'events';

export type Process = {
    stdin: Writable;
    stdout: Readable;
    stderr: Readable;
    kill: (signal: number | NodeJS.Signals) => void;
    on: (event: 'close' | 'exit', listener: (...args: any[]) => void) => void;
    once: (event: 'close' | 'exit', listener: (...args: any[]) => void) => void;
    off: (event: 'close' | 'exit', listener: (...args: any[]) => void) => void;
}

export type LaunchParams = {
    launcherRequirements: object;
    signal?: AbortSignal;
}

export type Launcher = {
    launch: (path: string, args: string[], params: LaunchParams) => Promise<Process> | Process;
}

export const nativeLauncher: Launcher = {
    launch: async (path: string, args: string[], params: LaunchParams) => {
        const newProcess = spawn(path, args, {
            argv0: path,
            cwd: dirname(path),
            signal: params.signal,
            stdio: 'pipe'
        });

        newProcess.stdout.setEncoding('utf8');
        newProcess.stderr.setEncoding('utf8');

        const result: Process = {
            stdin: newProcess.stdin,
            stdout: newProcess.stdout,
            stderr: newProcess.stderr,

            kill: (signal: number | NodeJS.Signals) => {
                newProcess.kill(signal);
            },
            on: (event: string, handler: (...args: any[]) => void) => {
                newProcess.on(event, handler);
            },
            once: (event: string, handler: (...args: any[]) => void) => {
                newProcess.once(event, handler);
            },
            off: (event: string, handler: (...args: any[]) => void) => {
                newProcess.off(event, handler);
            }
        };

        return result;
    }
};

export const nodeLauncher: Launcher = {
    launch: async (path: string, args: string[], params: LaunchParams) => {
        const newProcess = fork(path, args, {
            signal: params.signal,
            stdio: 'pipe',
            cwd: dirname(path),
        });

        newProcess.stdout!.setEncoding('utf8');
        newProcess.stderr!.setEncoding('utf8');

        const result: Process = {
            stdin: newProcess.stdin!,
            stdout: newProcess.stdout!,
            stderr: newProcess.stderr!,

            kill: (signal: number | NodeJS.Signals) => {
                newProcess.kill(signal);
            },
            on: (event: string, handler: (...args: any[]) => void) => {
                newProcess.on(event, handler);
            },
            once: (event: string, handler: (...args: any[]) => void) => {
                newProcess.once(event, handler);
            },
            off: (event: string, handler: (...args: any[]) => void) => {
                newProcess.off(event, handler);
            }
        };

        return result;
    }
};

export const inlineLauncher: Launcher = {
    launch: async (path: string, args: string[], params: LaunchParams) => {
        const imported = await import(path);

        if (!("initialize" in imported) || typeof imported.initialize != 'function') {
            throw new Error(`${path}: invalid inline module`);
        }

        const eventEmitter = new EventEmitter();
        const stdin = new Duplex();
        const stdout = new Duplex();
        const stderr = new Duplex();
        imported.initialize(eventEmitter, args, params.launcherRequirements, stdin, stdout, stderr);

        const result: Process = {
            stdin: stdin,
            stdout: stdout,
            stderr: stderr,

            kill: (_signal: number | NodeJS.Signals) => {
                if (("dispose" in imported) && typeof imported.dispose == 'function') {
                    imported.dispose();
                }
            },
            on: (event: string, handler: (...args: any[]) => void) => {
                eventEmitter.on(event, handler);
            },
            once: (event: string, handler: (...args: any[]) => void) => {
                eventEmitter.once(event, handler);
            },
            off: (event: string, handler: (...args: any[]) => void) => {
                eventEmitter.off(event, handler);
            }
        };

        return result;
    }
};


export class Target {
    constructor(
        public fileFormat: string,
        public arch: string,
        public platform: string,
    ) { }

    static parse(triple: string) {
        const parts = triple.split('-');
        if (parts.length != 3) {
            return undefined;
        }

        return new Target(parts[0], parts[1], parts[2]);
    }

    static native() {
        return nativeTarget;
    }

    format(): string {
        return this.fileFormat + "-" + this.arch + "-" + this.platform;
    }
}

const nativeTarget = new Target(process.platform === "win32" ? "pe" : "elf", process.arch, process.platform);

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

addLauncher(Target.native(), nativeLauncher);
addLauncher(new Target("js", "any", "node"), nodeLauncher);
addLauncher(new Target("js", "any", "inline"), inlineLauncher);

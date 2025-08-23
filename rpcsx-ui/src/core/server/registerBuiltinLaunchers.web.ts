import { dirname } from "path";
import { addLauncher, Launcher, LaunchParams, Process } from "./Launcher";
import { Target } from "./Target";
import { fork, spawn } from "child_process";
import { Duplex } from "stream";
import { EventEmitter } from "events";

const nativeLauncher: Launcher = {
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

const nodeLauncher: Launcher = {
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

const inlineLauncher: Launcher = {
    launch: async (path: string, args: string[], params: LaunchParams) => {
        const imported = await import(path);

        if (!("activate" in imported) || typeof imported.activate != 'function') {
            throw new Error(`${path}: invalid inline module`);
        }

        const eventEmitter = new EventEmitter();
        const stdin = new Duplex();
        const stdout = new Duplex();
        const stderr = new Duplex();
        imported.activate(eventEmitter, args, params.launcherRequirements, stdin, stdout, stderr);

        const result: Process = {
            stdin: stdin,
            stdout: stdout,
            stderr: stderr,

            kill: (_signal: number | NodeJS.Signals) => {
                if (("deactivate" in imported) && typeof imported.deactivate == 'function') {
                    imported.deactivate();
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

export function registerBuiltinLaunchers() {
    addLauncher(Target.native(), nativeLauncher);
    addLauncher(new Target("js", "any", "node"), nodeLauncher);
    addLauncher(new Target("js", "any", "inline"), inlineLauncher);
}


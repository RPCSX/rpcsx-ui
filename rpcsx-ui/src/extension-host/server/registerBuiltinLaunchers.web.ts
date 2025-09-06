import { dirname } from "path";
import { Target } from "$core/Target";
import { NativeTarget } from "$core/NativeTarget";
import { fork, spawn } from "child_process";
import { Duplex, Readable, Writable } from "stream";
import { EventEmitter } from "events";
import { fileURLToPath } from "url";
import * as self from "$";
import * as core from "$core";
import packageJson from '../../../../package.json' with { type: "json" };

type Process = {
    stdin: Writable;
    stdout: Readable;
    stderr: Readable;
    kill: (signal: number | NodeJS.Signals) => void;
    on: (event: 'close' | 'exit', listener: (...args: any[]) => void) => void;
    once: (event: 'close' | 'exit', listener: (...args: any[]) => void) => void;
    off: (event: 'close' | 'exit', listener: (...args: any[]) => void) => void;
    getPid(): number;
}

type ResponseValue = void | object | null | number | string | boolean | [];
type ResponseError = {
    code: number;
    message?: string;
};

type Response = ResponseValue | ResponseError | void;
type ErrorHandler = (error: ResponseError) => void;

const clientInfo: ClientInfo = Object.freeze({
    name: packageJson.name,
    version: packageJson.version,
    capabilities: {}
});

class JsonRpcProtocol implements ExternalComponentInterface {
    private alive = true;
    private expectedResponses: {
        [key: number]: {
            deadline: number;
            resolve: (value: Response | PromiseLike<Response>) => void;
            reject: (reason?: any) => void;
        };
    } = {};

    private nextMessageId = 1;
    private errorHandlers: ErrorHandler[] = [];
    private messageBuffer = "";
    private processingQueue: (() => Promise<void>)[] = [];
    private responseWatchdog: NodeJS.Timeout | null = null;
    private exitController = new AbortController();
    private componentManifest: ComponentManifest;

    constructor(
        private objectId: number,
        public readonly extensionProcess: Process,
        public manifest: ExtensionInfo) {

        this.componentManifest = {
            name: manifest.name[0].text,
            version: manifest.version,
        };

        extensionProcess.stdout.on('data', (message: string) => {
            this.receive(message);
        });

        extensionProcess.stderr.on('data', (message: string) => {
            this.debugLog(message);
        });

        this.debugLog("Starting");

        extensionProcess.on('exit', () => {
            this.debugLog("Exit");
            this.alive = false;
            this.exitController.abort();
            this.expectedResponses = {};
            if (this.responseWatchdog) {
                clearTimeout(this.responseWatchdog);
            }

            // uninitializeComponent(this.componentManifest);
        });
    }

    getPid() {
        return this.extensionProcess.getPid();
    }

    private debugLog(message: string) {
        const date = new Date().toLocaleString("en-US");
        for (const line of message.split('\n')) {
            if (line.length == 0) {
                continue;
            }
            process.stderr.write(`${date} [${this.componentManifest.name}-v${this.componentManifest.version}] ${line}\n`);
        }
    }

    async initialize() {
        const request: InitializeRequest = {
            client: clientInfo
        };

        const response = await this.callMethod<InitializeResponse>("$/initialize", request);

        this.componentManifest = {
            ...response.extension,
            name: response.extension.name[0].text,
        };
    }

    async activate(_caller: ComponentRef, request: ExternalComponentActivateRequest) {
        return await this.callMethod<ActivateResponse>("$/activate", request);
    }

    async deactivate() {
        await this.callMethod("$/deactivate");
    }

    async dispose() {
        this.debugLog("shutdown");

        if (!this.alive) {
            return;
        }

        this.callMethod("$/shutdown").catch(e => {
            this.debugLog(`shutdown error ${e}`);
        });

        const sleep = (ms: number, abortSignal?: AbortSignal) => new Promise<void>(resolve => {
            if (abortSignal?.aborted) {
                return;
            }

            const timeout = setTimeout(resolve, ms);

            if (abortSignal) {
                abortSignal.addEventListener("abort", () => {
                    clearTimeout(timeout);
                    resolve();
                });
            }
        });

        await sleep(5 * 1000, this.exitController.signal);

        if (!this.alive) {
            return;
        }

        this.debugLog("SIGTERM");
        this.extensionProcess.kill("SIGTERM");

        await sleep(1 * 1000, this.exitController.signal);

        if (!this.alive) {
            return;
        }

        this.debugLog("SIGINT");
        this.extensionProcess.kill("SIGINT");

        await sleep(3 * 1000, this.exitController.signal);

        if (!this.alive) {
            return;
        }

        this.debugLog("SIGKILL");
        this.extensionProcess.kill("SIGKILL");
        await sleep(5 * 1000, this.exitController.signal);

        if (!this.alive) {
            this.debugLog("KILLED");
        } else {
            this.debugLog("KILL failed");
        }
    }

    objectCall(_caller: ComponentRef, request: ExternalComponentObjectCallRequest): ExternalComponentObjectCallResponse | Promise<ExternalComponentObjectCallResponse> {
        return this.callMethod("$/object/call", request);
    }

    objectDestroy(_caller: ComponentRef, request: ExternalComponentObjectDestroyRequest): void | Promise<void> {
        return this.sendNotify("$/object/destroy", request);
    }

    objectNotify(_caller: ComponentRef, request: ExternalComponentObjectNotifyRequest): void | Promise<void> {
        return this.sendNotify("$/object/notify", request);
    }

    async callMethod<R extends Response = Response>(method: string, params: object | [] | string | number | boolean | null = null, signal?: AbortSignal) {
        const id = this.nextMessageId++;
        const abortHandler = () => this.cancel({ id });
        signal?.addEventListener("abort", abortHandler);
        const removeAbortListener = () => {
            signal?.removeEventListener("abort", abortHandler);
        };

        this.send({ jsonrpc: "2.0", method, params, id });

        const timestamp = Date.now();
        const deadline = timestamp + 10 * 1000;
        if (this.responseWatchdog == null) {
            this.responseWatchdog = setTimeout(() => {
                this.responseWatchdogEntry();
            }, deadline - timestamp);
        }

        return new Promise<R>((resolve, reject) => {
            this.expectedResponses[id] = {
                deadline,
                resolve: v => {
                    removeAbortListener();
                    return resolve(v as R);
                },
                reject: e => {
                    removeAbortListener();
                    return reject(e);
                }
            };
        });
    }

    async sendNotify(notification: string, params?: Json) {
        this.send({ jsonrpc: "2.0", notification, params });
    }

    call(_caller: ComponentRef, params: ExternalComponentCallRequest): Promise<ExternalComponentCallResponse> {
        return this.callMethod(params.method, params.params);
    }

    notify(_caller: ComponentRef, params: ExternalComponentNotifyRequest) {
        return this.sendNotify(params.method, params.params);
    }

    cancel(request: CancelRequest) {
        return this.sendNotify("$/cancel", request);
    }

    onError(handler: ErrorHandler) {
        this.errorHandlers.push(handler);

        return () => {
            const handlerIndex = this.errorHandlers.findIndex(x => x === handler);
            if (handlerIndex >= 0) {
                this.errorHandlers.splice(handlerIndex, 1);
            }
        };
    }

    private async receive(message: string) {
        this.messageBuffer += message;

        await this.processQueue();

        if (this.messageBuffer.length <= 0) {
            return;
        }

        const headerEndMark = "\r\n\r\n";
        const contentLengthText = 'Content-Length:';

        while (true) {
            const contentLengthPos = this.messageBuffer.indexOf(contentLengthText);
            if (contentLengthPos < 0) {
                break;
            }

            const headerEndPos = this.messageBuffer.indexOf(headerEndMark, contentLengthPos + contentLengthText.length);

            if (headerEndPos < 0) {
                break;
            }

            const headerSize = headerEndPos + headerEndMark.length;

            const contentLengthEndPos = this.messageBuffer.indexOf('\r\n', contentLengthPos + contentLengthText.length);
            const contentLengthString = this.messageBuffer.substring(contentLengthPos + contentLengthText.length, contentLengthEndPos).trim();
            const contentLength = parseInt(contentLengthString, 10);

            let rawBuffer = Buffer.from(this.messageBuffer);

            if (rawBuffer.length < headerSize + contentLength) {
                break;
            }

            rawBuffer = rawBuffer.subarray(headerSize);

            const body = rawBuffer.subarray(0, contentLength).toString('utf8');
            this.messageBuffer = rawBuffer.subarray(contentLength).toString('utf8');

            this.debugLog(`<==== ${body}`);

            try {
                const bodyObject = JSON.parse(body);
                this.processingQueue.push(() => this.receiveObject(bodyObject));
            } catch {
                continue;
            }
        }

        await this.processQueue();
    }

    private async processQueue() {
        while (true) {
            const elem = this.processingQueue.shift();
            if (!elem) {
                return;
            }

            await elem();
        }
    }

    private async receiveObject(message: object) {
        const id = "id" in message ? message["id"] as number | null : null;

        if ("error" in message) {
            const error = message["error"] as ResponseError;

            if (id !== null) {
                if (id in this.expectedResponses) {
                    const expected = this.expectedResponses[id];
                    delete this.expectedResponses[id];
                    expected.reject(error);
                }

                return;
            }

            for (const handler of this.errorHandlers) {
                handler(error);
            }
            return;
        }

        if ("result" in message) {
            const result = message["result"] as ResponseValue;

            if (id !== null && id in this.expectedResponses) {
                const expected = this.expectedResponses[id];
                delete this.expectedResponses[id];
                expected.resolve(result);
            }

            return;
        }

        if ("method" in message) {
            const method = message["method"] as string;
            const params = "params" in message ? message["params"] as JsonObject : null;

            if (id !== null) {
                try {
                    const result = await core.componentCall({ caller: this.manifest.name[0].text, method, params });
                    this.send({ jsonrpc: "2.0", id, result });
                } catch (error) {
                    this.send({ jsonrpc: "2.0", id, error });
                }
            } else {
                core.componentNotify({ caller: this.manifest.name[0].text, notification: method, params }).catch(error => {
                    this.send({ jsonrpc: "2.0", error });
                });
            }

            return;
        }
    }

    private send(object: object) {
        const body = JSON.stringify(object);
        const rawBody = Buffer.from(body);
        this.debugLog(`====> ${body}`);
        this.extensionProcess.stdin.write(`Content-Length: ${rawBody.length}\r\n\r\n`);
        this.extensionProcess.stdin.write(rawBody);
    }

    private async responseWatchdogEntry() {
        await this.processQueue();

        const now = Date.now();
        let nextDeadline = -1;

        for (const request in this.expectedResponses) {
            const response = this.expectedResponses[request];
            const requestDeadline = response.deadline;
            if (requestDeadline <= now) {
                delete this.expectedResponses[request];
                this.debugLog(`wait for response timed out (request ${request})`);
                this.cancel({ id: parseInt(request) }).catch(e => console.warn(`cancellation of request ${request} failed`, e));
                response.reject({ code: ErrorCode.TimedOut });
            } else if (nextDeadline < 0 || nextDeadline > requestDeadline) {
                nextDeadline = requestDeadline;
            }
        }

        if (this.responseWatchdog) {
            clearTimeout(this.responseWatchdog);
            this.responseWatchdog = null;
        }

        if (nextDeadline > 0) {
            this.responseWatchdog = setTimeout(() => {
                this.responseWatchdogEntry();
            }, nextDeadline - now);
        }
    }

    getObjectId() {
        return this.objectId;
    }
}


class NativeLauncher implements LauncherInterface {
    async launch(_caller: ComponentRef, request: LauncherLaunchRequest): Promise<LauncherLaunchResponse> {
        const path = fileURLToPath(request.path);
        const newProcess = spawn(path, request.args, {
            argv0: path,
            cwd: dirname(process.execPath),
            stdio: 'pipe'
        });

        newProcess.stdout.setEncoding('utf8');
        newProcess.stderr.setEncoding('utf8');
        const pid = newProcess.pid ?? 0;

        const wrappedNewProcess: Process = {
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
            },
            getPid: () => pid
        };

        const protocol = await core.createExternalComponentObject(request.manifest.name[0].text, JsonRpcProtocol, wrappedNewProcess, request.manifest);

        try {
            await protocol.initialize();
            return protocol.getObjectId();
        } catch (e) {
            self.destroyObject(protocol.getObjectId());
            newProcess.kill("SIGKILL");
            throw e;
        }
    }
};

class NodeLauncher implements LauncherInterface {
    async launch(_caller: ComponentRef, request: LauncherLaunchRequest): Promise<LauncherLaunchResponse> {
        const path = fileURLToPath(request.path);
        const newProcess = fork(path, request.args, {
            stdio: 'pipe',
            cwd: dirname(path),
        });

        newProcess.stdout!.setEncoding('utf8');
        newProcess.stderr!.setEncoding('utf8');
        const pid = newProcess.pid ?? 0;

        const wrappedNewProcess: Process = {
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
            },
            getPid: () => pid
        };

        const protocol = await core.createExternalComponentObject(request.manifest.name[0].text, JsonRpcProtocol, wrappedNewProcess, request.manifest);

        try {
            await protocol.initialize();
            return protocol.getObjectId();
        } catch (e) {
            self.destroyObject(protocol.getObjectId());
            newProcess.kill("SIGKILL");
            throw e;
        }
    }
};

class InlineLauncher implements LauncherInterface {
    async launch(_caller: ComponentRef, request: LauncherLaunchRequest): Promise<LauncherLaunchResponse> {
        const path = fileURLToPath(request.path);
        const imported = await import(path);

        if (!("activate" in imported) || typeof imported.activate != 'function') {
            throw new Error(`${path}: invalid inline module`);
        }

        const eventEmitter = new EventEmitter();
        const stdin = new Duplex();
        const stdout = new Duplex();
        const stderr = new Duplex();
        imported.activate(eventEmitter, request.args, request.launcherParams, stdin, stdout, stderr);

        const wrappedProcess: Process = {
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
            },
            getPid() {
                return 0;
            },
        };

        const protocol = await core.createExternalComponentObject(request.manifest.name[0].text, JsonRpcProtocol, wrappedProcess, request.manifest);

        try {
            await protocol.initialize();
            return protocol.getObjectId();
        } catch (e) {
            self.destroyObject(protocol.getObjectId());
            throw e;
        }
    }
};

export async function registerBuiltinLaunchers() {
    await core.createLauncherObject(NativeTarget.format(), NativeLauncher);
    await core.createLauncherObject(new Target("js", "any", "node").format(), NodeLauncher);
    await core.createLauncherObject(new Target("js", "any", "inline").format(), InlineLauncher);
}


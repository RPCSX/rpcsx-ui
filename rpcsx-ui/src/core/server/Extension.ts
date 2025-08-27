import { Process } from './Launcher';

import packageJson from '../../../../package.json' with { type: "json" };
import { Component, ComponentContext } from '$core/Component.js';
import { findComponent, getComponentId, registerComponent, uninitializeComponent, IComponentImpl } from './ComponentInstance';
import { createError } from 'lib/Error';

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

export class Extension implements IComponentImpl {
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
        public readonly manifest: ExtensionInfo,
        public readonly extensionProcess: Process) {

        extensionProcess.stdout.on('data', (message: string) => {
            this.receive(message);
        });
        extensionProcess.stderr.on('data', (message: string) => {
            this.debugLog(message);
        });

        this.debugLog("Starting");

        this.componentManifest = {
            ...this.manifest,
            name: this.manifest.name[0].text
        };

        extensionProcess.on('exit', () => {
            this.debugLog("Exit");
            this.alive = false;
            this.exitController.abort();
            this.expectedResponses = {};
            if (this.responseWatchdog) {
                clearTimeout(this.responseWatchdog);
            }

            uninitializeComponent(this.componentManifest);
        });

        registerComponent(this.componentManifest, this);
    }

    private debugLog(message: string) {
        const date = new Date().toLocaleString("en-US");
        for (const line of message.split('\n')) {
            if (line.length == 0) {
                continue;
            }
            process.stderr.write(`${date} [${this.manifest.name[0].text}-v${this.manifest.version}] ${line}\n`);
        }
    }

    async initialize() {
        const request: InitializeRequest = {
            client: clientInfo
        };

        const response = await this.callMethod<InitializeResponse>("$/initialize", request);

        let isInvalid = false;

        if (response.extension.name[0].text != this.manifest.name[0].text) {
            this.debugLog(`executable sends unexpected name ${response.extension.name}`);
            isInvalid = true;
        }

        if (response.extension.version != this.manifest.version) {
            this.debugLog(`executable sends unexpected version ${response.extension.version}`);
            isInvalid = true;
        }

        // FIXME: register contributions

        if (isInvalid) {
            throw createError(ErrorCode.InvalidRequest, "Extension initialize request returns invalid name/version");
        }
    }

    async activate(_context: ComponentContext, settings: JsonObject, signal?: AbortSignal | undefined) {
        const request: ActivateRequest = {
            settings
        };

        return await this.callMethod<ActivateResponse>("$/activate", request, signal);
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

    async sendNotify(notification: string, params?: JsonObject) {
        this.send({ jsonrpc: "2.0", notification, params });
    }

    async call(_caller: Component, method: string, params?: JsonObject): Promise<JsonObject | void> {
        return this.callMethod(method, params);
    }

    async notify(_caller: Component, notification: string, params: JsonObject | undefined) {
        this.sendNotify(notification, params);
    }

    async cancel(request: CancelRequest) {
        await this.sendNotify("$/cancel", request);
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
            const componentMethod = message["method"] as string;
            const params = "params" in message ? message["params"] as JsonObject : undefined;
            const [componentName, ...method] = componentMethod.split("/");
            const component = findComponent(componentName);
            const self = findComponent(this.componentManifest.name);

            if (!component || !self) {
                this.send({
                    jsonrpc: "2.0", id, error: {
                        code: ErrorCode.MethodNotFound,
                        message: componentMethod
                    }
                });

                return;
            }

            if (id !== null) {
                try {
                    const result = await component.call(self, method.join("/"), params);
                    this.send({ jsonrpc: "2.0", id, result });
                } catch (error) {
                    this.send({ jsonrpc: "2.0", id, error });
                }
            } else {
                try {
                    component.notify(self, method.join("/"), params);
                } catch (error) {
                    this.send({ jsonrpc: "2.0", error });
                }
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
                this.cancel({ id: parseInt(request) });
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

    getId() {
        return getComponentId(this.componentManifest);
    }
}


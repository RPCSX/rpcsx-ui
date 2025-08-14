import { WatchOptions } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import EventEmitter from 'events';

export class FsWatcher extends EventEmitter<{ 'event': [fs.FileChangeInfo<string>[]] }> {
    private debounce = 500;
    private events: fs.FileChangeInfo<string>[] = [];
    private flushTask?: NodeJS.Timeout;

    constructor(root: string, iterable: AsyncIterable<fs.FileChangeInfo<string>>, private abortController: AbortController) {
        super();
        root = path.resolve(root);

        const impl = async () => {
            try {
                for await (const event of iterable) {
                    const filename = event.filename ? path.join(root, event.filename) : null;
                    if (this.events.length > 0) {
                        if (event.eventType === "rename") {
                            const prevEventIndex = this.events.findIndex(x => x.filename === filename);
                            if (prevEventIndex >= 0) {
                                if (this.events[prevEventIndex].eventType === "rename") {
                                    continue;
                                }

                                this.events.splice(prevEventIndex, 1);
                            }
                        } else {
                            if (this.events.findIndex(x => x.eventType === event.eventType && x.filename === filename) >= 0) {
                                continue;
                            }
                        }
                    }

                    this.events.push({ eventType: event.eventType, filename });

                    if (this.flushTask === undefined) {
                        this.flushTask = setTimeout(() => this._flush(), this.debounce);
                    }
                }
            } catch { }
        };

        impl();
    }

    abort() {
        clearTimeout(this.flushTask);
        this.flushTask = undefined;
        this.abortController.abort();
    }

    dispose() {
        this.abort();
    }

    private _flush() {
        if (this.events.length === 0) {
            return;
        }

        this.flushTask = undefined;
        const events = this.events;
        this.events = [];

        try {
            this.emit('event', events);
        } catch (e) {
            console.error('error during file watcher processing', e);
        }
    }
};

export function createFsWatcher(root: string, options?: Omit<WatchOptions, "signal">) {
    const abortController = new AbortController();
    try {
        const iterable = fs.watch(root, { ...options, signal: abortController.signal });
        return new FsWatcher(root, iterable, abortController);
    } catch (e) {
        console.error('failed to create file watcher', e);
        throw e;
    }
}

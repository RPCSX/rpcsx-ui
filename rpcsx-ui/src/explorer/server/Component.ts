import * as self from "$";
import * as progress from "$progress";
import { IDisposable } from "$core/Disposable";
import * as fs from '$fs';
import * as path from '$core/path';
import * as core from "$core";

export class ExplorerComponent implements IDisposable {
    items: ExplorerItem[] = [];
    progressToItem: Record<number, ExplorerItem> = {};
    subscriptions: Record<number, ComponentRef> = {};
    refreshAbortController = new AbortController();
    refreshImmediate: NodeJS.Immediate | undefined = undefined;
    describedLocations = new Set<string>();

    constructor(context: ComponentContext, private locations: string[]) {
        context.manage(self.onAnyDescriberCreated(() => this.refresh()));
        core.onSettingsUpdate(event => {
            if (event.path == "/explorer/locations") {
                this.items = [];
                this.describedLocations.clear();
                this.locations = event.value as string[];
                this.refresh();
            }
        });
    }

    dispose() {
        this.refreshAbortController.abort();
        clearImmediate(this.refreshImmediate);
        this.refreshImmediate = undefined;
        this.describedLocations.clear();
        this.items = [];
    }

    private async tryDescribe(paths: string[], describers: self.Describer[]) {
        const described = await Promise.all(describers.map(d => d.describe({ uris: paths })));

        const items = described.map(item => {
            return item.results.map(result => {
                const describedLocation = paths[result.uriIndex];
                if (this.describedLocations.has(describedLocation)) {
                    return;
                }

                this.describedLocations.add(describedLocation);
                return result.item;
            }).filter(x => x !== undefined);
        }).flat();

        if (items.length > 0) {
            this.add({ items });
        }

        return paths.filter(location => !this.describedLocations.has(location));
    }

    refresh() {
        if (this.refreshImmediate) {
            this.refreshAbortController.abort();
            this.refreshAbortController = new AbortController();
            clearImmediate(this.refreshImmediate);
            this.refreshImmediate = undefined;
        }

        const abortSignal = this.refreshAbortController.signal;

        this.refreshImmediate = setImmediate(async () => {
            const describers = await self.getDescriberObjects();

            if (abortSignal.aborted) {
                return;
            }

            let workList = [...this.locations.filter(x => !this.describedLocations.has(x))];

            while (workList.length > 0) {
                const notDescribedLocations: string[] = [];

                while (workList.length > 0) {
                    notDescribedLocations.push(...await this.tryDescribe(workList.slice(0, 10), describers));
                    workList = workList.slice(10);
                }

                if (abortSignal.aborted) {
                    return;
                }

                await Promise.all(notDescribedLocations.map(async loc => {
                    try {
                        for (const item of (await (fs.fsReadDir(loc))).items) {
                            workList.push(path.join(loc, item.name));
                        }
                    } catch {}
                }));
            }

            if (!abortSignal.aborted) {
                clearImmediate(this.refreshImmediate);
                this.refreshImmediate = undefined;
            }
        });
    }

    async cancel(channel: number) {
        await progress.progressUpdate({
            channel,
            status: ProgressStatus.Canceled
        });
    }

    add(params: ExplorerAddRequest) {
        // FIXME: merge items?
        this.items.push(...params.items);

        Object.keys(this.subscriptions).forEach(subscription => {
            const key = parseInt(subscription);
            self.sendExplorerItemsEvent(this.subscriptions[key], { items: params.items, channel: key });
        });
    }

    fuzzyMatch(a: string, b: string) {
        a = a.toLowerCase().split(" ").filter(x => x).join(" ").normalize();
        b = b.toLowerCase().split(" ").filter(x => x).join(" ").normalize();
        return a.includes(b);
    }

    filterItem(item: ExplorerItem, filter: ExplorerItemFilter, strict: boolean) {
        const matchFilterString = (value: string | undefined, filter: string | undefined) => {
            if (strict) {
                return filter === undefined || filter === value;
            }

            if (filter == undefined) {
                return true;
            }

            if (value == undefined) {
                return false;
            }

            return this.fuzzyMatch(value, filter);
        };

        const matchLocalizedString = (value: LocalizedString[] | undefined, filter: string | undefined) => {
            if (filter == undefined) {
                return true;
            }

            if (value == undefined) {
                return false;
            }

            return this.fuzzyMatch(value[0].text, filter);
        };

        const matchFilterSize = (value: number | undefined, filter: number | undefined) => {
            if (strict) {
                return filter === undefined || filter === value;
            }

            if (filter == undefined) {
                return true;
            }

            if (value == undefined) {
                return false;
            }


            return value >= filter;
        };

        const matchFilterNumber = (value: number | undefined, filter: number | undefined) => {
            if (strict) {
                return filter === undefined || filter === value;
            }

            if (filter == undefined) {
                return true;
            }

            if (value == undefined) {
                return false;
            }


            return value >= filter;
        };

        return matchFilterString(item.type, filter.type) &&
            matchLocalizedString(item.name, filter.name) &&
            // matchFilterString(item.icon, filter.icon) &&
            matchFilterString(item.publisher, filter.publisher) &&
            matchFilterString(item.version, filter.version) &&
            matchFilterSize(item.size, filter.size) &&
            // matchFilterString(item.actions, filter.actions) &&
            matchFilterNumber(item.progress, filter.progress) &&
            // matchFilterString(item.launcher, filter.launcher) &&
            matchFilterString(item.titleId, filter.titleId) &&
            matchFilterString(item.contentId, filter.contentId);
    }

    itemToQueryString(item: ExplorerItem) {
        let result = "";
        if (item.name) result += item.name.map(x => x.text).join();
        if (item.publisher) result += item.publisher;
        // if (item.launcher) result += item.launcher;
        if (item.titleId) result += item.titleId;
        if (item.contentId) result += item.contentId;

        return result;
    }

    remove(params: ExplorerRemoveRequest) {
        params.items.forEach(filter => {
            this.items = this.items.filter(x => !this.filterItem(x, filter, true));
        });
    }

    async get(caller: ComponentRef, params: ExplorerGetRequest): Promise<ExplorerGetResponse> {
        // this.refresh();

        const progressChannel = params.channel ?? (await progress.progressCreate({
            name: "explorer-get",
            title: "Explorer progress"
        })).channel;
        
        const closeDisposable = caller.onClose(async () => {
            delete this.subscriptions[progressChannel];

            await progress.progressUpdate({
                channel: progressChannel,
                status: ProgressStatus.Canceled
            });
        });

        progress.onProgressUpdate(({ value }) => {
            if (value.status == ProgressStatus.Canceled) {
                closeDisposable.dispose();
                delete this.subscriptions[progressChannel];
            }
        });

        this.subscriptions[progressChannel] = caller;


        if (this.items.length > 0) {
            self.sendExplorerItemsEvent(caller, {
                channel: progressChannel,
                items: this.items
            });
        }

        return { channel: progressChannel };
    }
};



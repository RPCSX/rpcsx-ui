import { Component, ComponentId } from "$core/Component";
import * as api from "$";
import * as progress from "$progress";
import { IDisposable } from "$core/Disposable";
import { createError } from "$core/Error";

type Item = ExplorerItem & {
    source: ComponentId;
};

export class ExplorerComponent implements IDisposable {
    items: Item[] = [];
    progressToItem: Record<number, Item> = {};

    dispose() {
        this.items = [];
    }

    async cancel(channel: number) {
        await progress.progressUpdate({
            channel,
            status: ProgressStatus.Canceled
        });
    }

    add(caller: Component, params: ExplorerAddRequest) {
        // FIXME: merge items?
        this.items.push(...params.items.map(x => ({ ...x, source: caller.getId() })));
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

            return 
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
            matchFilterString(item.launcher, filter.launcher) &&
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

    remove(caller: Component, params: ExplorerRemoveRequest) {
        const callerId = caller.getId();
        params.items.forEach(filter => {
            this.items = this.items.filter(x => x.source != callerId || !this.filterItem(x, filter, true));
        });
    }

    async get(caller: Component, params: ExplorerGetRequest): Promise<ExplorerGetResponse> {
        const progressChannel = params.channel ?? (await progress.progressCreate({
            name: "explorer-get",
            title: "Explorer progress"
        })).channel;

        progress.onProgressUpdate(({ value }) => {
            if (value.status == ProgressStatus.Canceled) {
                this.cancel(progressChannel);
            }
        });

        caller.onClose(() => progress.progressUpdate({
            channel: progressChannel,
            status: ProgressStatus.Canceled
        }));

        api.sendExplorerItemsEvent(caller, {
            channel: 0,
            items: []
        });

        params.query;

        return { channel: progressChannel };
    }
};



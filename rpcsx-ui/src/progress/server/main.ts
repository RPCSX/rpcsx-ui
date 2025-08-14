import { ipcMain } from 'electron';
import { Component, ComponentContext } from '$core/Component';
import { ErrorCode } from '$core/Error';
import * as api from '$/types';
import * as event from '$/event';
import { Disposable, IDisposable } from '$core/Disposable';

type ProgressInstance = Omit<api.ProgressValue, 'channel'> & {
    creator: Component;
    disposable?: IDisposable;
};

let nextProgressChannel = 0;
let channels: Record<number, ProgressInstance> = {};
let subscriptions: Record<number, Set<Electron.WebContents>> = {};

export function activate(context: ComponentContext) {
    context.subscribe(ipcMain, 'progress/subscribe', (event: Electron.IpcMainEvent, channel: number) => {
        if (!(channel in channels)) {
            throw { code: ErrorCode.InvalidParams };
        }

        subscriptions[channel] ??= new Set();
        subscriptions[channel].add(event.sender);
        const info = channels[channel];
        event.sender.send("progress/update", {
            value: info.value,
            status: info.status,
            title: info.title,
            description: info.description,
            message: info.message,
        });
    });

    context.subscribe(ipcMain, 'progress/unsubscribe', (event: Electron.IpcMainEvent, channel: number) => {
        try {
            const channelSubscriptions = subscriptions[channel];
            if (!channelSubscriptions) {
                return;
            }

            if (!channelSubscriptions.delete(event.sender)) {
                throw { code: ErrorCode.InvalidParams };
            }
        } catch (e) {
            console.error("progress unsubscribe error", e);
        }
    });
}

export function deactivate() {
    nextProgressChannel = 0;
    for (const channelId in channels) {
        const channel = channels[channelId];

        try {
            progressUpdate(channel.creator, {
                channel: parseInt(channelId),
                status: api.ProgressStatus.Error,
                message: "Client close"
            });
        } catch { /* empty */ }
    }

    channels = {};
    subscriptions = {};
}

export function progressCreate(source: Component, params: api.ProgressCreateRequest): api.ProgressCreateResponse {
    const channel = nextProgressChannel++;

    channels[channel] = {
        creator: source,
        value: params.initialValue,
        status: api.ProgressStatus.InProgress,
        title: params.title,
        description: params.description,
    };

    const handler = () => {
        try {
            progressUpdate(source, {
                channel,
                status: api.ProgressStatus.Error,
                message: "Initiator is dead"
            });
        } catch { /* empty */ }
    };

    channels[channel].disposable = Disposable.Create(source.onClose(handler), () => {
        handler();
    });

    return { channel };
}

export function progressUpdate(caller: Component, params: api.ProgressUpdateRequest) {
    const info = channels[params.channel];

    if (!info) {
        throw { code: ErrorCode.InvalidParams };
    }

    if (info.creator != caller) {
        throw { code: ErrorCode.InvalidRequest };
    }

    if (params.value !== undefined) {
        info.value = params.value;
    }
    if (params.status !== undefined) {
        info.status = params.status;
    }
    if (params.title !== undefined) {
        info.title = params.title.length > 0 ? params.title : undefined;
    }
    if (params.description !== undefined) {
        info.description = params.description.length > 0 ? params.description : undefined;
    }
    if (params.message !== undefined) {
        info.message = params.message.length > 0 ? params.message : undefined;
    }

    event.emitProgressUpdateEvent({ value: { channel: params.channel, ...info } });

    subscriptions[params.channel] ??= new Set();
    const channelSubscriptions = subscriptions[params.channel];

    for (const subscriber of channelSubscriptions) {
        subscriber.send("progress/update", {
            value: info.value,
            status: info.status,
            title: info.title,
            description: info.description,
            message: info.message,
        });
    }

    if (params.status !== undefined) {
        if (params.status == api.ProgressStatus.Canceled ||
            params.status == api.ProgressStatus.Complete ||
            params.status == api.ProgressStatus.Error) {
            if (info.disposable) {
                info.disposable.dispose();
            }

            delete channels[params.channel];
            delete subscriptions[params.channel];
        }
    }
}

// import { ipcMain } from 'electron';
import { Component } from '$core/Component';
import { createError } from '$core/Error';
// import * as api from '$';

import { Disposable, IDisposable } from '$core/Disposable';

type ProgressInstance = Omit<ProgressValue, 'channel'> & {
    creator: Component;
    disposable?: IDisposable;
};

let nextProgressChannel = 0;
let channels: Record<number, ProgressInstance> = {};
let subscriptions: Record<number, Set<Component>> = {};

export function deactivate() {
    nextProgressChannel = 0;
    for (const channelId in channels) {
        const channel = channels[channelId];

        try {
            progressUpdate(channel.creator, {
                channel: parseInt(channelId),
                status: ProgressStatus.Error,
                message: "Client close"
            });
        } catch { /* empty */ }
    }

    channels = {};
    subscriptions = {};
}

export function progressCreate(source: Component, params: ProgressCreateRequest): ProgressCreateResponse {
    const channel = nextProgressChannel++;

    channels[channel] = {
        creator: source,
        value: params.initialValue,
        status: ProgressStatus.InProgress,
        title: params.title,
        description: params.description,
    };

    const handler = () => {
        try {
            progressUpdate(source, {
                channel,
                status: ProgressStatus.Error,
                message: "Initiator is dead"
            });
        } catch { /* empty */ }
    };

    channels[channel].disposable = Disposable.Create(source.onClose(handler), () => {
        handler();
    });

    return { channel };
}

export function progressUpdate(caller: Component, params: ProgressUpdateRequest) {
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

    // api.emitProgressUpdateEvent({ value: { channel: params.channel, ...info } });

    subscriptions[params.channel] ??= new Set();
    const channelSubscriptions = subscriptions[params.channel];

    for (const subscriber of channelSubscriptions) {
        // api.sendProgressUpdateEvent(subscriber, { value: { channel: params.channel, ...info } });
    }

    if (params.status !== undefined) {
        if (params.status == ProgressStatus.Canceled ||
            params.status == ProgressStatus.Complete ||
            params.status == ProgressStatus.Error) {
            if (info.disposable) {
                info.disposable.dispose();
            }

            delete channels[params.channel];
            delete subscriptions[params.channel];
        }
    }
}

export function progressSubscribe(caller: Component, params: ProgressSubscribeRequest) {
    if (!(params.channel in channels)) {
        throw createError(ErrorCode.InvalidParams);
    }

    subscriptions[params.channel] ??= new Set();
    subscriptions[params.channel].add(caller);

    const info = channels[params.channel];
    // api.sendProgressUpdateEvent(caller, { value: { channel: params.channel, ...info } });
}

export function progressUnsubscribe(caller: Component, params: ProgressUnsubscribeRequest) {
    const channelSubscriptions = subscriptions[params.channel];
    if (!channelSubscriptions) {
        return;
    }

    if (!channelSubscriptions.delete(caller)) {
        throw createError(ErrorCode.InvalidParams);
    }
}

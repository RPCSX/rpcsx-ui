import { Component, ComponentContext } from "$core/Component";
// import * as api from "$";
import * as progress from "$progress";
import { IDisposable } from "$core/Disposable";
import { createError } from "$core/Error";
import { ExplorerComponent } from "./Component";


const games: (ExecutableInfo & ExplorerItem)[] = [
    {
        type: 'game',
        executable: "test-executable",
        launcher: {
            type: "test-launcher",
            requirements: {}
        },
        description: [
            {
                text: "Sonic Mania"
            }
        ],
        name: [
            {
                text: "Sonic Mania"
            }
        ],
        version: "0.1"

    },
    {
        type: 'extension',
        executable: "test-executable",
        launcher: {
            type: "test-launcher",
            requirements: {}
        },
        description: [
            {
                text: "RPCSX PlayStation 3 extension"
            }
        ],
        name: [
            {
                text: "RPCSX Explorer"
            }
        ],
        version: "0.1"
    },
    {
        type: 'extension',
        executable: "test-executable",
        launcher: {
            type: "test-launcher",
            requirements: {}
        },
        description: [
            {
                text: "RPCSX PlayStation 4/5 extension"
            }
        ],
        name: [
            {
                text: "RPCSX Explorer"
            }
        ],
        version: "0.1"
    },
    {
        type: 'extension',
        executable: "test-executable",
        description: [
            {
                text: "RPCSX Dev extension"
            }
        ],
        launcher: {
            type: "test-launcher",
            requirements: {}
        },
        name: [{
            text: "Unknown"
        }],
        version: "0.1"
    },
    {
        type: 'extension',
        executable: "test-executable",
        launcher: {
            type: "test-launcher",
            requirements: {}
        },
        name: [{
            text: "Unknown"
        }],
        version: "0.1"
    },
    {
        type: 'extension',
        executable: "test-executable",
        launcher: {
            type: "test-launcher",
            requirements: {}
        },
        name: [{
            text: "Unknown"
        }],
        version: "0.1"
    },
    {
        type: 'extension',
        executable: "test-executable",
        launcher: {
            type: "test-launcher",
            requirements: {}
        },
        name: [{
            text: "Unknown"
        }],
        version: "0.1"
    },
    {
        type: 'extension',
        executable: "test-executable",
        launcher: {
            type: "test-launcher",
            requirements: {}
        },
        name: [{
            text: "Unknown"
        }],
        version: "0.1"
    },
    {
        type: 'extension',
        executable: "test-executable",
        launcher: {
            type: "test-launcher",
            requirements: {}
        },
        name: [{
            text: "Unknown"
        }],
        version: "0.1"
    },
    {
        type: 'extension',
        executable: "test-executable",
        launcher: {
            type: "test-launcher",
            requirements: {}
        },
        name: [{
            text: "Unknown"
        }],
        version: "0.1"
    },
    {
        type: 'extension',
        executable: "test-executable",
        launcher: {
            type: "test-launcher",
            requirements: {}
        },
        name: [{
            text: "Unknown"
        }],
        version: "0.1"
    },
    {
        type: 'extension',
        executable: "test-executable",
        launcher: {
            type: "test-launcher",
            requirements: {}
        },
        name: [{
            text: "Unknown"
        }],
        version: "0.1"
    }
];

let component: ExplorerComponent | undefined;


export function activate(context: ComponentContext) {
    component = new ExplorerComponent();
    context.manage(component);
}

export function deactivate() {
    component?.dispose();
    component = undefined;
}

export async function handleAdd(caller: Component, params: ExplorerAddRequest) {
    if (!component) {
        throw createError(ErrorCode.InvalidRequest);
    }

    return component.add(caller, params);
}

export function handleRemove(caller: Component, params: ExplorerRemoveRequest) {
    if (!component) {
        throw createError(ErrorCode.InvalidRequest);
    }

    return component.remove(caller, params);
}

export async function handleGet(caller: Component, params: ExplorerGetRequest): Promise<ExplorerGetResponse> {
    if (!component) {
        throw createError(ErrorCode.InvalidRequest);
    }

    return component.get(caller, params);
}

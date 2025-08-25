import { Component, ComponentContext } from "$core/Component";
// import * as api from "$";
import { createError } from "$core/Error";
import { ExplorerComponent } from "./Component";

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

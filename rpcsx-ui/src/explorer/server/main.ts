import { Component, ComponentContext } from "$core/Component";
import { createError } from "$core/Error";
import { ExplorerComponent } from "./Component";

let component: ExplorerComponent | undefined;


export function activate(context: ComponentContext, settings: JsonObject) {
    component = new ExplorerComponent(context, settings["locations"] as string[]);
    context.manage(component);
}

export function deactivate() {
    component?.dispose();
    component = undefined;
}

export async function handleAdd(_caller: Component, params: ExplorerAddRequest) {
    if (!component) {
        throw createError(ErrorCode.InvalidRequest);
    }

    return component.add(params);
}

export function handleRemove(_caller: Component, params: ExplorerRemoveRequest) {
    if (!component) {
        throw createError(ErrorCode.InvalidRequest);
    }

    return component.remove(params);
}

export async function handleGet(caller: Component, params: ExplorerGetRequest): Promise<ExplorerGetResponse> {
    if (!component) {
        throw createError(ErrorCode.InvalidRequest);
    }

    return component.get(caller, params);
}

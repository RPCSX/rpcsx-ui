import * as fs from './fs';

export async function activate() {
    await fs.initialize();
}
export async function deactivate() {
    await fs.uninitialize();
}

export async function handleOpen(caller: ComponentRef, request: FsOpenRequest) {
    return fs.open(caller, request);
}

export async function handleReadToString(caller: ComponentRef, request: FsReadToStringRequest) {
    return fs.readToString(caller, request);
}
export async function handleWriteString(caller: ComponentRef, request: FsWriteStringRequest) {
    return fs.writeString(caller, request);
}

export async function handleReadDir(caller: ComponentRef, request: FsReadDirRequest) {
    return fs.readDir(caller, request);
}

export async function handleStat(caller: ComponentRef, request: FsStatRequest) {
    return fs.stat(caller, request);
}

export function handleGetBuiltinResourcesLocation(caller: ComponentRef, request: FsGetBuiltinResourcesLocationRequest) {
    return fs.getBuiltinResourcesLocation(caller, request);
}

export function handleGetConfigLocation(caller: ComponentRef, request: FsGetConfigLocationRequest) {
    return fs.getConfigLocation(caller, request);
}

export function handleOpenDirectorySelector(caller: ComponentRef, request: FsOpenDirectorySelectorRequest) {
    return fs.openDirectorySelector(caller, request);
}

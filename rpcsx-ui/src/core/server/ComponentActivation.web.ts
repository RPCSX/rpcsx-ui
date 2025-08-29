import { ComponentInstance } from "./ComponentInstance";
import { Disposable } from "$/Disposable";
import { ipcMain } from "electron";
import { createError } from "lib/Error";

export function onComponentActivation(component: ComponentInstance) {
    const methods = component.getContribution(`methods`);
    const impl = component.getImpl();

    const createRendererComponent = (webContents: Electron.WebContents) => {
        const rendererComponent: Component = {
            getId: () => ":renderer",
            onClose: (listener) => {
                const wrapped = async () => {
                    try {
                        await listener();
                    } catch (e) {
                        console.error("onClose listener throws exception", e);
                    }
                };

                webContents.on("destroyed", wrapped);
                return Disposable.Create(() => { webContents.off("destroyed", wrapped); });
            },
            sendEvent: (event, params) => {
                webContents.send(`${component.getName()}/${event}`, params);
            },
        };

        return rendererComponent;
    };

    if (methods) {
        Object.keys(methods).forEach(method => {
            const channel = `${component.getName()}/${method}`;

            ipcMain.handle(channel, (event, params: JsonObject) => {
                if (!impl.call) {
                    return createError(ErrorCode.InternalError, `component ${component.getName()} not defines call`);
                }

                try {
                    return impl.call(createRendererComponent(event.sender), method, params);
                } catch (e) {
                    return e;
                }
            });
            component.manage(() => ipcMain.removeHandler(channel));
        });
    }

    const notifications = component.getContribution(`notifications`);

    if (notifications) {
        Object.keys(notifications).forEach(notification => {
            const channel = `${component.getName()}/${notification}`;

            const handler = (event: Electron.IpcMainInvokeEvent, params: JsonObject) => {
                if (!impl.notify) {
                    return createError(ErrorCode.InternalError, `component ${component.getName()} not defines notify`);
                }

                try {
                    return impl.notify(createRendererComponent(event.sender), notification, params);
                } catch (e) {
                    return e;
                }
            };

            ipcMain.on(channel, handler);
            component.manage(() => ipcMain.off(channel, handler));
        });
    }
}

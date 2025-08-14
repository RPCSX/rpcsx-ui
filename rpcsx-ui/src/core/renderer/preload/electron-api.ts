import { ipcRenderer } from 'electron';

export const electronAPI = {
    ipcRenderer: {
        send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
        invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
        on: (channel: string, listener: (...args: any[]) => void) => {
            const impl = (_: any, ...args: any[]) => listener(...args);
            ipcRenderer.on(channel, impl);

            return () => {
                ipcRenderer.off(channel, impl);
            };
        },
    }
};


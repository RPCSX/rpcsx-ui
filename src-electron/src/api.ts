import { ipcRenderer } from 'electron'

export const electronAPI = {
    ipcRenderer: {
        send: (channel: string, ...args: any[]) => {
            ipcRenderer.send(channel, ...args)
        }
    }
}


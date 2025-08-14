import { contextBridge } from 'electron';
import { electronAPI } from './electron-api';

if (process.contextIsolated) {
    try {
        contextBridge.exposeInMainWorld('electron', electronAPI);
    } catch (error) {
        console.error(error);
    }
} else {
    (window as any).electron = electronAPI;
}

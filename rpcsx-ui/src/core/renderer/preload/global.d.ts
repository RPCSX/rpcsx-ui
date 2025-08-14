import { electronAPI } from './electron-api.js';

declare global {
    interface Window {
        electron: typeof electronAPI;
    }
}

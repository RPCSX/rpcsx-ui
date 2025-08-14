import { electronAPI } from '../api/renderer-api.js';

declare global {
    interface Window {
        electron: typeof electronAPI;
    }
}

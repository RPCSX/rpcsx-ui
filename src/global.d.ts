import { electronAPI } from '../src-electron/src/api.js'

declare global {
    interface Window {
        electron: typeof electronAPI;
    }
}

import { app, BrowserWindow } from 'electron';
import { getSetting, loadSettings, saveSettings, setSetting } from './settings.js';
import serve from 'electron-serve';

const serveUrl = serve({ directory: '.' });

await loadSettings();

const createWindow = () => {
    const windowSetting = getSetting('window');

    const win = new BrowserWindow({
        title: "RPCSX",
        width: windowSetting.width,
        height: windowSetting.height,
        x: windowSetting.x,
        y: windowSetting.y,
        fullscreen: windowSetting.fullscreen
    });

    if (windowSetting.devTools) {
        win.webContents.openDevTools();
    }

    serveUrl(win);

    win.on('close', () => {
        const bounds = win.getBounds();
        setSetting({
            window: {
                width: bounds.width,
                height: bounds.height,
                x: bounds.x,
                y: bounds.y,
                fullscreen: win.fullScreen,
                devTools: win.webContents.isDevToolsOpened()
            }
        })
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    })
});

app.on('window-all-closed', async () => {
    await saveSettings();

    if (process.platform !== 'darwin') {
        app.quit()
    }
})


import { app, net, protocol, session, BrowserWindow, ipcMain } from 'electron';
import { getSetting, loadSettings, saveSettings, setSetting } from './settings.js';
import { rootPath } from './locations.js';
import { PathLike } from 'fs';
import path from 'path';
import fs from 'fs/promises';
import url from 'url';

await loadSettings();

function setupElectron() {
    const directory = rootPath;

    protocol.registerSchemesAsPrivileged([
        {
            scheme: 'app',
            privileges: {
                standard: true,
                secure: true,
                allowServiceWorkers: true,
                supportFetchAPI: true,
            },
        },
    ]);

    const fixPath = async (loc: PathLike) => {
        loc = loc.toString();
        if (loc.length === 0) {
            return "index.html";
        }

        try {
            const stat = await fs.stat(loc);
            if (stat.isFile()) {
                return loc;
            }

            if (stat.isDirectory()) {
                return fixPath(path.join(loc, "index.html"));
            }
        } catch {
            const ext = path.extname(loc);
            if (ext === ".html") {
                return undefined;
            }

            try {
                if ((await fs.stat(loc + ".html")).isFile()) {
                    return loc + ".html";
                }
            } catch { }
        }

        return undefined;
    }

    app.on('ready', () => {
        session.defaultSession.protocol.handle('app', async (request) => {
            const filePath = path.join(directory, decodeURIComponent(new URL(request.url).pathname));

            const relativePath = path.relative(directory, filePath);
            const isSafe = !relativePath.startsWith('..') && !path.isAbsolute(relativePath);

            if (!isSafe) {
                return new Response('bad request', {
                    status: 400,
                    headers: { 'content-type': 'text/html' }
                });
            }

            try {
                const absolutePath = await fixPath(path.join(directory, relativePath));

                if (absolutePath) {
                    return net.fetch(url.pathToFileURL(absolutePath).toString());
                }
            } catch { }

            return new Response('Not Found', {
                status: 404,
                headers: { 'content-type': 'text/html' }
            });
        });
    });
}

setupElectron();

ipcMain.on('window/create', (_event, options) => {
    const win = new BrowserWindow({
        webPreferences: {
            preload: path.join(rootPath, "preload.mjs"),
            devTools: true
        },
        ...options,
    });

    win.loadURL(`app://-/${options.url}`);
});

const createWindow = () => {
    const windowSetting = getSetting('window');

    const win = new BrowserWindow({
        title: "RPCSX",
        width: windowSetting.width,
        height: windowSetting.height,
        x: windowSetting.x,
        y: windowSetting.y,
        fullscreen: windowSetting.fullscreen,
        webPreferences: {
            preload: path.join(rootPath, "preload.mjs")
        }
    });

    if (windowSetting.devTools) {
        win.webContents.openDevTools();
    }

    win.loadURL("app://-");

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


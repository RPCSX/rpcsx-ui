import { app, net, protocol, session, BrowserWindow, ipcMain } from 'electron';
import * as locations from '$core/locations.js';
import { PathLike } from 'fs';
import path from 'path';
import fs from 'fs/promises';
import url from 'url';
import { Future } from '$core/Future.js';
import { shutdown } from '../../core/server/ComponentInstance';
import * as explorer from '$explorer';

function setupElectron() {
    const uiDirectory = path.join(locations.builtinResourcesPath, "ui");

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
    };

    app.on('ready', () => {
        session.defaultSession.protocol.handle('app', async (request) => {
            const filePath = path.join(uiDirectory, decodeURIComponent(new URL(request.url).pathname));
            console.log(`open ${filePath}, request ${new URL(request.url).pathname}`);

            const relativePath = path.relative(uiDirectory, filePath);
            const isSafe = !relativePath.startsWith('..') && !path.isAbsolute(relativePath);

            if (!isSafe) {
                return new Response('bad request', {
                    status: 400,
                    headers: { 'content-type': 'text/html' }
                });
            }

            try {
                const absolutePath = await fixPath(path.join(uiDirectory, relativePath));

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

let MainWindow: BrowserWindow;

async function activateMainWindow() {
    console.log('window creation');
    const win = new BrowserWindow({
        title: "RPCSX",
        width: 800,
        height: 600,
        x: 0,
        y: 0,
        fullscreen: false,
        webPreferences: {
            preload: path.join(locations.builtinResourcesPath, "preload.js"),
            webSecurity: false
        }
    });

    MainWindow = win;

    await win.loadURL("app://-");

}

setupElectron();

export function activate() {
    ipcMain.on('window/create', (_event, options) => {
        const win = new BrowserWindow({
            webPreferences: {
                preload: path.join(locations.builtinResourcesPath, "preload.mjs"),
            },
            ...options,
        });

        win.loadURL(`app://-/${options.url}`);
    });

    const createWindow = async () => {
        await activateMainWindow();

        const uiInitializedFuture = new Future<void>();
        ipcMain.once('frame/initialized', () => {
            console.log('frame/initialized');
            uiInitializedFuture.resolve();
        });

        if (!uiInitializedFuture.hasValue()) {
            console.log('waiting for ui initialization completion');
            await uiInitializedFuture.value;
        }

        uiInitializedFuture.dispose();

        console.log('initialization complete');

        explorer.pushExplorerView(MainWindow.webContents, {
            query: "observer/executables",
            queryParams: {
                filter: { type: 'game' }
            }
        });
    };

    app.whenReady().then(() => {
        createWindow();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    });

    app.on('window-all-closed', async () => {
        await shutdown();

        if (process.platform !== 'darwin') {
            app.quit();
        }
    });
}

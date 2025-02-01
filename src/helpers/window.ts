export async function openWindow(options: { url: string, title: string }) {
    if (window.electron) {
        window.electron.ipcRenderer.send("window/create", options);
        return;
    }

    const tauri = await import("@tauri-apps/api/webviewWindow");
    const settingsWindow = new tauri.WebviewWindow("settings", options);

    settingsWindow.once("tauri://created", () => {
        console.log("Window created");
    });

    settingsWindow.once("tauri://error", async (err) => {
        console.log(err);
    });
}

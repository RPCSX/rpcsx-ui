import * as bridge from '$core/bridge';
import * as explorer from '$explorer';
import * as setup from '$setup';
import { Window } from '$core/Window';


const mainWindow: Window = {
    pushView: (...params) => bridge.viewPush(...params),
    setView: (...params) => bridge.viewSet(...params),
    popView: () => bridge.viewPop(),
};

export async function initialize() {
    if (await setup.shouldShow().value) {
        return setup.setInitialSetupView(mainWindow, {});
    } else {
        return explorer.setExplorerView(mainWindow, {
            filter: { type: 'game' },
        });
    }
}

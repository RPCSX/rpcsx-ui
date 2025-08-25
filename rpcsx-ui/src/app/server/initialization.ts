import * as bridge from '$core/bridge';
import * as explorer from '$explorer';
import { Window } from '$core/Window';


const mainWindow: Window = {
    pushView: (...params) => bridge.viewPush(...params),
    setView: (...params) => bridge.viewSet(...params),
    popView: () => bridge.viewPop(),
};

export function initialize() {
    return explorer.pushExplorerView(mainWindow, {
        filter: {
            type: 'game'
        }
    });
}



import { protocol } from 'electron';

export function initialize() {
    return protocol.registerSchemesAsPrivileged([
        {
            scheme: 'app',
            privileges: {
                standard: true,
                secure: true,
                allowServiceWorkers: true,
                supportFetchAPI: true,
                codeCache: true
            },
        },
    ]);
}

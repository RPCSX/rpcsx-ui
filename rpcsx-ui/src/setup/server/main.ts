import * as self from '$';

export async function setShowInitialSetupScreen(caller: ComponentRef, value: boolean) {
    // TODO(DH): Implement this function
}

export async function handleShouldShow() {
    return (await self.settings.getShowInitialSetupScreen()).value;
}

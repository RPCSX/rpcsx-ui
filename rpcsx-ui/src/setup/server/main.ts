import * as self from '$';

export async function setShowInitialSetupScreen(value: boolean) {
    return self.settings.setShowInitialSetupScreen(value as any);
}

export async function handleShouldShow() {
    return (await self.settings.getShowInitialSetupScreen()).value;
}

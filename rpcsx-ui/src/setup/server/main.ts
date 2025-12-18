import * as self from '$';

export async function setShowInitialSetupScreen(value: Json) {
    return self.settings.setShowinitialsetupscreen(value);
}

export async function handleShouldShow() {
    return self.settings.getShowinitialsetupscreen();
}

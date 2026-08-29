import * as self from '$';

export async function setShowInitialSetupScreen(caller: ComponentRef, request: { value: boolean }) {
    await self.settings.setShowInitialSetupScreen(request.value);
}
 
export async function handleShouldShow() {
    const raw = await self.settings.getShowInitialSetupScreen();
    return { value: raw.value };
}
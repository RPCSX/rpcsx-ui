import { register, init, getLocaleFromNavigator } from "svelte-i18n";

register("en", () => import("./locales/en.json"));

export const localeInitialized = init({
    fallbackLocale: "en",
    initialLocale: getLocaleFromNavigator()
});

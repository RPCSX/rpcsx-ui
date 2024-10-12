<script lang="ts">
    import { Icon, Squares2x2, ListBullet, Cog6Tooth } from "svelte-hero-icons";
    import { gridLayout } from "../stores";
    import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

    export let searchTerm: string;

    function switchList() {
        $gridLayout = false;
    }

    function switchGrid() {
        $gridLayout = true;
    }

    function createSettings() {
        console.log("Making settings widow");

        const settingsWindow = new WebviewWindow("settings", {
            url: "/settings",
            title: "Settings"
        });

        settingsWindow.once("tauri://created", () => {
            console.log("Window created");
        });

        settingsWindow.once("tauri://error", (err) => {
            console.log(err)
        })
    }
</script>

<div class="sticky top-0 flex flex-row items-center p-2 gap-2 bg-neutral-900">
    <div class="inline-flex shadow-sm rounded" role="group">
        <button disabled={!$gridLayout} type="button" on:click={switchList} class="border border-r-0 border-neutral-600 text-white disabled:text-neutral-400 h-8 w-10 p-1 rounded-s bg-neutral-700 hover:bg-neutral-600 active:bg-neutral-700 shadow-sm">
            <Icon src="{ListBullet}" solid />
        </button>
        <div class="border-[0.1px] h-full border-neutral-900"/>
        <button disabled={$gridLayout} type="button" on:click={switchGrid} class="border border-l-0 border-neutral-600 text-white disabled:text-neutral-400 h-8 w-10 p-1 rounded-e bg-neutral-700 hover:bg-neutral-600 active:bg-neutral-700 shadow-sm">
            <Icon src="{Squares2x2}" solid />
        </button>
    </div>

    <button type="button" on:click={createSettings} class="border border-neutral-600 text-white disabled:text-neutral-400 h-8 w-8 p-1 rounded bg-neutral-700 hover:bg-neutral-600 active:bg-neutral-700 shadow-sm">
        <Icon src="{Cog6Tooth}" solid />
    </button>

    <div class="flex-grow" />

    <div>
        <form class="max-w-md mx-auto">
            <label for="default-search" class="mb-2 text-sm font-medium text-white sr-only">Search</label>
            <div class="relative">
                <input bind:value={searchTerm} on:input type="search" class="block w-full h-8 p-2 text-sm placeholder-neutral-400 text-white border border-neutral-600 rounded bg-neutral-700 focus:ring-blue-500 focus:border-blue-500" placeholder="Search..."/>
            </div>
        </form>
    </div>
</div>
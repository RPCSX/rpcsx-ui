<script lang="ts">
    import type { IconSource } from "@steeze-ui/heroicons";
    import type { ComponentType } from "svelte";
    import { Icon, CpuChip, Sparkles, DocumentText } from "svelte-hero-icons";
    import System from "$components/settings/System.svelte";
    import Graphics from "$components/settings/Graphics.svelte";
    import Logging from "$components/settings/Logging.svelte";

    class Tab {
        icon: IconSource;
        label: string;
        content: ComponentType;

        constructor(icon: IconSource, label: string, content: ComponentType)
        {
            this.icon = icon;
            this.label = label;
            this.content = content;
        }
    }

    let tabs: Tab[] = [
        {
            icon: CpuChip,
            label: "System",
            content: System
        },
        {
            icon: Sparkles,
            label: "Graphics",
            content: Graphics
        },
        {
            icon: DocumentText,
            label: "Logging",
            content: Logging
        },
    ];

    let activeTab = tabs[0];

    function setActiveTab(tab: Tab) {
        activeTab = tab;
    }
</script>

<div class="bg-neutral-900 flex h-full p-2 space-x-2">
    <ul class="flex-col space-y-2">
        {#each tabs as tab}
        <li>
            <button on:click={() => {setActiveTab(tab)}} class="inline-flex items-center p-2 pe-10 w-full rounded hover:bg-neutral-700 active:bg-neutral-800 shadow-sm">
                <div class="w-5 h-5 me-2 text-white">
                    <Icon src="{tab.icon}" solid />
                </div>
                {tab.label}
            </button>
            <div class="{activeTab == tab ? "" : "invisible"} relative bottom-[2px] border border-blue-500 rounded-lg mx-2" />
        </li>
        {/each}
    </ul>
    <div class="border border-neutral-600 bg-neutral-800 rounded p-2 h-full w-full">
        <svelte:component this={activeTab.content} />
    </div>
</div>
<script lang="ts">
    import { Icon, ArrowPath } from "svelte-hero-icons";
    import { _ } from "svelte-i18n";

    export let gameCount: number;

    let firmwareVersion = "0.0.0";
</script>

<div
    class="sticky bottom-0 flex flex-row p-2 gap-2 bg-neutral-800 items-center text-sm"
>
    <button
        class="border border-neutral-600 bg-neutral-700 text-white h-5 w-5 p-1 rounded hover:bg-neutral-600 active:bg-neutral-700 shadow-sm"
    >
        <Icon src={ArrowPath} solid />
    </button>
    <h1>{$_("footer.games.installed", { values: { count: gameCount } })}</h1>

    <div class="flex-grow"></div>

    <h1>
        {$_("footer.firmware.version", {
            values: { version: firmwareVersion },
        })}
    </h1>
</div>

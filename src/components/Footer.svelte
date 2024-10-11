<script lang="ts">
    import { Icon, ArrowPath } from "svelte-hero-icons";

    let gameCount = 0;
    let firmwareVersion = "0.0.0";

</script>

<div class="sticky bottom-0 flex flex-row p-2 gap-2 bg-gray-800 items-center">
    <button class="bg-gray-600 text-white h-6 w-6 px-1 rounded hover:bg-gray-700 active:bg-gray-800 ring-1 ring-white">
        <Icon src="{ArrowPath}" solid />
    </button>
    <h1>{gameCount} Games Installed</h1>
    
    <div class="flex-grow" />

    <h1>Firmware: {firmwareVersion}</h1>
</div>
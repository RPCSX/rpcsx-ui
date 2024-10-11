<script lang="ts">
    import { Icon, Squares2x2, ListBullet } from "svelte-hero-icons";
    import { gridLayout } from "../stores";

    function switchList() {
        $gridLayout = false;
    }

    function switchGrid() {
        $gridLayout = true;
    }
</script>

<div class="flex flex-row p-2 gap-2 bg-gray-800">
    <div class="inline-flex rounded-md shadow-sm" role="group">
        <button type="button" on:click={switchList} class="h-10 w-10 p-1 border rounded-s-lg text-white bg-gray-600 hover:bg-gray-700 active:bg-gray-80">
            <Icon src="{ListBullet}" solid />
        </button>
    
        <button type="button" on:click={switchGrid} class="h-10 w-10 p-1 border rounded-e-lg text-white bg-gray-600 hover:bg-gray-700 active:bg-gray-80">
            <Icon src="{Squares2x2}" solid />
        </button>
    </div>
</div>
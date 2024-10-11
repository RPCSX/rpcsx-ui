<script lang="ts">
    import { Icon, Squares2x2, ListBullet } from "svelte-hero-icons";
    import { gridLayout } from "../stores";

    export let searchTerm: string;

    function switchList() {
        $gridLayout = false;
    }

    function switchGrid() {
        $gridLayout = true;
    }
</script>

<div class="sticky top-0 flex flex-row p-2 gap-2 bg-gray-800">
    <div class="inline-flex rounded-md shadow-sm" role="group">
        <button type="button" on:click={switchList} class="h-10 w-10 p-1 border rounded-s-lg text-white bg-gray-600 hover:bg-gray-700 active:bg-gray-80">
            <Icon src="{ListBullet}" solid />
        </button>
    
        <button type="button" on:click={switchGrid} class="h-10 w-10 p-1 border rounded-e-lg text-white bg-gray-600 hover:bg-gray-700 active:bg-gray-80">
            <Icon src="{Squares2x2}" solid />
        </button>
    </div>

    <div class="flex-grow" />

    <div>
        <form class="max-w-md mx-auto">
            <label for="default-search" class="mb-2 text-sm font-medium text-white sr-only">Search</label>
            <div class="relative">
                <input bind:value={searchTerm} on:input type="search" class="block w-full p-4 text-sm placeholder-gray-400 text-white border border-gray-600 rounded-lg bg-gray-700 focus:ring-blue-500 focus:border-blue-500" placeholder="Search..."/>
            </div>
        </form>
    </div>
</div>
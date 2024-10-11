<script lang="ts">
    import GameGridItem from "./GameGridItem.svelte";
    import GameListItem from "./GameListItem.svelte";
    import { Game } from "$models/Game";
    import { gridLayout } from "../stores";

    export let games: Game[];
</script>

{#if $gridLayout}
<div class="grid grid-cols-auto-repeat justify-center gap-2 m-2">
    {#each games as game}
        <GameGridItem game={game} />
    {/each}
</div>
{:else}
<div class="flex flex-col gap-2 m-2">
    {#each games as game}
        <GameListItem game={game} />
    {/each}
</div>
{/if}
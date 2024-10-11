<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import GameListItem from "$components/GameListItem.svelte";
  import { Game } from "$models/Game";
  import GameGridItem from "$components/GameGridItem.svelte";
  import { gridLayout } from "../stores";

  let name = "";
  let greetMsg = "";

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    greetMsg = await invoke("greet", { name });
  }

  let sonicGame = new Game("Sonic Mania", "SEGA", "1.03", "CUSA07023", 197927919);
</script>

{#if $gridLayout}
<div class="overflow-y-scroll grid grid-cols-auto-repeat justify-center gap-3 m-3">
  <GameGridItem game={sonicGame} />
  <GameGridItem game={sonicGame} />
  <GameGridItem game={sonicGame} />
  <GameGridItem game={sonicGame} />
  <GameGridItem game={sonicGame} />
  <GameGridItem game={sonicGame} />
  <GameGridItem game={sonicGame} />
  <GameGridItem game={sonicGame} />
  <GameGridItem game={sonicGame} />
  <GameGridItem game={sonicGame} />
  <GameGridItem game={sonicGame} />
</div>
{:else}
<div class="overflow-y-scroll flex flex-col gap-3 m-3">
  <GameListItem game={sonicGame} />
  <GameListItem game={sonicGame} />
</div>
{/if}

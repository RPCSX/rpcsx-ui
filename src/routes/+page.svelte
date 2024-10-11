<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import GameListItem from "$components/GameListItem.svelte";

  let name = "";
  let greetMsg = "";

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    greetMsg = await invoke("greet", { name });
  }
</script>

<div>
  <GameListItem />
  <GameListItem />
</div>

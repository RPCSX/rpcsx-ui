<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";

  let name = "";
  let greetMsg = "";

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
    greetMsg = await invoke("greet", { name });
  }
</script>

<div class="flex flex-col">
  
</div>

<script lang="ts">
  import Progress from "../Progress.svelte";
  export let channel: number;
</script>

<div class="min-h-full h-full content-center bg-neural-700">
  <Progress bind:channel></Progress>
</div>

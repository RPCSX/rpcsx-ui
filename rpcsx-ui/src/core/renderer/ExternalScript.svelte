<script lang="ts">
  import { onMount } from "svelte";

  let {
    onLoad,
    onError,
    url,
  }: {
    onLoad?: (event: Event) => void;
    onError?: (event: ErrorEvent) => void;
    url: string;
  } = $props();

  let script: HTMLElement;

  onMount(async () => {
    if (onLoad) {
      script.addEventListener("load", (event) => onLoad(event));
    }
    if (onError) {
      script.addEventListener("error", (event) => onError(event));
    }
  });
</script>

<svelte:head>
  <script bind:this={script} src={url} type="module"></script>
</svelte:head>

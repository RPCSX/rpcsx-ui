<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import * as api from "$";

  let progressElement: HTMLElement;
  export let hidden = false;
  export let channel: number;

  if (window.electron) {
    onMount(() => {
      api.onProgressUpdate((event) => {
        progressElement.animate(
          [
            { width: progressElement.style.width },
            { width: `${event.value}%` },
          ],
          {
            duration: 600,
            iterations: 1,
            fill: "forwards",
            easing: "ease-in-out",
          },
        );

        if (
          event.value.status == ProgressStatus.Error ||
          event.value.status == ProgressStatus.Complete
        ) {
          // setTimeout(hide, 1500);
        }
      });
    });

    onDestroy(() => api.progressUnsubscribe({ channel }));
    api.progressSubscribe({ channel });
  }

  export function hide() {
    hidden = true;
    if (progressElement) {
      progressElement.classList.remove("modal-show");
      progressElement.classList.add("modal-hide-fast");
    }
  }
  export function show() {
    hidden = false;
    if (progressElement) {
      progressElement.classList.remove("modal-hide-fast");
      progressElement.classList.add("modal-show");
    }
  }
</script>

<div
  class="progress-bar shadow-xl m-10 shadow-white"
  style={hidden ? "display:none" : ""}
>
  <span class="bg-white rounded progress-fg" bind:this={progressElement}>
    <span class="progress-bg"> </span>
  </span>
</div>

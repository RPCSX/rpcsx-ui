<script lang="ts">
  import * as api from "$/types";
  import { onDestroy, onMount } from "svelte";

  let progressElement: HTMLElement;
  export let hidden = false;
  export let channel: number;

  if (window.electron) {
    const subscribe = (channel: string, listener: (...args: any[]) => void) => {
      onDestroy(window.electron.ipcRenderer.on(channel, listener));
    };

    onMount(() => {
      subscribe("progress/update", (progress: api.ProgressValue) => {
        progressElement.animate(
          [{ width: progressElement.style.width }, { width: `${progress.value}%` }],
          {
            duration: 600,
            iterations: 1,
            fill: "forwards",
            easing: "ease-in-out",
          },
        );

        if (
          progress.status == api.ProgressStatus.Error ||
          progress.status == api.ProgressStatus.Complete
        ) {
          // setTimeout(hide, 1500);
        }
      });
    });

    onDestroy(() => {
      // console.log(window.electron, window.electron.ipcRenderer, channel);
      window.electron.ipcRenderer.send("progress/unsubscribe", channel);
    });

    window.electron.ipcRenderer.send("progress/subscribe", channel);
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

<div class="progress-bar shadow-xl m-10 shadow-white" style={hidden ? "display:none" : ""}>
  <span class="bg-white rounded progress-fg" bind:this={progressElement}>
    <span class="progress-bg"> </span>
  </span>
</div>

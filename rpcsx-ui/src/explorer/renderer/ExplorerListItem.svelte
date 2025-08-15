<script lang="ts">
  import * as itemUtil from "helpers/ExplorerItemUtils";
  import { FileHelper } from "$core/helpers/FileHelper";

  export let item: ExplorerItem;
  export let oncontextmenu: (() => void) | undefined;
</script>

<!-- svelte-ignore <a11y_no_static_element_interactions> -->
<div
  class="flex flex-row p-3 gap-3 text-sm rounded bg-neutral-700 hover:bg-neutral-600 shadow-sm"
  oncontextmenu={() => {
    if (oncontextmenu) {
      oncontextmenu();
    }
  }}
>
  <img
    class="h-20 w-20"
    src={itemUtil.getIcon(item)}
    alt="{itemUtil.getName(item)} Icon"
    loading="lazy"
  />
  <div class="flex flex-col text-left">
    <h1 class="font-bold">{itemUtil.getName(item)}</h1>
    <p>{item.publisher}</p>
    <p>{item.version}</p>
    <p></p>
  </div>

  <div class="flex-grow"></div>

  <div class="flex flex-col text-right">
    <p>{"titleId" in item ? item.titleId : ""}</p>
    <p>{item.size ? FileHelper.humanFileSize(item.size, true) : ""}</p>
    <p>{"contentId" in item ? itemUtil.getRegion(item.contentId) : ""}</p>
    <p>{"contentId" in item ? item.contentId : ""}</p>
  </div>
</div>

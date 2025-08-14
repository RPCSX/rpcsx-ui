<script lang="ts">
  import type * as api from "lib/Explorer";
  import * as itemUtil from "helpers/ExplorerItemUtils";

  export let item: api.ExplorerItem;
  export let oncontextmenu: (() => void) | undefined;
</script>

<!-- svelte-ignore <a11y_no_static_element_interactions> -->
<div
  class="flex flex-col text-center items-center p-3 gap-3 text-sm rounded bg-neutral-700 hover:bg-neutral-600 active:ring-1 shadow-sm"
  oncontextmenu={() => {
    if (oncontextmenu) oncontextmenu();
  }}
>
  <img
    class="h-[8rem] w-[8rem]"
    src={itemUtil.getIcon(item)}
    alt="{itemUtil.getName(item)} Icon"
    loading="lazy"
  />
  <div class="flex flex-col justify-center items-center w-[8rem] h-[4rem]">
    <h1 class="overflow-hidden line-clamp-2">{itemUtil.getName(item)}</h1>
    <h3 class="overflow-hidden line-clamp-2">{"titleId" in item ? item.titleId : ""}</h3>
  </div>
</div>

<script lang="ts">
  import Footer from "$core/Footer.svelte";
  import Header from "$core/Header.svelte";
  import { getKeyModifiers, KeyboardModifiers } from "$core/helpers/Keyboard";
  import { onDestroy, onMount } from "svelte";
  import * as itemUtil from "helpers/ExplorerItemUtils";
  import Menu from "$menu/Menu.svelte";
  import { type MenuItem } from "$menu/models/MenuItem";
  import ExplorerGridItem from "../ExplorerGridItem.svelte";
  import ExplorerListItem from "../ExplorerListItem.svelte";

  export let query: string;
  export let queryParams: {
    filter?: Partial<ExplorerItem>;
    sort?: Partial<ExplorerItem>;
    sortAsc?: boolean;
  };

  export let layout: "list" | "grid" = "list";

  console.log(layout, query, queryParams);

  const items: ExplorerItem[] = [];
  let filteredItems: ExplorerItem[] = [];
  let contextMenu: Menu;

  let rootElement: HTMLDivElement;
  let searchElement: Header;
  let searchTerm = "";
  let prevSearchTerm = "";

  const search = () => {
    const text = searchTerm.toLowerCase();
    const extendsPrevious = prevSearchTerm.length > 0 && text.includes(prevSearchTerm);
    prevSearchTerm = text;

    filteredItems =
      text.length === 0
        ? items
        : (extendsPrevious ? filteredItems : items).filter(
            (item) => itemUtil.getName(item)?.toLowerCase().includes(text) ?? false,
          );
  };

  let removeKeyboardInterception = () => {};

  function installKeyboardInterception() {
    let element: null | HTMLElement = rootElement;
    while (element) {
      if (element.parentElement?.parentElement != null) {
        element = element.parentElement;
        continue;
      }

      break;
    }

    const handler = (e: KeyboardEvent) => {
      const modifiers = getKeyModifiers(e);
      if (modifiers != KeyboardModifiers.None) {
        if (
          modifiers != KeyboardModifiers.Shift &&
          (modifiers != KeyboardModifiers.Ctrl || e.code != "KeyF")
        ) {
          return;
        }
      }

      if (e.key.length != 1) {
        return;
      }

      if (
        (e.key >= "A" && e.key <= "Z") ||
        (e.key >= "a" && e.key <= "z") ||
        (e.key >= "0" && e.key <= "9")
      ) {
        searchElement.focus();
        e.stopPropagation();
      }
    };

    if (element) {
      element.addEventListener("keydown", handler);
      removeKeyboardInterception = () => {
        element?.removeEventListener("keydown", handler);
      };
    }
  }

  onMount(() => {
    installKeyboardInterception();
  });

  onDestroy(() => {
    removeKeyboardInterception();
  });

  function __<T extends string>(x: T, _options?: object) {
    // return $_(x, _options);
    return x;
  }

  function createContextMenu(item: ExplorerItem) {
    const menuItems: MenuItem[] = [];

    if (item.actions) {
      if (item.actions.run) {
        const action = item.actions.run;
        menuItems.push({
          label: __("Run"),
          onClick: () => window.electron.ipcRenderer.send("action/run", action),
        });

        menuItems.push({
          label: __("Run with ..."),
          onClick: () => window.electron.ipcRenderer.send("action/run-with", action),
        });

        if (item.actions.install && item.actions.delete) {
          const installAction = item.actions.install;
          const deleteAction = item.actions.delete;
          menuItems.push({
            label: __("Reinstall"),
            onClick: () =>
              window.electron.ipcRenderer.send("action/reinstall", installAction, deleteAction),
          });
        }
      } else if (item.actions.install) {
        if (item.actions.install) {
          const action = item.actions.install;
          menuItems.push({
            label: __("Install"),
            onClick: () => window.electron.ipcRenderer.send("action/install", action),
          });
        }
      }

      if (item.actions.settings) {
        const action = item.actions.settings;
        menuItems.push({
          label: __("Settings"),
          onClick: () => window.electron.ipcRenderer.send("action/settings", action),
        });
      }

      if (item.actions.delete) {
        const action = item.actions.delete;
        menuItems.push({
          label: __("Delete"),
          onClick: () => window.electron.ipcRenderer.send("action/delete", action),
        });
      }
    }

    menuItems.push({ label: "Run" });
    menuItems.push({ label: "Run with ..." });
    menuItems.push({ label: "Settings" });
    menuItems.push({ label: "Delete" });

    return () => {
      if (menuItems.length > 0) {
        contextMenu.show(itemUtil.getName(item), menuItems);
      }
    };
  }

  if (window.electron) {
    window.electron.ipcRenderer.on(query, (params: { executables: ExplorerItem[] }) => {
      // console.log(newItems);
      items.push(...params.executables);
      search();
    });
    window.electron.ipcRenderer.send(query, queryParams);
  }

  search();
</script>

<Menu bind:this={contextMenu}></Menu>

<div class="min-h-full h-full flex flex-col" bind:this={rootElement}>
  <Header bind:searchTerm bind:this={searchElement} on:input={search} bind:layout />
  <div class="flex-grow overflow-y-scroll">
    {#if layout === "grid"}
      <div class="grid grid-cols-auto-repeat justify-center gap-2 m-2">
        {#each filteredItems as item}
          <ExplorerGridItem {item} oncontextmenu={createContextMenu(item)} />
        {/each}
      </div>
    {:else}
      <div class="flex flex-col gap-2 m-2">
        {#each filteredItems as item}
          <ExplorerListItem {item} oncontextmenu={createContextMenu(item)} />
        {/each}
      </div>
    {/if}
  </div>

  <Footer bind:gameCount={filteredItems.length} />
</div>

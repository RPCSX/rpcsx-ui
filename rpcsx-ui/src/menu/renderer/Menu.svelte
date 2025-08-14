<script lang="ts">
    import { type MenuItem } from "models/MenuItem";
    let menuElement: HTMLElement;
    let contentElement: HTMLElement;
    let items: MenuItem[] = [];
    let title = "";

    export function show(showTitle: string, showItems: MenuItem[]) {
        items = showItems;
        title = showTitle;

        menuElement.classList.remove("modal-hide");
        contentElement.classList.remove("modal-content-hide");
        menuElement.style.display = "block";
    }
    export function hide() {
        menuElement.classList.add("modal-hide");
        contentElement.classList.add("modal-content-hide");
        menuElement.style.display = "none";
    }
</script>

<!-- svelte-ignore <a11y_click_events_have_key_events, a11y_no_static_element_interactions> -->
<div class="modal" bind:this={menuElement}>
    <div class="modal-bg" on:click={() => hide()}></div>
    <div
        class="modal-content bg-neutral-900 flex h-full p-2 space-x-2"
        bind:this={contentElement}
        on:click={() => {}}
    >
        <ul class="flex-col space-y-2 w-full">
            <li class="w-full">
                {title}
            </li>

            {#each items as item}
                <li class="w-full">
                    <button
                        on:click={() => {
                            hide();

                            if (item.onClick) {
                                item.onClick();
                            }
                        }}
                        class="hover:bg-neutral-600 inline-flex items-center p-2 pe-10 w-full rounded active:bg-neutral-800/40 shadow-sm"
                    >
                        {#if item.icon !== undefined}
                            <img
                                class="w-5 h-5 me-2 text-white"
                                src={item.icon}
                                alt="{item.label} Icon"
                            />
                        {/if}

                        {item.label}
                    </button>
                </li>
            {/each}
        </ul>
    </div>
</div>

<script lang="ts">
    import { Icon, ChevronDown } from "svelte-hero-icons";

    export let values: string[];
    export let selectedValue: string;
    export let label: string;

    let isDropdownOpen = false;

    function toggleDropdown() {
        isDropdownOpen = !isDropdownOpen;
    }

    function changeSelectedValue(value: string) {
        selectedValue = value;
        toggleDropdown();
    }
</script>

<div class="flex flex-row gap-5 items-center">
    <div class="w-56">
        <p>{label}</p>
    </div>
    <div>
        <button
            on:click={toggleDropdown}
            type="button"
            class="inline-flex gap-2 items-center rounded border border-neutral-600 bg-neutral-700 text-white px-2 py-1 hover:bg-neutral-600 active:bg-neutral-700 shadow-sm"
        >
            {selectedValue}
            <div class="flex-grow"></div>
            <div class="w-5 h-5">
                <Icon src={ChevronDown} solid />
            </div>
        </button>

        <div
            class="{isDropdownOpen
                ? ''
                : 'hidden'} absolute mt-1 z-10 rounded border border-neutral-600 bg-neutral-700 text-white p-1 shadow-sm"
        >
            <ul class="inline-flex flex-col gap-1 w-full">
                {#each values as value}
                    <button
                        class="{selectedValue == value
                            ? 'bg-blue-600'
                            : 'hover:bg-neutral-600'} rounded px-2 py-1 text-left"
                        on:click={() => changeSelectedValue(value)}
                    >
                        <li>
                            {value}
                        </li>
                    </button>
                {/each}
            </ul>
        </div>
    </div>
</div>

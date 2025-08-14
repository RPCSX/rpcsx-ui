<script lang="ts">
    import { Icon } from "svelte-hero-icons";
    import type { Schema } from "$core/Schema";
    import Toggle from "../Toggle.svelte";

    export let schema: Schema;
    export let value: any;
    export let depth = 0;
    export let active = 0;
</script>

{#if schema.type === "object"}
    {#if depth === 0}
        <div class="bg-neutral-900 flex h-full p-2 space-x-2">
            <ul class="flex-col space-y-2">
                {#each Object.keys(schema.properties) as property, index}
                    <li>
                        <button
                            on:click={() => (active = index)}
                            class="{active == index
                                ? 'bg-blue-700/40'
                                : 'hover:bg-neutral-700/40'} inline-flex items-center p-2 pe-10 w-full rounded active:bg-neutral-800/40 shadow-sm"
                        >
                            {#if "icon" in schema.properties[property]}
                                <div class="w-5 h-5 me-2 text-white">
                                    <Icon
                                        src={schema.properties[property]?.icon}
                                        solid
                                    />
                                </div>
                            {/if}

                            {schema.properties[property].label}
                        </button>
                    </li>
                {/each}
            </ul>
            <div
                class="border border-neutral-600 bg-neutral-800 rounded p-2 h-full w-full"
            >
                <self
                    schema={schema.properties[
                        Object.keys(schema.properties)[active]
                    ]}
                    value={value[Object.keys(schema.properties)[active]]}
                    depth={depth + 1}
                ></self>
                <!-- <svelte:component this={activeTab.content} /> -->
            </div>
        </div>
    {:else}
        <div class="bg-neutral-900 flex h-full p-2 space-x-2">
            <ul class="flex-col space-y-2">
                {#each Object.keys(schema.properties) as property, index}
                    <li>
                        <button
                            on:click={() => (active = index)}
                            class="{active == index
                                ? 'bg-blue-700/40'
                                : 'hover:bg-neutral-700/40'} inline-flex items-center p-2 pe-10 w-full rounded active:bg-neutral-800/40 shadow-sm"
                        >
                            {#if "icon" in schema.properties[property]}
                                <div class="w-5 h-5 me-2 text-white">
                                    <Icon
                                        src={schema.properties[property]?.icon}
                                        solid
                                    />
                                </div>
                            {/if}

                            {schema.properties[property].label}
                        </button>
                    </li>
                {/each}
            </ul>
            <div
                class="border border-neutral-600 bg-neutral-800 rounded p-2 h-full w-full"
            >
                <self
                    schema={schema.properties[
                        Object.keys(schema.properties)[active]
                    ]}
                    value={value[Object.keys(schema.properties)[active]]}
                    depth={depth + 1}
                ></self>
            </div>
        </div>
    {/if}
{:else if schema.type === "boolean"}
    <Toggle
        value={value || schema.defaultValue}
        label={schema.label ?? ""}
        onchange={(newValue) => (value = newValue)}
    />
{:else}
    Unimplemented {schema.type}
{/if}

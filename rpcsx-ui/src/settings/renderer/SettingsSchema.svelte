<script lang="ts">
    import { Icon } from "svelte-hero-icons";
    import type { Schema } from "$core/Schema";
    import Toggle from "./Toggle.svelte";
    import * as core from "$core";
    import SettingsSchema from "./SettingsSchema.svelte";

    export let schema: Schema;
    export let value: any;
    export let depth = 0;
    export let active = 0;
</script>

{#if schema !== undefined}
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
                                            src={schema.properties[property]
                                                ?.icon}
                                            solid
                                        />
                                    </div>
                                {/if}

                                {schema.properties[property].label ?? property}
                            </button>
                        </li>
                    {/each}
                    <li>
                        <button
                            on:click={() => {
                                active = Object.keys(schema.properties).length;
                                core.popView();
                            }}
                            class="{active ==
                            Object.keys(schema.properties).length
                                ? 'bg-blue-700/40'
                                : 'hover:bg-neutral-700/40'} inline-flex items-center p-2 pe-10 w-full rounded active:bg-neutral-800/40 shadow-sm"
                        >
                            {"Exit"}
                        </button>
                    </li>
                </ul>
                <div
                    class="border border-neutral-600 bg-neutral-800 rounded p-2 h-full w-full"
                >
                    <SettingsSchema
                        schema={schema.properties[
                            Object.keys(schema.properties)[active]
                        ]}
                        value={value[Object.keys(schema.properties)[active]]}
                        depth={depth + 1}
                    ></SettingsSchema>
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
                                            src={schema.properties[property]
                                                ?.icon}
                                            solid
                                        />
                                    </div>
                                {/if}

                                {schema.properties[property].label ?? property}
                            </button>
                        </li>
                    {/each}
                </ul>
                <div
                    class="border border-neutral-600 bg-neutral-800 rounded p-2 h-full w-full"
                >
                    <SettingsSchema
                        schema={schema.properties[
                            Object.keys(schema.properties)[active]
                        ]}
                        value={value[Object.keys(schema.properties)[active]]}
                        depth={depth + 1}
                    ></SettingsSchema>
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
        <h1>Unimplemented {schema.type}</h1>
    {/if}
{/if}

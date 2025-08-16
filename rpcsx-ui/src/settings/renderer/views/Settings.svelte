<script lang="ts">
    import SettingsSchema from "../SettingsSchema.svelte";
    import { type Schema } from "$core/Schema";
    import { onMount } from "svelte";
    import * as core from "$core";

    let schema: Schema | undefined;
    let value: any;

    export let path = "";

    onMount(async () => {
        const result = await core.settingsGet({ path });
        schema = result.schema as Schema;
        value = result.value;
    });
</script>

{#if schema !== undefined}
    <SettingsSchema {schema} {value}></SettingsSchema>
{/if}

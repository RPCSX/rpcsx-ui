<script lang="ts">
    import Dropdown from "./elements/Dropdown.svelte";
    import Toggle from "./elements/Toggle.svelte";
</script>

<h1>System</h1>
<div class="gap-2 my-2 flex flex-col items-start">
    <Toggle value={true} label={"Test"} />
    <Dropdown
        values={["Test", "test2", "Test 3: Test Harder"]}
        selectedValue={"Test"}
        label={"Test Dropdown"}
    />
</div>

<script lang="ts">
    export let value: boolean;
    export let label: string;
</script>

<label class="inline-flex items-center cursor-pointer">
    <input type="checkbox" {value} class="sr-only peer" />
    <div
        class="relative w-11 h-6 bg-neutral-700 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all border-gray-600 peer-checked:bg-blue-600"
    ></div>
    <span class="ms-3 text-sm font-medium text-gray-300">{label}</span>
</label>

<script lang="ts">

let gameCount = 0;
let firmwareVersion = "0.0.0";

</script>

<div class="flex flex-row p-2 gap-2 bg-slate-800">
    <button class="bg-slate-600 text-white px-1 rounded hover:bg-slate-700 active:bg-slate-800 ring-1 ring-white">
        <i class="fa-solid fa-rotate-right">
    </button>
    <h1>{gameCount} Games Installed</h1>
    
    <div class="flex-grow" />

    <h1>Firmware: {firmwareVersion}</h1>
</div>
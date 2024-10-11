<script lang="ts">
    import { Game } from "$models/Game";
    import { FileHelper } from "$helpers/FileHelper";

    export let game: Game;

    let fileSize = FileHelper.humanFileSize(game.size, true);
</script>

<div class="flex flex-row p-3 gap-3 rounded-lg bg-gray-800">
    <img class="h-20 w-20" src={game.image} alt="{game.name} Icon" />
    <div class="flex flex-col">
        <h1 class="font-bold">{game.name}</h1>
        <p>{game.publisher}</p>
        <p>{game.version}</p>
    </div>

    <div class="flex-grow"/>

    <div class="flex flex-col text-right">
        <p>{game.serial}</p>
        <p>01:10:00</p>
        <p>{fileSize}</p>
    </div>
</div>
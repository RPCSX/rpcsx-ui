<script lang="ts">
    import { Game } from "$models/Game";
    import { FileHelper } from "$helpers/FileHelper";

    export let game: Game;

    let fileSize = FileHelper.humanFileSize(game.size, true);
</script>

<div class="flex flex-row p-3 gap-3 text-sm rounded bg-neutral-700 hover:bg-neutral-600 shadow-sm">
    <img class="h-20 w-20" src={game.image} alt="{game.name} Icon" />
    <div class="flex flex-col text-left">
        <h1 class="font-bold">{game.name}</h1>
        <p>{game.publisher}</p>
        <p>{game.version}</p>
    </div>

    <div class="flex-grow"></div>

    <div class="flex flex-col text-right">
        <p>{game.serial}</p>
        <p>{fileSize}</p>
        <p>{game.region.toString()}</p>
    </div>
</div>
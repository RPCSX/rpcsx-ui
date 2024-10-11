<script lang="ts">
    import { Game } from "$models/Game";
    import { FileHelper } from "$helpers/FileHelper";

    export let game: Game;

    let fileSize = FileHelper.humanFileSize(game.size, true);
</script>

<div class="flex flex-col text-center items-center p-3 gap-3 rounded-lg bg-slate-800">
    <img class="h-[8rem] w-[8rem]" src="/icon0.png" />
    <div class="flex flex-col justify-center items-center w-[8rem] h-[4rem]">
        <h1 class="overflow-hidden line-clamp-2">{game.name}</h1>
    </div>
</div>
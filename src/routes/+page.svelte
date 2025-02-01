<script lang="ts">
    import Header from "components/Header.svelte";
    import Footer from "components/Footer.svelte";
    import { Game, Region } from "models/Game";
    import GameLibrary from "components/GameLibrary.svelte";

    const sonicGame = new Game(
        "Sonic Mania",
        "./icon0.png",
        "SEGA",
        Region.USA,
        "1.03",
        "CUSA07023",
        197927919,
    );
    const weAreDoomedGame = new Game(
        "WE ARE DOOMED",
        "./icon1.png",
        "Vertex Pop Inc.",
        Region.Europe,
        "1.00",
        "CUSA02394",
        32903780,
    );
    const games = [sonicGame, weAreDoomedGame];
    let filteredGames: Game[] = [];

    let searchTerm = "";
    let gameCount = 0;

    const searchGames = () => {
        filteredGames = games.filter((game) => {
            let gameTitle = game.name.toLowerCase();
            return gameTitle.includes(searchTerm.toLowerCase());
        });

        gameCount = filteredGames.length;
    };

    searchGames();
</script>

<div class="min-h-full h-full flex flex-col">
    <Header bind:searchTerm on:input={searchGames} />
    <div class="flex-grow overflow-y-scroll">
        <GameLibrary games={filteredGames} />
    </div>
    <Footer bind:gameCount />
</div>

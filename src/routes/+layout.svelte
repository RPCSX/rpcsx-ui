<script lang="ts">
    import Header from "$components/Header.svelte";
    import Footer from "$components/Footer.svelte";
    import { Game } from "$models/Game";
    import GameLibrary from "$components/GameLibrary.svelte";

    let sonicGame = new Game("Sonic Mania", "./icon0.png", "SEGA", "1.03", "CUSA07023", 197927919);
    let weAreDoomedGame = new Game("WE ARE DOOMED", "./icon1.png", "Vertex Pop Inc.", "1.00", "CUSA02394", 197927919);
    let games = [sonicGame, weAreDoomedGame, sonicGame, sonicGame, sonicGame, sonicGame, sonicGame, sonicGame, sonicGame];
    let filteredGames: Game[] = [];

    let searchTerm = "";

    const searchGames = () => {
        return filteredGames = games.filter(game => {
            let gameTitle = game.name.toLowerCase();
            return gameTitle.includes(searchTerm.toLowerCase())
        });
    }

    searchGames()
</script>

<div class="min-h-full h-full flex flex-col">
    <Header bind:searchTerm on:input={searchGames} />
    <main class="flex-grow overflow-y-scroll" id="content">
        <GameLibrary games={filteredGames} />
        <slot />
    </main>
    <Footer />
</div>
<script lang="ts">
    import Header from "$components/Header.svelte";
    import Footer from "$components/Footer.svelte";
</script>

<div class="min-h-full h-full flex flex-col">
    <Header />
    <main class="flex-grow" id="content">
        <slot />
    </main>
    <Footer />
</div>
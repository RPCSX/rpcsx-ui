<script lang="ts">
    import Footer from "$components/Footer.svelte";
</script>

<div class="min-h-full h-full flex flex-col">
    <main class="flex-grow" id="content">
        <slot />
    </main>
    <Footer />
</div>
<script>
    /** @type { number } */
    export let status;
    /** @type { Error } */
    export let error;
</script>

<div class="h-screen w-screen bg-gray-100 flex items-center">
    <div class="container flex flex-col md:flex-row items-center justify-center px-5 text-gray-700">
        <div class="max-w-lg">
            <div class="text-5xl font-dark font-bold">{status}</div>
            <p class="text-2xl md:text-3xl font-light leading-normal">Sorry we couldn't find this page. </p>
            <p class="mb-8">But dont worry, you can find plenty of other things on our homepage.</p>
            <p class="mb-8 h-auto text-sm text-green-500">{error.stack}</p>
        </div>
    </div>
</div>
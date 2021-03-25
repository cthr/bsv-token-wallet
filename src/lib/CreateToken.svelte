<script>
    export let deployToken, deployedLocation;
    let tknName = "Cool Coin", tknSymbol = "COOL", tknEmoji = "😎", tknMint = 21000000, tknDecimals = 8;
</script>

<h2 class="text-2xl font-semibold text-gray-800 dark:text-white md:text-3xl">Create Your <span class="text-indigo-600 dark:text-indigo-400">Token</span></h2>
					
<p class="mt-2 text-sm text-gray-500 dark:text-gray-400 md:text-base">Simply enter the tokens details and press deploy!‎‎‏‏‎ ‎</p>

<label class="block mt-4">
    <span class="text-gray-500">Token Name</span>
    <input bind:value={tknName} class="form-input mt-1 block w-full shadow appearance-none border rounded py-2 px-3 text-grey-darker" placeholder="Cool Coin">
</label>

<label class="block mt-2">
    <span class="text-gray-500">Token Symbol</span>
    <input bind:value={tknSymbol} class="form-input mt-1 block w-full shadow appearance-none border rounded py-2 px-3 text-grey-darker" placeholder="COOL">
</label>

<label class="block mt-2">
    <span class="text-gray-500">Token Emoji</span>
    <input bind:value={tknEmoji} class="form-input mt-1 block w-full shadow appearance-none border rounded py-2 px-3 text-grey-darker" placeholder="😎">
</label>

<label class="block mt-2">
    <span class="text-gray-500">Mint Amount</span>
    <input bind:value={tknMint} class="form-input mt-1 block w-full shadow appearance-none border rounded py-2 px-3 text-grey-darker" placeholder="21000000">
</label>

<label class="block mt-2">
    <span class="text-gray-500">Decimals</span>
    <input bind:value={tknDecimals} class="form-input mt-1 block w-full shadow appearance-none border rounded py-2 px-3 text-grey-darker" placeholder="8">
</label>


<div class="flex mt-4 float-right">
    <a on:click|preventDefault={() => deployToken(tknName, tknSymbol, tknEmoji, parseInt(tknMint), parseInt(tknDecimals))} href="#" class="block px-3 py-2 text-xs font-semibold text-white transition-colors duration-200 transform bg-gray-900 rounded-md hover:bg-gray-700">Deploy Token</a>
</div>

{#if deployedLocation !== ""}
    <p class="mt-2 text-sm text-gray-500 dark:text-gray-400 md:text-base">Your token has been deployed:</p>
    <p class="mt-2 text-gray-500 dark:text-gray-400 md:text-base" style="font-size: 0.5rem;">{deployedLocation}</p>
{/if}
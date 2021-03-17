<script>
    export let newWallet, loadFromPrivKey, inputPrivKey, loginErrorMessage;
</script>

<h2 class="text-2xl font-semibold text-gray-800 dark:text-white md:text-3xl">Access Your <span class="text-indigo-600 dark:text-indigo-400">Token</span> Wallet</h2>

<p class="mt-2 text-sm text-gray-500 dark:text-gray-400 md:text-base">Please enter your private key, or generate a new account!</p>

<label class="block mt-2">
    <span class="text-gray-500">Private Key</span>
    <input bind:value={inputPrivKey} class="form-input mt-1 block w-full shadow appearance-none border rounded py-2 px-3 text-grey-darker" placeholder="L1uFp4xfhsX9...">
    <span class="text-red-500 text-sm">{loginErrorMessage}</span>
</label>

<div class="flex mt-4 float-right">
    <a on:click|preventDefault={() => newWallet()} href="#" class="block px-3 py-2 mx-4 text-xs font-semibold text-gray-700 transition-colors duration-200 transform bg-gray-200 rounded-md hover:bg-gray-300">New Wallet</a>
    <a on:click|preventDefault={() => loadFromPrivKey(inputPrivKey)} href="#" class="block px-3 py-2 text-xs font-semibold text-white transition-colors duration-200 transform bg-gray-900 rounded-md hover:bg-gray-700">Load Wallet</a>
</div>
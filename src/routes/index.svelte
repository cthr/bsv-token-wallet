<script>
	import { onMount } from 'svelte';
	import { address, privateKey, token, tokens } from '../app/_utils/stores';
	import CreateToken from '../app/components/CreateToken.svelte';
	import Login from '../app/components/Login.svelte';

	let page = "logout";

	let run;
	let deployedLocation = "";

	let inputPrivKey = "", loginErrorMessage = "";

	let tokenLocation = "";

	let sendToAddress = "", sendAmount = 0;

	// L1uFp4xfhsX9wvRofTq27EdMN2AvBJDD7zNMY9pzxxMS2njiH3NE
	onMount(async () => {
		login();
	});

	const login = async () => {
		let wif = localStorage.getItem('privKey');

		if(wif && wif !== "" && wif !== null) {
			await loadFromPrivKey(wif);
		}
	}

	const loadRun = async () => {
		const unsubscribe = privateKey.subscribe(value => {
			try {
				run = new Run({
					owner: value,
					purse: value,
					network: 'main'
				});

				run.trust('*');
			} catch(e) {
				console.log("Unable to load Run SDK - Maybe you're signed out?")
			}
		});

		console.log("Run SDK loaded!");
		page = "wallet";

		loadAllTokens();
	}

	const deployToken = async (tokenName, tokenSymbol, tokenEmoji, tokenMint) => {
		class CoinClass extends Token {}
		CoinClass.symbol = tokenSymbol;
		CoinClass.metadata = {
			emoji: tokenEmoji
		}

		const deploy = async () => {
			run.deploy(CoinClass);
			await run.sync();
			console.log(CoinClass.location);
			deployedLocation = CoinClass.location;
		}

		let className = tokenName.replace(/ /g,"_");
		Object.defineProperty (CoinClass, 'name', {value: className});

		console.log("Deploying Token");
		await deploy();

		mint(tokenMint);
	}

	const mint = async(tokenMint) => {
		const contract = await run.load(deployedLocation);
		await contract.sync();

		// Mint to owner address
		const coin = contract.mint(tokenMint);
		await coin.sync();

		console.log(coin);
	}

	const send = async(toAddress, tokenAmount) => {
		console.log("Sending " + tokenAmount + " tokens to " + toAddress);

		let currentTokenLocation = $token.location;
		await combine(currentTokenLocation);

		const contract = await run.load(currentTokenLocation);
		await contract.sync();

		console.log(contract);

		await run.inventory.sync();
		const tokens = run.inventory.jigs.filter(jig => jig instanceof contract);
		console.log(tokens);

		const coin = tokens[0];

		const sent = coin.send(toAddress, tokenAmount);
		await sent.sync();
		console.log(sent);
	}

	const combine = async(location) => {
		const contract = await run.load(location);
		await contract.sync();

		console.log(contract);

		await run.inventory.sync();
		const tokens = run.inventory.jigs.filter(jig => jig instanceof contract);
		console.log(tokens);

		if(tokens.length > 1) {
			const combined = tokens[0].combine(...tokens.slice(1));
			await combined.sync();
		}
	}

	const newWallet = async() => {
		console.log("Creating new wallet");
		let newPrivKey = bsv.PrivateKey.fromRandom();

		let addressFromPrivKey = newPrivKey.toAddress();
		console.log(addressFromPrivKey);

		console.log(newPrivKey.toString());
		inputPrivKey = newPrivKey.toString();
	}

	const loadFromPrivKey = async(key) => {
		try {
			let privKeyFromWIF = bsv.PrivateKey.fromWIF(key);
			let addressFromPrivKey = privKeyFromWIF.toAddress();

			address.set(addressFromPrivKey);
			privateKey.set(key);

			localStorage.setItem("privKey", key);

			await loadRun();
		} catch(e) {
			loginErrorMessage = "Error: Bad input!";
		}
	}

	const setPage = async(newPage) => {
		page = newPage;

		if(newPage === "logout") {
			address.set(null);
			privateKey.set(null);
		}
	}

	const loadAllTokens = async () => {
		await run.inventory.sync();
		console.log(Object.keys(run.inventory.code[0]));

		tokens.set([]);

		let classes = run.inventory.code;

		for(let i = 0; i < classes.length; i++) {
			if(Object.keys(run.inventory.code[i].deps)[0] === "Token") {
				let tknName = classes[i].name.replace(/_/g, "");
				let tknSymbol = classes[i].symbol;
				let tknEmoji = classes[i].metadata.emoji;
				let tknLocation = classes[i].location;

				const tknJigs = run.inventory.jigs.filter(jig => jig instanceof classes[i]);

				let tknBalance = tknJigs.reduce(function(a, b){
					return a + b['amount'];
				}, 0);

				$tokens = [...$tokens, {
					name: tknName,
					symbol: tknSymbol,
					emoji: tknEmoji,
					balance: tknBalance,
					location: tknLocation
				}]
			}
		}
	}

	const logout = async() => {
		setPage("logout");		
		localStorage.setItem("privKey", "");
	}
</script>

<svelte:head>
	<title>Token Wallet</title>
</svelte:head>

<div class="flex items-center justify-center w-full px-6 py-8 md:w-full">
	<div class="max-w-xl">
		{#if page !== "logout"}
			<div class="flex w-full mb-4">
				<div class="flex">
					<a on:click|preventDefault={() => setPage("wallet")} href="#" class="block py-2 text-base font-semibold {page === "wallet" ? "text-indigo-400" : "text-gray-700"} transition-colors duration-200 transform hover:text-indigo-200">Wallet</a>
					<a on:click|preventDefault={() => setPage("create")} href="#" class="block py-2 mx-4 text-base font-semibold {page === "create" ? "text-indigo-400" : "text-gray-700"} transition-colors duration-200 transform hover:text-indigo-400">Create Token</a>
				</div>

				<div class="flex float-right">
					<a on:click|preventDefault={() => logout()} href="#" class="block py-2 mx-4 text-base font-semibold {page === "logout" ? "text-indigo-400" : "text-gray-700"} transition-colors duration-200 transform hover:text-indigo-400">Logout</a>
				</div>
			</div>
		{/if}

		{#if page === "wallet"}
			<h2 class="text-2xl font-semibold text-gray-800 dark:text-white md:text-3xl">Your <span class="text-indigo-600 dark:text-indigo-400">Token</span> Wallet</h2>
			<p class="mt-2 text-sm text-gray-500 dark:text-gray-400 md:text-base">View and manage your tokens from this interface!</p>

			{#if $token === null}
				{#each $tokens as tkn}
					<div on:click|preventDefault={() => token.set(tkn)} class="container flex mx-auto w-full items-center justify-center">
						<ul class="flex flex-col mt-1 w-full">
							<li class="border-gray-400 flex flex-row mb-2">
								<div class="select-none cursor-pointer bg-gray-200 rounded-md flex flex-1 items-center p-4  transition duration-500 ease-in-out transform hover:-translate-y-1 hover:shadow-lg">
									<div class="flex flex-col rounded-md w-10 h-10 bg-gray-300 justify-center items-center mr-4">{tkn.emoji}</div>
									<div class="flex-1 pl-1 mr-16">
										<div class="font-medium">{tkn.name}</div>
										<div class="text-gray-600 text-sm">{tkn.symbol}</div>
									</div>
									<div class="text-gray-600 text-xs">{tkn.balance}</div>
								</div>
							</li>
						</ul>
					</div>
				{/each}
			{:else}
				<label class="block mt-4">
					<span class="text-gray-500">To Address</span>
					<input bind:value={sendToAddress} class="form-input mt-1 block w-full shadow appearance-none border rounded py-2 px-3 text-grey-darker" placeholder="1DFKSDLF">
				</label>

				<label class="block mt-4">
					<span class="text-gray-500">Amount {$token.emoji}</span>
					<input bind:value={sendAmount} class="form-input mt-1 block w-full shadow appearance-none border rounded py-2 px-3 text-grey-darker" placeholder="10">
				</label>

				<div class="flex mt-4 float-right">
					<a on:click|preventDefault={() => token.set(null)} href="#" class="block px-3 py-2 mx-4 text-xs font-semibold text-gray-700 transition-colors duration-200 transform bg-gray-200 rounded-md hover:bg-gray-300">Go Back</a>
					<a on:click|preventDefault={() => send(sendToAddress, parseInt(sendAmount))} href="#" class="block px-3 py-2 text-xs font-semibold text-white transition-colors duration-200 transform bg-gray-900 rounded-md hover:bg-gray-700">Send Token</a>
				</div>
			{/if}
		{:else if page === "create"}
			<CreateToken deployToken={deployToken} deployedLocation={deployedLocation} />
		{:else if page === "logout"}
			{#if $privateKey === "" || $privateKey === null}
				<Login newWallet={newWallet} loadFromPrivKey={loadFromPrivKey} inputPrivKey={inputPrivKey} loginErrorMessage={loginErrorMessage} />
			{/if}
		{/if}
	</div>
</div>
<script>
	import { onMount } from 'svelte';
	import { address, privateKey, token, tokens } from '../util/stores';
	import CreateToken from '../lib/CreateToken.svelte';
	import Login from '../lib/Login.svelte';

	let page = "logout";
	let run;
	let deployedLocation = "";
	let inputPrivKey = "", loginErrorMessage = "";
	let sendToAddress = "", sendAmount = 0;
	let addressQR = "";
	let showPrivKey = false;
	let bsvBalance = 0;

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
		try {
			run = new Run({
				owner: $privateKey,
				purse: $privateKey,
				network: 'main'
			});
			run.trust('*');
		} catch(e) {
			console.log("Unable to load Run SDK - Maybe you're signed out?")
		}
		console.log("Run SDK loaded!");
		page = "wallet";
		loadAllTokens();
	}

	const deployToken = async (tokenName, tokenSymbol, tokenEmoji, tokenMint, tokenDecimals) => {
		class CoinClass extends Token {
			// override _checkAmount to remove MAX_SAFE_INTEGER check, i don't know if this is safe..
			_checkAmount (amount) {
				if (typeof amount !== 'number') throw new Error('amount is not a number')
				if (!Number.isInteger(amount)) throw new Error('amount must be an integer')
				if (amount <= 0) throw new Error('amount must be positive')
			}
		}

		CoinClass.symbol = tokenSymbol;
		CoinClass.decimals = tokenDecimals;
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

		await deploy();

		let atomicMint = await convDecimalToAtomic(tokenMint, tokenDecimals);
		console.log(atomicMint);

		let amountToMint = BN(atomicMint.toFixed(0));

		// mint the tokens
		mint(amountToMint);
	}

	const mint = async(tokenMint) => {
		const contract = await run.load(deployedLocation);
		await contract.sync();
		console.log(Number(tokenMint));

		// mint to owner address
		const coin = contract.mint(Number(tokenMint));
		await coin.sync();
		console.log(coin);
	}

	const sendBitcoin = async(toAddress, bsvAmount) => {
		const rawtx = new bsv.Transaction().to(toAddress, bsvAmount).sign($privateKey).toString('hex');
		await run.blockchain.broadcast(rawtx);
	}

	const send = async(toAddress, tokenAmount, tokenDecimals) => {
		console.log("Sending " + await convDecimalToAtomic(tokenAmount, tokenDecimals) + " tokens to " + toAddress);
		
		let currentTokenLocation = $token.location;
		await combine(currentTokenLocation);

		const contract = await run.load(currentTokenLocation);
		await contract.sync();

		console.log(contract);
		await run.inventory.sync();

		const tokens = run.inventory.jigs.filter(jig => jig instanceof contract);
		console.log(tokens);

		let atomicSend = await convDecimalToAtomic(tokenAmount, tokenDecimals);
		let amountToSend = BN(atomicSend).toFixed(0);

		console.log(amountToSend);

		const coin = tokens[0];
		const sent = coin.send(toAddress, Number(amountToSend));
		await sent.sync();

		console.log(sent);
		sendToAddress = "";
		sendAmount = 0;
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
			createQRCode();
			privateKey.set(key);
			localStorage.setItem("privKey", key);
			await loadRun();
		} catch(e) {
			loginErrorMessage = "Error: Bad input!";
		}
	}

	const setPage = async(newPage) => {
		page = newPage;
		token.set(null);
		if(newPage === "logout") {
			address.set(null);
			privateKey.set(null);
		} else {
			loadAllTokens();
		}
	}

	const loadAllTokens = async () => {
		await run.inventory.sync();
		bsvBalance = await run.purse.balance();
		let tempTokens = [];
		let classes = [];
		let jigs = run.inventory.jigs;
		let code = run.inventory.code;
		for(let i = 0; i < jigs.length; i++) {
			if(jigs[i] instanceof Token) {
				const rawtx = await run.blockchain.fetch(jigs[i].location.split("_")[0]);
				const tknContract = Run.util.metadata(rawtx).ref[0];
				console.log(Run.util.metadata(rawtx));
				if(!classes.includes(tknContract)) {
					classes.push(tknContract);
				}
			}
		}
		for(let i = 0; i < code.length; i++) {
			if(Object.keys(code[i].deps)[0] === "Token") {
				if(!classes.includes(code[i].location)) {
					classes.push(code[i].location);
				}
			}
		}
		console.log(classes);
		for(let i = 0; i < classes.length; i++) {
			const contract = await run.load(classes[i]);
			//await contract.sync();
			if(Object.keys(contract.deps)[0] === "Token") {
				let tknName = contract.name.replace(/_/g, " ");
				let tknSymbol = contract.symbol;
				let tknDecimals = contract.decimals;
				let tknEmoji = contract.metadata.emoji;
				let tknLocation = contract.location;
				const tknJigs = run.inventory.jigs.filter(jig => jig instanceof contract);
				console.log(tknJigs);

				let tknBalance = tknJigs.reduce(function(a, b){
					return a + b['amount'];
				}, 0);
				console.log(tknBalance);
				tknBalance = await convAtomicToDecimal(tknBalance, tknDecimals);
				console.log(tknBalance);
				if(tknBalance > 0) {
					tempTokens = [...tempTokens, {
						name: tknName,
						symbol: tknSymbol,
						emoji: tknEmoji,
						balance: tknBalance,
						location: tknLocation,
						decimals: tknDecimals
					}];
				}
			}
		}
		tokens.set(tempTokens);
	}

	const logout = async() => {
		setPage("logout");		
		localStorage.setItem("privKey", "");
	}

	const createQRCode = async () => {
		const qr = qrcode(0, 'L');
		qr.width = 200;
		qr.addData(`bitcoin:${$address}?sv`);
		qr.make();
		addressQR = qr.createDataURL(6);
	}

	const convAtomicToDecimal = async (amount, decimals) => {
		let atomicAmount = BN(amount);
		let atomCalc = atomicAmount.div(10**decimals);
		return atomCalc;
	}

	const convDecimalToAtomic = async (amount, decimals) => {
		let decimalAmount = BN(amount);
		let decCalc = decimalAmount.times(10**decimals);
		return decCalc;
	}

	function delay(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	function BN(number) {
		return new BigNumber(number);
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
					<a on:click|preventDefault={() => setPage("wallet")} href="#" class="block py-2 mr-3 text-base font-semibold {page === "wallet" ? "text-indigo-400" : "text-gray-700"} transition-colors duration-200 transform hover:text-indigo-200">Wallet</a>
					<a on:click|preventDefault={() => setPage("create")} href="#" class="block py-2 mx-3 text-base font-semibold {page === "create" ? "text-indigo-400" : "text-gray-700"} transition-colors duration-200 transform hover:text-indigo-400">Deploy</a>
					<a on:click|preventDefault={() => setPage("address")} href="#" class="block py-2 mx-3 text-base font-semibold {page === "address" ? "text-indigo-400" : "text-gray-700"} transition-colors duration-200 transform hover:text-indigo-400">Address</a>
				</div>

				<div class="w-full">
					<a on:click|preventDefault={() => logout()} href="#" class="block float-right py-2 text-base font-semibold {page === "logout" ? "text-indigo-400" : "text-gray-700"} transition-colors duration-200 transform hover:text-indigo-400">Logout</a>
				</div>
			</div>
		{/if}

		{#if page === "wallet"}
			<h2 class="text-2xl font-semibold text-gray-800 dark:text-white md:text-3xl">Your <span class="text-indigo-600 dark:text-indigo-400">Token</span> Wallet</h2>
			<p class="mt-2 text-sm text-gray-500 dark:text-gray-400 md:text-base">View and manage your tokens from this interface!</p>

			{#if $token === null}
				<div on:click|preventDefault={() => token.set("bitcoin")} class="container flex mx-auto w-full items-center justify-center">
					<ul class="flex flex-col mt-1 w-full">
						<li class="border-gray-400 flex flex-row mb-2">
							<div class="select-none cursor-pointer bg-gray-200 rounded-md flex flex-1 items-center p-4  transition duration-500 ease-in-out transform hover:-translate-y-1 hover:shadow-lg">
								<div class="flex flex-col rounded-md w-10 h-10 bg-gray-300 justify-center items-center mr-4"><img class="p-2" src="./img/bsv.svg" alt="Bitcoin SV" /></div>
								<div class="flex-1 pl-1 mr-16">
									<div class="font-medium">Bitcoin SV</div>
									<div class="text-gray-600 text-sm">BSV</div>
								</div>
								<div class="text-gray-600 text-xs">{bsvBalance}</div>
							</div>
						</li>
					</ul>
				</div>
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
									<div class="text-xs text-right">
										<p class="text-gray-600">{tkn.balance}</p>
										<p class="text-gray-400">{tkn.decimals} Decimals</p>
									</div>
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
					{#if $token === "bitcoin"}
						<span class="flex text-gray-500">Amount <img class="flex ml-1 w-4" src="./img/bsv.svg" alt="Bitcoin SV" /></span>
					{:else}
						<span class="text-gray-500">Amount {$token.emoji}</span>
					{/if}
					<input bind:value={sendAmount} class="form-input mt-1 block w-full shadow appearance-none border rounded py-2 px-3 text-grey-darker" placeholder="10">
				</label>

				<div class="flex mt-4 float-right">
					<a on:click|preventDefault={() => { setPage("wallet"); token.set(null); }} href="#" class="block px-3 py-2 mx-4 text-xs font-semibold text-gray-700 transition-colors duration-200 transform bg-gray-200 rounded-md hover:bg-gray-300">Go Back</a>
					<a on:click|preventDefault={() => {$token === "bitcoin" ? sendBitcoin(sendToAddress, sendAmount) : send(sendToAddress, sendAmount, $token.decimals)}} href="#" class="block px-3 py-2 text-xs font-semibold text-white transition-colors duration-200 transform bg-gray-900 rounded-md hover:bg-gray-700">Send Token</a>
				</div>
			{/if}
		{:else if page === "address"}
			<h2 class="text-2xl font-semibold text-gray-800 dark:text-white md:text-3xl">Your <span class="text-indigo-600 dark:text-indigo-400">Token</span> Address</h2>
			<p class="mt-2 text-sm text-gray-500 dark:text-gray-400 md:text-base">You should only deposit $BSV and BSV Tokens!‎‎‏‏‎ ‎ ‎ ‎  ‎‎</p>
			<div class="flex w-full justify-center">
				<img class="flex content-center" src="{addressQR}" alt="Address QR Code" />
			</div>
			<p class="font-bold text-xs text-center">{$address}</p>
			<div class="flex w-full justify-center">
				<a href="#" on:click|preventDefault={() => showPrivKey = !showPrivKey} class="text-xs text-center w-full">{showPrivKey ? "Hide" : "Show"} Private Key</a>
			</div>
			{#if showPrivKey}
				<p class="text-center" style="font-size: 0.5rem;">{$privateKey}</p>
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
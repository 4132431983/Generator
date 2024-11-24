فرحان:
// Import necessary libraries
import fs from 'fs'; // File system module to handle file writing
import bip39 from 'bip39';
import { HDNode } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import TronWeb from 'tronweb';
import axios from 'axios';
import chalk from 'chalk'; // Library to add color to console output

// API Endpoints
const BTC_API = 'https://blockchain.info/q/addressbalance/';
const ETH_API = 'https://api.etherscan.io/api';
const TRX_API = 'https://api.trongrid.io/v1/accounts/';
const ETHERSCAN_API_KEY = 'Q9RH26VHMJAI7J2K3HYGU7B5M9UFEH69UJ'; // Replace with your Etherscan API key

// Set up TronWeb
const tronWeb = new TronWeb({ fullHost: 'https://api.trongrid.io' });

// Generate a valid BIP-39 mnemonic
export function generateMnemonic() {
    const mnemonic = bip39.generateMnemonic();
    if (bip39.validateMnemonic(mnemonic)) {
        return mnemonic;
    }
    throw new Error('Invalid mnemonic generated.');
}

// Derive BTC address
export function deriveBTCAddress(mnemonic) {
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const root = bitcoin.bip32.fromSeed(seed);
    const child = root.derivePath("m/44'/0'/0'/0/0");
    return bitcoin.payments.p2pkh({ pubkey: child.publicKey }).address;
}

// Derive ETH address
export function deriveETHAddress(mnemonic) {
    const hdNode = HDNode.fromMnemonic(mnemonic);
    return hdNode.derivePath("m/44'/60'/0'/0/0").address;
}

// Derive TRX address
export function deriveTRXAddress(mnemonic) {
    const hdNode = HDNode.fromMnemonic(mnemonic);
    const wallet = hdNode.derivePath("m/44'/195'/0'/0/0");
    return tronWeb.address.fromPrivateKey(wallet.privateKey);
}

// Check BTC balance
export async function checkBTCBalance(address) {
    try {
        const response = await axios.get(`${BTC_API}${address}?confirmations=0`);
        return parseFloat(response.data) / 1e8; // Convert satoshis to BTC
    } catch {
        return 0;
    }
}

// Check ETH balance
export async function checkETHBalance(address) {
    try {
        const response = await axios.get(ETH_API, {
            params: {
                module: 'account',
                action: 'balance',
                address,
                apikey: ETHERSCAN_API_KEY
            }
        });
        return parseFloat(response.data.result) / 1e18; // Convert wei to ETH
    } catch {
        return 0;
    }
}

// Check TRX balance
export async function checkTRXBalance(address) {
    try {
        const response = await axios.get(`${TRX_API}${address}`);
        return response.data.data[0]?.balance / 1e6 || 0; // Convert sun to TRX
    } catch {
        return 0;
    }
}

// Save wallet details to a file
function saveToFile(mnemonic, btcBalance, ethBalance, trxBalance, btcAddress, ethAddress, trxAddress) {
    const walletDetails = `
Mnemonic: ${mnemonic}
BTC Address: ${btcAddress}, Balance: ${btcBalance}
ETH Address: ${ethAddress}, Balance: ${ethBalance}
TRX Address: ${trxAddress}, Balance: ${trxBalance}
-----------------------------------------
`;
    fs.appendFileSync('bah.txt', walletDetails, 'utf8');
    console.log(chalk.green('Wallet with balance saved to bah.txt'));
}

// Generate and check balances in batches
async function processBatch(batchSize, foundWallets, maxWallets) {
    const promises = [];
    for (let i = 0; i < batchSize; i++) {
        const mnemonic = generateMnemonic();
        const btcAddress = deriveBTCAddress(mnemonic);
        const ethAddress = deriveETHAddress(mnemonic);
        const trxAddress = deriveTRXAddress(mnemonic);

        console.log(`Generated Wallet #${i + 1}`);
        console.log('Mnemonic:', mnemonic);
        console.log('BTC Address:', btcAddress);
        console.log('ETH Address:', ethAddress);
        console.log('TRX Address:', trxAddress);

        // Add balance checks
        promises.push(
            Promise.all([
                checkBTCBalance(btcAddress),
                checkETHBalance(ethAddress),
                checkTRXBalance(trxAddress)
            ]).then(([btcBalance, ethBalance, trxBalance]) => {

if (btcBalance > 0  ethBalance > 0  trxBalance > 0) {
                    // Wallet with balance found - highlight in green
                    console.log(chalk.green(`Found Wallet with Balance!`));
                    console.log(chalk.green('Mnemonic:', mnemonic));
                    console.log(chalk.green('BTC Balance:', btcBalance));
                    console.log(chalk.green('ETH Balance:', ethBalance));
                    console.log(chalk.green('TRX Balance:', trxBalance));

                    // Save to file
                    saveToFile(mnemonic, btcBalance, ethBalance, trxBalance, btcAddress, ethAddress, trxAddress);
                    foundWallets.count++;
                } else {
                    // Wallet with no balance - normal output
                    console.log(`Wallet has no balance.`);
                }
            })
        );

        // Stop generating wallets if the target is reached
        if (foundWallets.count >= maxWallets) {
            console.log(chalk.green('Target number of wallets with balance reached.'));
            break;
        }
    }

    // Wait for all checks in the batch to complete
    await Promise.all(promises);
}

// Main function to handle multiple batches
export async function main() {
    const batchSize = 1000; // Generate and check 1000 wallets per batch
    const maxWallets = 3; // Stop after finding 3 wallets with balance
    const targetBatchesPerSecond = 1; // 1 batch per second
    const interval = 1000 / targetBatchesPerSecond; // Interval in milliseconds
    const foundWallets = { count: 0 }; // Counter to track wallets with balance

    console.log('Starting wallet generation and balance check...');
    while (foundWallets.count < maxWallets) {
        await processBatch(batchSize, foundWallets, maxWallets);
        console.log(`Batch of ${batchSize} wallets processed.`);
        await new Promise((resolve) => setTimeout(resolve, interval));
    }

    console.log(chalk.green('Process completed. Found the target number of wallets with balance.'));
}

// Uncomment below to run directly
// main().catch(console.error);
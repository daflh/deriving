import base32 from 'base32.js';
import { bech32 } from 'bech32';
import crc from 'crc';
import * as bip32 from 'bip32';
import * as edHd from 'ed25519-hd-key';
import * as bitcoinLib from 'bitcoinjs-lib';
import * as ethereumUtil from 'ethereumjs-util';
import nacl from 'tweetnacl';
import networkList from '../network-list.json';
import {
	base58,
	rippleUtils,
	cosmosUtils,
	eosUtils
} from './utils';

const keyGen = {};

for (const netId in networkList) {
	const network = networkList[netId];

    if (netId === 'bitcoin' || network.useBitcoinKeyScheme) {
        const prefixes = Object.assign({}, bitcoinLib.networks.bitcoin);
        if (network.hasOwnProperty('p2pkhPrefix'))
            prefixes.pubKeyHash = network.p2pkhPrefix;
        if (network.hasOwnProperty('p2shPrefix'))
            prefixes.scriptHash = network.p2shPrefix;
        if (network.hasOwnProperty('wifPrefix'))
            prefixes.wif = network.wifPrefix;

        keyGen[netId] = (seed, path) => {
            const seedBuffer = Buffer.from(seed, 'hex');
            const masterWallet = bip32.fromSeed(seedBuffer, prefixes);
            const wallet = masterWallet.derivePath(path);
            const rawPublicKey = wallet.publicKey;
            let publicKey = rawPublicKey.toString('hex');
            let privateKey = wallet.toWIF();
            let { address } = bitcoinLib.payments.p2pkh({ pubkey: rawPublicKey, network: prefixes });

            if (netId === 'ripple') {
                address = rippleUtils.convertAddress(address);
                privateKey = rippleUtils.convertPrivateKey(privateKey);
                
            } else if (netId === 'eos') {
                address = '';
                publicKey = eosUtils.bufferToPublicKey(rawPublicKey);
                privateKey = eosUtils.bufferToPrivateKey(wallet.privateKey);

            } else if (netId === 'cosmos') {
                address = cosmosUtils.bufferToAddress(rawPublicKey, 'cosmos');
                publicKey = cosmosUtils.bufferToPublicKey(rawPublicKey, 'cosmos');
                privateKey = wallet.privateKey.toString('base64');

            } else if (netId === 'thorChain') {
				address = cosmosUtils.bufferToAddress(rawPublicKey, 'thor');
				publicKey = rawPublicKey.toString("hex");
				privateKey = wallet.privateKey.toString("hex");

			} else if (netId === 'terra') {
				address = cosmosUtils.bufferToAddress(rawPublicKey, 'terra');
				publicKey = rawPublicKey.toString("hex");
				privateKey = wallet.privateKey.toString("hex");

            } else if (netId === 'binanceChain') {
				address = cosmosUtils.bufferToAddress(rawPublicKey, 'bnb');
				publicKey = cosmosUtils.bufferToPublicKey(rawPublicKey, 'bnb');
				privateKey = wallet.privateKey.toString("hex");
                
            } else if (netId === 'cryptoOrgChain') {
				address = cosmosUtils.bufferToAddress(rawPublicKey, 'cro');
				publicKey = rawPublicKey.toString("hex");
				privateKey = wallet.privateKey.toString("hex");
			}
        
            return { address, publicKey, privateKey };
        };

    } else if (netId === 'ethereum' || network.isEvmCompatible) {
        keyGen[netId] = (seed, path) => {
            const seedBuffer = Buffer.from(seed, 'hex');
            const masterWallet = bip32.fromSeed(seedBuffer);
            const wallet = masterWallet.derivePath(path);
			const ethPublicKey = ethereumUtil.importPublic(wallet.publicKey);
			const addressBuffer = ethereumUtil.publicToAddress(ethPublicKey);
			const hexAddress = addressBuffer.toString('hex');
			const checksumAddress = ethereumUtil.toChecksumAddress(hexAddress);
        
            return {
				address: ethereumUtil.addHexPrefix(checksumAddress),
				publicKey: ethereumUtil.addHexPrefix(wallet.publicKey.toString('hex')),
				privateKey: ethereumUtil.bufferToHex(wallet.privateKey)
			};
        };

	} else if (netId === 'tron') {
        keyGen[netId] = (seed, path) => {
            const seedBuffer = Buffer.from(seed, 'hex');
            const masterWallet = bip32.fromSeed(seedBuffer);
            const wallet = masterWallet.derivePath(path);
			const ethPublicKey = ethereumUtil.importPublic(wallet.publicKey);
			const addressBuffer = ethereumUtil.publicToAddress(ethPublicKey);
			const address = bitcoinLib.address.toBase58Check(addressBuffer, 0x41);
        
            return {
				address,
				publicKey: wallet.publicKey.toString('hex'),
				privateKey: wallet.privateKey.toString('hex')
			};
        };

    } else if (netId === 'elrond') {
        keyGen[netId] = (seed, path) => {
            const prvKeyBuffer = edHd.derivePath(path, seed).key;
            const pubKeyBuffer = edHd.getPublicKey(prvKeyBuffer, false);
            const address = bech32.encode('erd', bech32.toWords(pubKeyBuffer));
        
            return {
                address,
                publicKey: pubKeyBuffer.toString('hex'),
                privateKey: prvKeyBuffer.toString('hex')
            };
        };

    } else if (netId === 'solana') {
        keyGen[netId] = (seed, path) => {
            const derivedSeed = edHd.derivePath(path, seed).key;
            const keypair = nacl.sign.keyPair.fromSeed(derivedSeed);
            const publicKey = base58.encode(keypair.publicKey);
            const privateKey = base58.encode(keypair.secretKey);
        
            return { address: publicKey, publicKey, privateKey };
        };

    } else if (netId === 'stellar') {
        function encodeCheck(versionByteName, data) {    
            const versionBytes = {
                ed25519PublicKey: 6 << 3, // G
                ed25519SecretSeed: 18 << 3, // S
            };
            const versionByte = versionBytes[versionByteName];
            const versionBuffer = Buffer.from([versionByte]);
            const payload = Buffer.concat([versionBuffer, Buffer.from(data)]);
            const checksum = Buffer.alloc(2);
            checksum.writeUInt16LE(crc.crc16xmodem(payload), 0);
            const unencoded = Buffer.concat([payload, checksum]);
          
            return base32.encode(unencoded);
        }

        keyGen[netId] = (seed, path) => {
            const derivedSeed = edHd.derivePath(path, seed).key;
            const rawPublicKey = nacl.sign.keyPair.fromSeed(derivedSeed).publicKey;
            const publicKey = encodeCheck('ed25519PublicKey', rawPublicKey);
            const privateKey = encodeCheck('ed25519SecretSeed', derivedSeed);

            return { address: publicKey, publicKey, privateKey };
        };

    } else {
        throw new Error(`Undescribed network: ${netId}`);
    }
}

export default keyGen;

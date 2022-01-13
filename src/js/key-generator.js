import base32 from 'base32.js';
import crc from 'crc';
import * as bip32 from 'bip32';
import * as edHd from 'ed25519-hd-key';
import * as bitcoinLib from 'bitcoinjs-lib';
import { hdkey as EthereumHDKey } from 'ethereumjs-wallet';
import nacl from 'tweetnacl';
import networkList from '../network-list.json';
import { base58 } from './utils';
import bitcoinNetworks from './bitcoinjs-networks';

const keyGen = {};

for (const netId in networkList) {
    if (netId in bitcoinNetworks) {
        keyGen[netId] = (seed, path) => {
            const seedBuffer = Buffer.from(seed, 'hex');
            const masterWallet = bip32.fromSeed(seedBuffer, bitcoinNetworks[netId]);
            const wallet = masterWallet.derivePath(path);
            const rawPublicKey = wallet.publicKey;
            const publicKey = rawPublicKey.toString('hex');
            const privateKey = wallet.toWIF();
            const { address } = bitcoinLib.payments.p2pkh({
                pubkey: rawPublicKey,
                network: bitcoinNetworks[netId]
            });
        
            return { address, publicKey, privateKey };
        };

    } else if (networkList[netId].isEvmCompatible) {
        keyGen[netId] = (seed, path) => {
            const seedBuffer = Buffer.from(seed, 'hex');
            const masterWallet = EthereumHDKey.fromMasterSeed(seedBuffer);
            const wallet = masterWallet.derivePath(path).getWallet();
            const address = wallet.getAddressString();
            const publicKey = wallet.getPublicKeyString();
            const privateKey = wallet.getPrivateKeyString();
        
            return { address, publicKey, privateKey };
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
        keyGen[netId] = (seed, path) => {
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

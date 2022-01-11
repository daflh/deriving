import bs58 from 'bs58';
import * as bip32 from 'bip32';
import * as edHd from 'ed25519-hd-key';
import * as bitcoinLib from 'bitcoinjs-lib';
import { hdkey as ethereumHDKey } from 'ethereumjs-wallet';
import nacl from 'tweetnacl';
import bitcoinNetworks from './bitcoinjs-networks';
import networkList from '../network-list.json';

const keyGen = {};

for (const net in networkList) {
    if (net in bitcoinNetworks) {
        keyGen[net] = (seed, path) => {
            const seedBuffer = Buffer.from(seed, 'hex');
            const masterWallet = bip32.fromSeed(seedBuffer, bitcoinNetworks[net]);
            const wallet = masterWallet.derivePath(path);
            const publicKey = wallet.publicKey;
            const { address } = bitcoinLib.payments.p2pkh({ pubkey: publicKey, network: bitcoinNetworks[net] });
        
            return { address, publicKey: publicKey.toString('hex'), privateKey: wallet.toWIF() };
        };

    } else if (networkList[net].isEvmCompatible) {
        keyGen[net] = (seed, path) => {
            const seedBuffer = Buffer.from(seed, 'hex');
            const masterWallet = ethereumHDKey.fromMasterSeed(seedBuffer);
            const wallet = masterWallet.derivePath(path).getWallet();
            const address = wallet.getAddressString();
            const publicKey = wallet.getPublicKeyString();
            const privateKey = wallet.getPrivateKeyString();
        
            return { address, publicKey, privateKey };
        };

    } else if (net === 'solana') {
        keyGen[net] = (seed, path) => {
            const keyDerived = edHd.derivePath(path, seed).key;
            const keypair = nacl.sign.keyPair.fromSeed(keyDerived);
            const publicKey = bs58.encode(keypair.publicKey);
            const privateKey = bs58.encode(keypair.secretKey);
        
            return { address: publicKey, publicKey, privateKey };
        };

    }
}

export default keyGen;

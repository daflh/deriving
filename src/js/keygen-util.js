import bs58 from 'bs58';

const keyGen = {};

import * as bip32 from 'bip32';
import * as bitcoinLib from 'bitcoinjs-lib';

keyGen.bitcoin = (seed, path) => {
    const seedBuffer = Buffer.from(seed, 'hex');
    const masterWallet = bip32.fromSeed(seedBuffer, bitcoinLib.networks.bitcoin);
    const wallet = masterWallet.derivePath(path);
    const publicKey = wallet.publicKey;
    const { address } = bitcoinLib.payments.p2pkh({ pubkey: publicKey });

    return { address, publicKey: publicKey.toString('hex'), privateKey: wallet.toWIF() };
};

import { hdkey } from 'ethereumjs-wallet';

keyGen.ethereum = (seed, path) => {
    const seedBuffer = Buffer.from(seed, 'hex');
    const masterWallet = hdkey.fromMasterSeed(seedBuffer);
    const wallet = masterWallet.derivePath(path).getWallet();
    const address = wallet.getAddressString();
    const publicKey = wallet.getPublicKeyString();
    const privateKey = wallet.getPrivateKeyString();

    return { address, publicKey, privateKey };
};

import nacl from 'tweetnacl';
import * as edHd from 'ed25519-hd-key';

keyGen.solana = (seed, path) => {
    const keyDerived = edHd.derivePath(path, seed).key;
    const keypair = nacl.sign.keyPair.fromSeed(keyDerived);
    const publicKey = bs58.encode(keypair.publicKey);
    const privateKey = bs58.encode(keypair.secretKey);

    return { address: publicKey, publicKey, privateKey };
};

export default keyGen;

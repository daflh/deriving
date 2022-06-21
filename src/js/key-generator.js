import { bech32 } from 'bech32';
import { keccak_256 } from 'js-sha3';
import * as secp from 'secp256k1';
import * as edHd from 'ed25519-hd-key';
import nacl from 'tweetnacl';
import * as bip32 from 'bip32';
import * as bitcoinLib from 'bitcoinjs-lib';
import networkList from '../network-list.json';
import {
	base58,
  net as netUtils
} from './utils';

function keyGenerator(netId, seedValue, dPath) {
  const network = networkList[netId];
  const seedBuffer = Buffer.from(seedValue, 'hex');
  let privateKey, publicKey, address;

  if (network.curve === 'secp256k1') {
    const prefixes = Object.assign({}, bitcoinLib.networks.bitcoin);
    if (network.hasOwnProperty('p2pkhPrefix'))
      prefixes.pubKeyHash = network.p2pkhPrefix;
    if (network.hasOwnProperty('p2shPrefix'))
      prefixes.scriptHash = network.p2shPrefix;
    if (network.hasOwnProperty('wifPrefix'))
      prefixes.wif = network.wifPrefix;
    const masterWallet = bip32.fromSeed(seedBuffer, prefixes);
    const wallet = masterWallet.derivePath(dPath);

    if (netId === 'bitcoin' || network.useBitcoinKeyScheme) {
      const publicKeyBuffer = wallet.publicKey;
      
      privateKey = wallet.toWIF();
      publicKey = publicKeyBuffer.toString('hex');
      address = bitcoinLib.payments.p2pkh({
        pubkey: publicKeyBuffer,
        network: prefixes
      }).address;

      if (netId === 'ripple') {
        privateKey = netUtils.ripple.convertPrivateKey(privateKey);
        address = netUtils.ripple.convertAddress(address);

      } else if (netId === 'eos') {
        privateKey = netUtils.eos.bufferToPrivateKey(wallet.privateKey);
        publicKey = netUtils.eos.bufferToPublicKey(publicKeyBuffer);
        address = '';

      } else if (netId === 'filecoin') {
        const pubKey = secp.publicKeyCreate(wallet.privateKey);
        let uncompressedPublicKey = new Uint8Array(65);
        secp.publicKeyConvert(pubKey, false, uncompressedPublicKey);
        uncompressedPublicKey = Buffer.from(uncompressedPublicKey);

        privateKey = wallet.privateKey.toString("hex");
        publicKey = uncompressedPublicKey.toString('hex');
        address = netUtils.filecoin.publicKeyToAddress(uncompressedPublicKey);

      } else if (netId === 'cosmos') {
        privateKey = wallet.privateKey.toString('base64');
        publicKey = netUtils.cosmos.bufferToPublicKey(publicKeyBuffer, 'cosmos');
        address = netUtils.cosmos.bufferToAddress(publicKeyBuffer, 'cosmos');

      } else if (netId === 'thorChain') {
        privateKey = wallet.privateKey.toString("hex");
        publicKey = publicKeyBuffer.toString("hex");
				address = netUtils.cosmos.bufferToAddress(publicKeyBuffer, 'thor');

			} else if (netId === 'terra') {
        privateKey = wallet.privateKey.toString("hex");
        publicKey = publicKeyBuffer.toString("hex");
				address = netUtils.cosmos.bufferToAddress(publicKeyBuffer, 'terra');

      } else if (netId === 'binanceChain') {
        privateKey = wallet.privateKey.toString("hex");
        publicKey = netUtils.cosmos.bufferToPublicKey(publicKeyBuffer, 'bnb');
				address = netUtils.cosmos.bufferToAddress(publicKeyBuffer, 'bnb');
        
      } else if (netId === 'cryptoOrgChain') {
        privateKey = wallet.privateKey.toString("hex");
        publicKey = publicKeyBuffer.toString("hex");
				address = netUtils.cosmos.bufferToAddress(publicKeyBuffer, 'cro');
			}

    } else if (netId === 'ethereum' || network.isEvmCompatible) {
      const pubKeyBuffer = Buffer.from(secp.publicKeyCreate(wallet.privateKey, false)).slice(1);
      const pubKeyCompressedBuffer = Buffer.from(secp.publicKeyCreate(wallet.privateKey, true));
			const addressBuffer = Buffer.from(keccak_256(pubKeyBuffer), 'hex').slice(-20);
      
      privateKey = wallet.privateKey.toString('hex');
      publicKey = pubKeyBuffer.toString('hex');
			address = netUtils.ethereum.toChecksumAddress(addressBuffer.toString('hex'));

      if (netId === 'tron') {
        address = bitcoinLib.address.toBase58Check(addressBuffer, 0x41);
      } else if (netId === 'harmony') {
        privateKey = '0x' + privateKey;
        publicKey = '0x' + pubKeyCompressedBuffer.toString('hex');
        address = netUtils.harmony.convertAddress(address);
      }

    } else {
      throw new Error(`Unknown network: ${netId}`);
    }

  } else if (network.curve === 'ed25519') {
    const derivedKeys = edHd.derivePath(dPath, seedValue);
    const privateKeyBuffer = derivedKeys.key;

    if (netId === 'elrond') {
      const publicKeyBuffer = edHd.getPublicKey(privateKeyBuffer, false);
  
      privateKey = privateKeyBuffer.toString('hex');
      publicKey = publicKeyBuffer.toString('hex');
      address = bech32.encode('erd', bech32.toWords(publicKeyBuffer));
  
    } else if (netId === 'solana') {
      const signedKeyPair = nacl.sign.keyPair.fromSeed(privateKeyBuffer);
  
      privateKey = base58.encode(signedKeyPair.secretKey);
      publicKey = address = base58.encode(signedKeyPair.publicKey);
  
    } else if (netId === 'stellar') {
      const rawPublicKey = nacl.sign.keyPair.fromSeed(privateKeyBuffer).publicKey;
      
      privateKey = netUtils.stellar.encodeCheck('ed25519SecretSeed', privateKeyBuffer);
      publicKey = address = netUtils.stellar.encodeCheck('ed25519PublicKey', rawPublicKey);

    } else {
      throw new Error(`Unknown network: ${netId}`);
    }

  } else {
    throw new Error(`Unknown network: ${netId}`);
  }

  return { privateKey, publicKey, address };
}

export default keyGenerator;

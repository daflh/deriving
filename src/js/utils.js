import basex from 'base-x';
import base32 from 'base32.js';
import { bech32 } from 'bech32';
import createHash from 'create-hash';
import { keccak_256 } from 'js-sha3';
import blake from 'blakejs';
import crc from 'crc';

export const base58 = basex('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz');

export const ethereumUtils = {
    toChecksumAddress(address) {
        const checksumHash = keccak_256(address).toString('hex');
        let checksumAddress = '0x';

        for (let i = 0; i < address.length; i++) {
            if (parseInt(checksumHash[i], 16) >= 8) {
                checksumAddress += address[i].toUpperCase();
            } else {
                checksumAddress += address[i];
            }
        }

        return checksumAddress;
    }
};

export const rippleUtils = {
    convertPrivateKey(prvKey) {
        return basex('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz')
               .decode(prvKey).toString('hex').slice(2,66);
    },
    convertAddress(address) {
        return basex('rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz').encode(
           basex('123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz').decode(address)
        );
    }
};

export const stellarUtils = {
    encodeCheck(versionByteName, data) {
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
}

export const cosmosUtils = {
    bufferToPublicKey(pubBuf, hrp = 'cosmos') {
        const AminoSecp256k1PubkeyPrefix = Buffer.from('EB5AE987', 'hex');
        const AminoSecp256k1PubkeyLength = Buffer.from('21', 'hex');
        pubBuf = Buffer.concat([AminoSecp256k1PubkeyPrefix, AminoSecp256k1PubkeyLength, pubBuf]);

        return bech32.encode(`${hrp}pub`, bech32.toWords(pubBuf));
    },
    bufferToAddress(pubBuf, hrp = 'cosmos') {
        const sha256_ed = createHash('sha256').update(pubBuf).digest();
        const ripemd160_ed = createHash('rmd160').update(sha256_ed).digest();

        return bech32.encode(hrp, bech32.toWords(ripemd160_ed));
    }
};

export const eosUtils = {
    bufferToPublicKey(pubBuf) {
        const EOS_PUBLIC_PREFIX = 'EOS';
        const checksum = createHash('rmd160').update(pubBuf).digest('hex').slice(0, 8);
        pubBuf = Buffer.concat([pubBuf, Buffer.from(checksum, 'hex')]);

        return EOS_PUBLIC_PREFIX + base58.encode(pubBuf);
    },
    bufferToPrivateKey(privBuf) {
        const EOS_PRIVATE_PREFIX = '80';
        privBuf = Buffer.concat([Buffer.from(EOS_PRIVATE_PREFIX, 'hex'), privBuf]);
        let checksum = createHash('sha256').update(privBuf).digest();
        checksum = createHash('sha256').update(checksum).digest('hex').slice(0, 8);
        privBuf = Buffer.concat([privBuf, Buffer.from(checksum, 'hex')]);

        return base58.encode(privBuf);
    }
};

export const filecoinUtils = {
    publicKeyToAddress(publicKey) {
        function getPayload(publicKey) {
            const blakeCtx = blake.blake2bInit(20);
            blake.blake2bUpdate(blakeCtx, publicKey);
            return Buffer.from(blake.blake2bFinal(blakeCtx));
        }
            
        function getChecksum(payload) {
            const blakeCtx = blake.blake2bInit(4);
            blake.blake2bUpdate(blakeCtx, payload);
            return Buffer.from(blake.blake2bFinal(blakeCtx));
        }
          
        const prefix = 'f1';
        const payload = getPayload(publicKey);
        const checksum = getChecksum(Buffer.concat([Buffer.from('01', 'hex'), payload]));

        return prefix + base32.encode(Buffer.concat([payload, checksum])).toLowerCase();
    }
};

export function findDPathError(path, isUsingEd25519 = false) {
    const maxDepth = 255;
    const maxIndexValue = Math.pow(2, 31);

    if (path[0] != 'm')
        return 'First character must be \'m\'';

    if (path.length > 1) {
        if (path[1] != '/')
            return 'Separator must be \'/\'';

        const indexes = path.split('/');

        if (indexes.length > maxDepth)
            return `Derivation depth is ${indexes.length}, must be less than ${maxDepth}`;

        for (let depth = 1; depth < indexes.length; depth++) {
            const index = indexes[depth];

            if (index === '')
                return `No value at depth ${depth}`;

            const invalidChars = index.replace(/^[0-9]+'?$/g, '');

            if (invalidChars.length > 0)
                return `Invalid characters '${invalidChars}' found at depth ${depth}`;

            const indexValue = parseInt(index.replace('\'', ''));

            if (isNaN(depth))
                return `Invalid number at depth ${depth}`;
            
            if (indexValue > maxIndexValue)
                return `Value of ${indexValue} at depth ${depth} must be less than ${maxIndexValue}`;
        }
    }

    if (isUsingEd25519) {
        const indexes = path.split('/');

        if (indexes.find((v, i) => i > 0 && !v.endsWith('\''))) {
            return 'All params must be hardened';
        }
    }

    return false;
};

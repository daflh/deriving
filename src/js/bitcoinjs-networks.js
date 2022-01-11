import * as bitcoinLib from 'bitcoinjs-lib';

export default {
    bitcoin: bitcoinLib.networks.bitcoin,
    bitcoinCash: bitcoinLib.networks.bitcoin,
    bitcoinGold: {
        messagePrefix: '\x1DBitcoin Gold Signed Message:\n',
        bip32: {
            public: 0x0488b21e,
            private: 0x0488ade4
        },
        pubKeyHash: 0x26,
        scriptHash: 0x17,
        wif: 0x80
    },
    bitcoinSv: {
        messagePrefix: 'unused',
        bip32: {
            public: 0x0488b21e,
            private: 0x0488ade4
        },
        pubKeyHash: 0x00,
        scriptHash: 0x05,
        wif: 0x80
    },
    dash: {
        messagePrefix: 'unused',
        bip32: {
            public: 0x0488b21e,
            private: 0x0488ade4
        },
        pubKeyHash: 0x4c,
        scriptHash: 0x10,
        wif: 0xcc
    },
    dogecoin: {
        messagePrefix: '\x19Dogecoin Signed Message:\n',
        bip32: {
            public: 0x02facafd,
            private: 0x02fac398
        },
        pubKeyHash: 0x1e,
        scriptHash: 0x16,
        wif: 0x9e
    },
    litecoin: {
        messagePrefix: '\x19Litecoin Signed Message:\n',
        bip32: {
            public: 0x0488b21e,
            private: 0x0488ade4
        },
        pubKeyHash: 0x30,
        scriptHash: 0x32,
        wif: 0xb0
    }
};

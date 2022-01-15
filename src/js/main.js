import Alpine from 'alpinejs';
import * as bip39 from 'bip39';
import { toBitpayAddress, toCashAddress } from 'bchaddrjs';
import networkList from '../network-list.json';
import keyGen from './key-generator';
import { findDPathError } from './utils';

const mainData = {
    mnemonicValue: '',
    generateMnemonic() {
        this.mnemonicValue = bip39.generateMnemonic();
    },
    isMnemonicValid() {
        return bip39.validateMnemonic(this.mnemonicValue);
    },
    get seedValue() {
        return this.isMnemonicValid() ? bip39.mnemonicToSeedSync(this.mnemonicValue).toString('hex') : '';
    },
    networkSelected: 'bitcoin',
    dPathSelected: 'default',
    dPathValue: '',
    isDPathValid() {
        return !findDPathError(this.dPathValue, networkList[this.networkSelected].curve === 'ed25519');
    },
    calculateDPath() {
        this.dPathValue = networkList[this.networkSelected].derivationPaths[this.dPathSelected];
    },
    keyPair: {
        address: '',
        publicKey: '',
        privateKey: ''
    },
    calculateKeyPair() {
        if (this.isMnemonicValid() && this.isDPathValid()) {
            const {
                address,
                publicKey,
                privateKey
            } = keyGen[this.networkSelected](this.seedValue, this.dPathValue);

            this.keyPair = { address, publicKey, privateKey };
        } else {
            this.keyPair = {
                address: '',
                publicKey: '',
                privateKey: ''
            };
        }
    },
    isError: false,
    errorText: ''
};

mainData.init = function () {
    this.$watch('mnemonicValue', () => {
        this.calculateKeyPair();

        if (this.mnemonicValue !== '' && !this.isMnemonicValid()) {
            this.isError = true;
            this.errorText = 'Invalid mnemonic phrase';
        } else {
            this.isError = false;
        }
    });

    this.$watch('networkSelected', () => {
        if (this.dPathSelected === 'default') {
            this.calculateDPath();
        } else if (this.dPathSelected === 'custom') {
            this.calculateKeyPair();
        } else {
            // no need to call 'calculateDPath()' here, 'dPathSelected' watcher will call it anyway
            this.dPathSelected = 'default';
        }
    });

    this.$watch('dPathSelected', () => {
        if (this.dPathSelected !== 'custom')
            this.calculateDPath();
    });

    this.$watch('dPathValue', () => {
        this.calculateKeyPair();

        if (!this.isDPathValid()) {
            const error = findDPathError(this.dPathValue, networkList[this.networkSelected].curve === 'ed25519');

            this.isError = true;
            this.errorText = 'Derivation path error: ' + error;
        } else {
            this.isError = false;
        }
    });

    // this will trigger 'dPathValue' to change which then it will call 'calculateKeyPair()' right away
    this.calculateDPath();
};

mainData.bchUtils = {
    toBitpayAddress(addr) {
        return mainData.networkSelected === 'bitcoinCash' && addr  !== '' ? toBitpayAddress(addr) : '';
    },
    toCashAddress(addr) {
        return mainData.networkSelected === 'bitcoinCash' && addr !== '' ? toCashAddress(addr) : '';
    }
};

document.addEventListener('alpine:init', () => {
    Alpine.data('main', () => mainData);
});

Alpine.store('networkList', networkList);
Alpine.start();

window.Alpine = Alpine;

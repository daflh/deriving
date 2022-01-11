import Alpine from 'alpinejs';
import * as bip39 from 'bip39';
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
        return !findDPathError(this.dPathValue, !!networkList[this.networkSelected].hardenedDerivationOnly);
    },
    dPathEvaluate() {
        this.dPathValue = networkList[this.networkSelected].derivationPaths[this.dPathSelected];
    },
    get resultKeyPair() {
        if (this.isMnemonicValid() && this.networkSelected && this.isDPathValid()) {
            const {
                address, 
                publicKey, 
                privateKey
             } = keyGen[this.networkSelected](this.seedValue, this.dPathValue);

            return { address, publicKey, privateKey };
        } else {
            return { address: '', publicKey: '', privateKey: '' };
        }
    },
    isError: false,
    errorText: ''
};

mainData.init = function () {
    this.dPathEvaluate();

    this.$watch('mnemonicValue', () => {
        if (this.mnemonicValue !== '' && !this.isMnemonicValid()) {
            this.isError = true;
            this.errorText = 'Invalid mnemonic phrase';
        } else {
            this.isError = false;
        }
    });

    this.$watch('networkSelected', () => {
        this.dPathSelected = 'default';
        this.dPathEvaluate();
    });

    this.$watch('dPathSelected', () => {
        if (this.dPathSelected !== 'custom')
            this.dPathEvaluate();
    });

    this.$watch('dPathValue', () => {
        if (!this.isDPathValid()) {
            const error = findDPathError(this.dPathValue, !!networkList[this.networkSelected].hardenedDerivationOnly);

            this.isError = true;
            this.errorText = 'Derivation path error: ' + error;
        } else {
            this.isError = false;
        }
    });
};

document.addEventListener('alpine:init', () => {
    Alpine.data('main', () => mainData);
});

Alpine.store('networkList', networkList);
Alpine.start();

window.Alpine = Alpine;

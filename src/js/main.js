import Alpine from 'alpinejs';
import * as bip39 from 'bip39';
import coinList from '../coin-list.json';
import { keyGen, findDPathError } from './utils';

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
    coinSelected: 'bitcoin',
    dPathSelected: 'default',
    dPathValue: '',
    isDPathValid() {
        return !findDPathError(this.dPathValue, !!coinList[this.coinSelected].hardenedDerivationOnly);
    },
    dPathEvaluate() {
        this.dPathValue = coinList[this.coinSelected].derivationPaths[this.dPathSelected];
    },
    get resultKeyPair() {
        if (this.isMnemonicValid() && this.coinSelected && this.isDPathValid()) {
            const {
                address, 
                publicKey, 
                privateKey
             } = keyGen[this.coinSelected](this.seedValue, this.dPathValue);

            return { address, publicKey, privateKey };
        } else {
            return { address: '', publicKey: '', privateKey: '' };
        }
    },
    isError: false,
    errorText: ''
};

mainData.initialize = function ({ $watch }) {
    this.dPathEvaluate();

    $watch('mnemonicValue', () => {
        if (this.mnemonicValue !== '' && !this.isMnemonicValid()) {
            this.isError = true;
            this.errorText = 'Invalid mnemonic phrase';
        } else {
            this.isError = false;
        }
    });

    $watch('coinSelected', () => {
        this.dPathSelected = 'default';
        this.dPathEvaluate();
    });

    $watch('dPathSelected', () => {
        if (this.dPathSelected !== 'custom')
            this.dPathEvaluate();
    });

    $watch('dPathValue', () => {
        if (!this.isDPathValid()) {
            const error = findDPathError(this.dPathValue, !!coinList[this.coinSelected].hardenedDerivationOnly);

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

Alpine.store('coinList', coinList);
Alpine.start();

window.Alpine = Alpine;

const { bsv, buildContractClass, getPreimage, toHex, SigHashPreimage, PubKey, Sig, signTx } = require('scryptlib');
const { loadDesc, showError, deployContract , sendTx } = require('../helper');
const { privateKey } = require('../privateKey');

const privKey = privateKey;
const pubKey = new bsv.PublicKey.fromPrivateKey(privKey);
let updatedTax = 40;
const gainstax_rate = 30;

(async () => {
    try {
        const amount = 2000;
        const TaxUtxo = buildContractClass(loadDesc('tax_utxo_debug_desc.json'));
        const taxUtxo = new TaxUtxo(gainstax_rate, new PubKey(toHex(pubKey)));
        // lock fund to the script
        const lockingTx = await deployContract(taxUtxo, amount)
        console.log('funding txid:      ', taxUtxo.id);

        let prevTx = lockingTx;

        for (i = 0; i < 3; i++) {
        const newLockingScript = taxUtxo.getNewStateScript({
            gainstax_rate : updatedTax
        })

        const unlockingTx = new bsv.Transaction();
        
        unlockingTx.addInputFromPrevTx(prevTx)
        .setOutput(0, (tx) => {
            return new bsv.Transaction.Output({
                script: newLockingScript,
                satoshis: amount - tx.getEstimateFee(),
              })
        })
        .setInputScript(0, (tx, output) => {
            const sig = signTx(tx, privKey, output.script, output.satoshis);
            return taxUtxo.update_gainstax(updatedTax, new Sig(toHex(sig)), new SigHashPreimage(tx.getPreimage(0))).toScript()
        })
        .seal()

        await sendTx(unlockingTx)
        console.log('unlocking txid: ', unlockingTx.id);
        prevTx = unlockingTx;

        updatedTax += 10;
    }
        
    } catch (error) {
        console.log('Failed on testnet')
        showError(error)
    }
})()
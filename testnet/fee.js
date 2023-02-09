const { bsv, buildContractClass, getPreimage, toHex, SigHashPreimage, PubKey, Sig, signTx } = require('scryptlib');
const { loadDesc, showError, deployContract , sendTx } = require('../helper');
const { privateKey } = require('../privateKey');

const privKey = privateKey;
const pubKey = new bsv.PublicKey.fromPrivateKey(privKey);
const calculatedFee = 40;
const mature_time = 0;
let mature_tim = 10000;
let estimatedFee = 50;
let lockTime = 0;

(async () => {
    try {
        const amount = 2000;
        const Fee = buildContractClass(loadDesc('fee_debug_desc.json'));
        const fee = new Fee(new PubKey(toHex(pubKey)), calculatedFee, mature_time);
        // lock fund to the script
        const lockingTx = await deployContract(fee, amount)
        console.log('funding txid:      ', lockingTx.id);

        let prevTx = lockingTx;
        for (i = 0; i < 3; i++) {
        const newLockingScript = fee.getNewStateScript({
            fee : estimatedFee,
            mature_time : mature_tim
        })

        const unlockingTx = new bsv.Transaction();
        
        unlockingTx.addInputFromPrevTx(prevTx)
        .setOutput(0, (tx) => {
            return new bsv.Transaction.Output({
                script: newLockingScript,
                satoshis: amount - tx.getEstimateFee(),
              })
        })
        .setLockTime(lockTime)
        .setInputScript(0, (tx, output) => {
            const sig = signTx(tx, privKey, output.script, output.satoshis);
            return fee.update_fee(estimatedFee, new Sig(toHex(sig)), new PubKey(toHex(pubKey)), new SigHashPreimage(tx.getPreimage(0))).toScript()
        })
        .seal()

        await sendTx(unlockingTx)
        console.log('unlocking txid: ', unlockingTx.id)

        mature_tim += 10000;
        lockTime += 10000;
        estimatedFee += 10;

        prevTx = unlockingTx;
    }

        
    } catch (error) {
        console.log('Failed on testnet')
        showError(error)
    }
})()
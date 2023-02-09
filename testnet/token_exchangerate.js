const { bsv, buildContractClass, getPreimage, toHex, SigHashPreimage, PubKey, Sig, signTx } = require('scryptlib');
const { loadDesc, showError, deployContract , sendTx } = require('../helper');
const { privateKey } = require('../privateKey');

const privKey = privateKey;
const pubKey = new bsv.PublicKey.fromPrivateKey(privKey);
const token_value = 40;
const mature_time = 0;
let mature_tim = 400;
let value = 50;
let lockTime = 0;

(async () => {
    try {
        const amount = 2000;
        const TokenExchangeRate = buildContractClass(loadDesc('token_exchangerate_debug_desc.json'));
        const tokenExchangeRate = new TokenExchangeRate(token_value, mature_time);
        // lock fund to the script
        const lockingTx = await deployContract(tokenExchangeRate, amount)
        console.log('funding txid:      ', lockingTx.id);

        let prevTx = lockingTx;
        for (i = 0; i < 3; i++) {
        const newLockingScript = tokenExchangeRate.getNewStateScript({
            token_value : value,
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
            return tokenExchangeRate.update_oracle(value, new Sig(toHex(sig)), new PubKey(toHex(pubKey)), new SigHashPreimage(tx.getPreimage(0))).toScript()
        })
        .seal()

        await sendTx(unlockingTx)
        console.log('unlocking txid: ', unlockingTx.id)

        mature_tim += 400;
        value += 10;
        lockTime += 400;

        prevTx = unlockingTx;
    }
        
    } catch (error) {
        console.log('Failed on testnet')
        showError(error)
    }
})()
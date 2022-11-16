const { BigNumber } = require("ethers");
const { ethers, network } = require("hardhat");

// 把原生代币兑换成wtoken
async function getWToken(_signer, _wtokenContract, _wantWTokenAmount) {
    const balanceToken = await _wtokenContract.balanceOf(_signer.address);
    const TokenDecimals = await _wtokenContract.decimals();
    console.log(`deposit before wavax: ${balanceToken}`);

    // 进行兑换的交易上链操作
    const tx = await _wtokenContract.deposit({
        value: ethers.BigNumber.from(
            `${_wantWTokenAmount * 10 ** TokenDecimals}`
        ),
    });
    await tx.wait();

    const balanceWTokenDeposit = await _wtokenContract.balanceOf(
        _signer.address
    );
    console.log(`deposit after  wavax: ${balanceWTokenDeposit}\n`);
}

async function swapExactTokensForTokens(
    _signer, // 签名者实例
    _router,
    _fromContract, // 路径开始的token实例
    _toContract, // 路径结束的token实例
    _amountIn, // 想要的token的outPut数量 uint, 这里输入的不是最小单位1 ，而是最大单位1， 如 1 ether， 1mim, 而不是 1wei等
    _slipPoint, // 设置的滑点 uint
    _swapPath // 兑换路径 [address0, address1, .....]
) {
    const fromBalance = await _fromContract.balanceOf(_signer.address),
        toBalance = await _toContract.balanceOf(_signer.address);

    const fromDecimals = await _fromContract.decimals(),
        toDecimals = await _toContract.decimals();

    console.log(
        `swap before ${await _fromContract.symbol()} : ${
            fromBalance / 10 ** fromDecimals
        }\nswap befor ${await _toContract.symbol()}: ${
            toBalance / 10 ** toDecimals
        }`
    );

    // start swap
    let AmountsOut = await _router.getAmountsOut(
        ethers.BigNumber.from(`${_amountIn * 10 ** fromDecimals}`),
        [_fromContract.address, _toContract.address]
    );
    const bigNumMIMAmountOut = ethers.BigNumber.from(AmountsOut[1]);

    // 这里设置了10%的滑点，后期可以根据需求做出滑点的改动
    const bigNumMIMAmountOutAfterSlipPoint = bigNumMIMAmountOut.sub(
        bigNumMIMAmountOut.div(_slipPoint)
    );
    console.log(
        "bigNumMIMAmountOutAfterSlipPoint: " + bigNumMIMAmountOutAfterSlipPoint
    );
    // 设置等待的时间戳
    const waitTimestramp = Date.now() + 1000 * 60 * 10;

    // 兑换前还需要进行授权操作
    const rep = await _fromContract.approve(
        _router.address,
        ethers.BigNumber.from(`${_amountIn * 10 ** fromDecimals + 100000000}`)
    );
    await rep.wait();
    console.log(
        "allowance router amount : " +
            (await _fromContract.allowance(_signer.address, _router.address))
    );

    // 进行兑换
    await _router.swapExactTokensForTokens(
        ethers.BigNumber.from(`${_amountIn * 10 ** fromDecimals}`), // amountIn
        bigNumMIMAmountOutAfterSlipPoint, // minAmountOut
        _swapPath, // swapPath
        _signer.address, // toAddress
        waitTimestramp,
        {
            gasPrice: ethers.utils.parseUnits("100", "gwei"),
            gasLimit: 10000000,
        }
    );

    const afterFromBalance = await _fromContract.balanceOf(_signer.address),
        afterToBalance = await _toContract.balanceOf(_signer.address);

    console.log("=============swap success=============");
    console.log(
        `swap after ${await _fromContract.symbol()} : ${
            afterFromBalance / 10 ** fromDecimals
        }\nswap after ${await _toContract.symbol()}: ${
            afterToBalance / 10 ** toDecimals
        }\n`
    );
}

module.exports = {
    getWToken,
    swapExactTokensForTokens,
};

const { BigNumber } = require("ethers");
const { ethers, network } = require("hardhat");
const { getWToken, swapExactTokensForTokens } = require("./swap");
const { isConstructorDeclaration } = require("typescript");
// 一会要用到的稳定币的列表
const TOKEN_ADDRESSES = {
    dai: "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
    mim: "0x130966628846bfd36ff31a822705796e8cb8c18d",
    wavax: "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
};

const ROUTRE_ADDRESS = "0x60aE616a2155Ee3d9A68541Ba4544862310933d4";
const wavaxContractAddress = "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7";
const mimContractAddress = "0x130966628846bfd36ff31a822705796e8cb8c18d";
const daiContractAddress = "0xd586e7f844cea2f87f50152665bcbc2c279d8d70";

// 每次查询都需要让他sleep一下，再去查询机会
async function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

// 利用mim换成dai，期待有1 %的利润，同时加入一些滑点的因素
async function main() {
    const Router = await ethers.getContractFactory("JoeRouter02");
    const router = await Router.attach(ROUTRE_ADDRESS);

    const signer = await ethers.getSigner();
    const signerAddress = await signer.getAddress();

    console.log("signerAddress-------: " + signerAddress);

    // ==================== 拿到一部分wavax
    const wavaxContract = await ethers.getContractAt(
        "WAVAX",
        wavaxContractAddress
    );
    const mimContract = await ethers.getContractAt("ERC20", mimContractAddress);
    const daiContract = await ethers.getContractAt("ERC20", daiContractAddress);

    // 拿到wtoken
    // async function getWToken(_signer, _wavaxContract, _wantWTokenAmount)
    await getWToken(signer, wavaxContract, 1);

    // =============================================================================

    const swapPath = [wavaxContractAddress, mimContractAddress];

    // 函数会打印出来swap前后余额的变化
    await swapExactTokensForTokens(
        signer, // 签名者实例
        router, // 兑换路由
        wavaxContract, // 路径开始的token实例
        mimContract, // 路径结束的token实例
        1, // 想要的Input数量 uint, 这里输入的不是最小单位1 ，而是最大单位1， 如 1 ether， 1mim, 而不是 1wei等
        10, // 设置的滑点 uint
        swapPath // 兑换路径 [address0, address1, .....]
    );
    let lastProfitability = 0;
    while (true) {
        let amountsOut;
        await sleep(1000);
        try {
            const amountInDecimals = await mimContract.decimals();
            const mimBalance = await mimContract.balanceOf(signerAddress);
            amountsOut = await router.getAmountsOut(
                ethers.BigNumber.from(`${10 * 10 ** amountInDecimals}`),
                [mimContractAddress, wavaxContractAddress, daiContractAddress]
            );
        } catch (error) {
            continue;
        }

        // 我们这里需要加入滑点的计算
        const amountOutDecimals = await daiContract.decimals();

        let profitability = amountsOut[2] / (10 * 10 ** amountOutDecimals);
        if (profitability.toFixed(3) != lastProfitability.toFixed(3)) {
            console.log(new Date() + "profitability : " + profitability);
        }
        lastProfitability = profitability;

        // 在兑换过程中至少有1%的盈利,
        if (profitability >= 1.01) {
            console.log("*** excuting swap ***");
            try {
                await swapExactTokensForTokens(
                    signer, // 签名者实例
                    router, // 兑换路由
                    mimContract, // 路径开始的token实例
                    daiContract, // 路径结束的token实例
                    1, // 想要的Input数量 uint, 这里输入的不是最小单位1 ，而是最大单位1， 如 1 ether， 1mim, 而不是 1wei等
                    10, // 设置的滑点 uint
                    [
                        mimContractAddress,
                        wavaxContractAddress,
                        daiContractAddress,
                    ] // 兑换路径 [address0, address1, .....]
                );
                console.log(
                    `${tokenIn.symbol} -> ${
                        tokenOut.symbol
                    } ${profitability.toFixed(3)}`
                );
            } catch (error) {
                print("Swap failed, better luck next time!");
            } finally {
                break;
            }
        }

        // 每查询一次，睡100ms
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

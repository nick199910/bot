const { BigNumber } = require("ethers");
const { ethers, network } = require("hardhat");
const { isConstructorDeclaration } = require("typescript");
// 一会要用到的稳定币的列表
const TOKEN_ADDRESSES = {
    dai: "0xd586e7f844cea2f87f50152665bcbc2c279d8d70",
    mim: "0x130966628846bfd36ff31a822705796e8cb8c18d",
    usdc: "0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664",
    usdt: "0xc7198437980c041c805a1edcba50c1ce5db95118",
    wavax: "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
};

const ROUTRE_ADDRESS = "0x60aE616a2155Ee3d9A68541Ba4544862310933d4";
const WETH_ADDRESS = "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB";
// 每次查询都需要让他sleep一下，再去查询机会
function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function main() {
    const Router = await ethers.getContractFactory("JoeRouter02");
    const router = await Router.attach(ROUTRE_ADDRESS);

    const tokens = [];

    // 为每个token构建具体的数据结构的实例
    for (const [name, address] of Object.entries(TOKEN_ADDRESSES)) {
        if (name !== "wavax") {
            const contract = await ethers.getContractAt(
                "contracts/ERC20.sol:ERC20",
                address
            ); // 拿到该地址下合约的实例
            tokens.push({
                name,
                contract,
                address,
                symbol: await contract.symbol(),
                decimals: await contract.decimals(),
            });
        }
    }

    // 为这些token去组建pair对
    // 这样组建出的pair对存在自己到自己的一个路径, 但是不影响后面的计算
    const pairs = [];
    tokens.forEach((tokenIn) => {
        tokens.forEach((tokenOut) => {
            pairs.push([tokenIn, tokenOut]);
        });
    });

    const signer = await ethers.getSigner();

    console.log("======" + signer.address);
    const signerAddress = await signer.getAddress();
    const signerBalance = await signer.getBalance();

    // 获取一下账户里面AVAX的余额
    // 先拿到siger的地址

    console.log(signerAddress);
    wavaxContractAddress = "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7";
    const wavaxContract = await ethers.getContractAt(
        "WAVAX",
        wavaxContractAddress
    );
    const avaxBalance = await wavaxContract.balanceOf(signerAddress);
    console.log("1. 读取avax余额 " + avaxBalance);

    console.log("2. 调用desposit()函数，存入 100 avax");
    // 发起交易
    let avaxDecimals = await wavaxContract.decimals();
    let inValue = 1 * 10 ** avaxDecimals;
    console.log("----------inValue: " + inValue);
    const tx = await wavaxContract.deposit({
        value: `${inValue}`,
    });
    // 等待交易上链
    await tx.wait();
    const balanceWAVAX_deposit = await wavaxContract.balanceOf(signerAddress);
    console.log(`存款后 wavax 持仓: ${balanceWAVAX_deposit}\n`);

    // 这里使用的getAmountsOut的函数签名
    // 给定一个输入资产数量和一个代币地址数组， 通过依次为路径中的每对代币地址调用 getReserves 并使用它们调用getAmountOut来计算所有后续的最大输出代币数量。
    // function getAmountsOut(uint amountIn, address[] memory path) internal view returns (uint[] memory amounts);

    while (true) {
        for (const [tokenIn, tokenOut] of pairs) {
            // 单位这里还是有一些问题的
            const amountOut = await router.getAmountsOut(
                `${1 * 10 ** tokenIn.decimals}`,
                [tokenIn.address, TOKEN_ADDRESSES.wavax, tokenOut.address]
            );

            const profitability = amountOut[2] / 10 ** tokenOut.decimals;
            console.log("current == :" + profitability);
            // 在兑换过程中至少有1%的盈利,
            if (profitability >= 1.01) {
                console.log(
                    `${tokenIn.symbol} -> ${
                        tokenOut.symbol
                    } ${profitability.toFixed(3)}`
                );
            }

            // 每查询一次，睡100ms
            sleep(100);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

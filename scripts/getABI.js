const { ethers, network } = require("hardhat");
const axios = require("axios");

// 根据区块链浏览器拿到已经验证的合约的abi

Etherscan =
    "https://api.etherscan.io/api?module={}&action={}&address={}&apikey={}";

const myContractAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
async function main() {
    await axios
        .post(Etherscan, {
            module: "contract",
            action: "getabi",
            address: myContractAddress,
            apikey: "8Q48P8779MP7MZIN5NUGYHIQRBPYVHZUT9",
        })
        .then((res) => {
            console.log(res.data);
        })
        .catch((error) => {
            console.error(error);
        });
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

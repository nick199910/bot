// const { ethers } = require("ethers");
const { ethers, network } = require("hardhat");
const { fstat } = require("fs");
const { sign } = require("crypto");

const SpellContractAddress = "0x090185f2135308bad17527004364ebcc2d37e5f6";
const SSpellContractAddres = "0x26FA3fFFB6EfE8c1E69103aCb4044C26B9A106a9";

const FILENAME = ".abraRate";

/**
 * 更新sspell-spell的机器人的维护挑战之一是跟踪基准质押率， 它只显示在abracadabra的质押页面上， 无法通过javascript加载该值
 * 所以就需要找到合约发出的mint事件去监听去查看其内部实现:
 * 该函数接受amountSPELL令牌， 执行计算以确定sspell的数量， 然后把这些数量发送给调用该函数的用户(msg.sender);
 * function mint(uint256 amount) public returns (bool) {
 *     require(msg.sender != address(0), "Zero address");
 *
 *     User memory user = users[msg.sender];
 *
 *     uint256 totalToken = token.balanceOf(address(this)); // (token是对spell合约实例)
 * 
 *     // 可以得到核心公式
 *     // ============ amount(spell) / shares(sspell) = totalSupply / totalTokens ============== (totalSupply()是一个公开可读的视图函数)
 *     uint256 shares = totalSupply == 0 ? amount : (amount * totalSupply) / totalTokens;
 * 
 *     user.balance += shares.to128();
 *     user.lockedUntil = (block.timestamp + LOCK_TIME).to128();
 *     users[msg.sender] = user;
 *     totalSupply += shares;

 *     token.safeTransferFrom(msg.sender, address(this), amount);
 *     emit Transfer(address(0), msg.sender, shares);
 *     return true;
 * }
 *
 */

async function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function main() {
    const signer = await ethers.getSigner();
    console.log("signer: " + signer.address);

    const spellContract = await ethers.getContractAt(
        "contracts/SPELL.sol:Spell",
        SpellContractAddress,
        signer
    );

    const sspellContract = await ethers.getContractAt(
        "contracts/SSPELL.sol:sSpellV1",
        SSpellContractAddres,
        signer
    );

    while (1) {
        result =
            (await spellContract.balanceOf(sspellContract.address)) /
            (await sspellContract.totalSupply());
        console.log(result.toFixed(5));
        await sleep(500);
    }

    异步打开文件;
    console.log("准备打开文件！");
    fs.writeFile("./abraRate.txt", "0.0", function (err) {
        if (err) {
            throw err;
        }

        // 写入成功后读取测试
        fs.readFile("./abraRate.txt", "utf-8", function (err, data) {
            if (err) {
                throw err;
            }
            console.log(data);
        });
    });
}

main();

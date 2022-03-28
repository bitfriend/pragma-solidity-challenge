import { expect } from "chai";
import hre from "hardhat";
import { BigNumber, Contract, utils } from "ethers";

describe("Greeter", function () {
  it("Should return the new greeting once it's changed", async function () {
    const Greeter = await hre.ethers.getContractFactory("Greeter");
    const greeter = await Greeter.deploy("Hello, world!");
    await greeter.deployed();

    expect(await greeter.greet()).to.be.equal("Hello, world!");

    const setGreetingTx = await greeter.setGreeting("Hola, mundo!");

    // wait until the transaction is mined
    await setGreetingTx.wait();

    expect(await greeter.greet()).to.be.equal("Hola, mundo!");
  });
});

describe("StakingToken", function () {
  let stakingToken: Contract;
  const manyTokens = utils.parseEther("1000");

  beforeEach(async () => {
    const StakingToken = await hre.ethers.getContractFactory("StakingToken");
    const [owner] = await hre.ethers.getSigners();
    stakingToken = await StakingToken.deploy(owner.address, manyTokens.toString());
    await stakingToken.deployed();
  });

  it("createStake requires a StakingToken balance equal or above the stake.", () => new Promise(async (resolve, reject) => {
    const [owner, customer] = await hre.ethers.getSigners();
    await expect(stakingToken.connect(customer).createStake(1)).to.be.reverted;
    resolve(true);
  }));

  it("createStake creates a stake.", () => new Promise(async (resolve, reject) => {
    const [owner, customer] = await hre.ethers.getSigners();
    await stakingToken.transfer(customer.address, 3);
    await stakingToken.connect(customer).createStake(1);

    expect(await stakingToken.balanceOf(customer.address)).to.be.equal(BigNumber.from(2));
    expect(await stakingToken.stakeOf(customer.address)).to.be.equal(BigNumber.from(1));
    expect(await stakingToken.totalSupply()).to.be.equal(manyTokens.sub(1));
    expect(await stakingToken.totalStakes()).to.be.equal(BigNumber.from(1));
    resolve(true);
  }));

  it("createStake adds a stakeholder.", () => new Promise(async (resolve, reject) => {
    const [owner, customer] = await hre.ethers.getSigners();
    await stakingToken.transfer(customer.address, 3);
    await stakingToken.connect(customer).createStake(1);

    expect((await stakingToken.isStakeholder(customer.address))[0]).to.be.true;
    resolve(true);
  }));

  it("removeStake requires a stake equal or above the amount to remove.", () => new Promise(async (resolve, reject) => {
    const [owner, customer] = await hre.ethers.getSigners();
    await expect(stakingToken.connect(customer).removeStake(1)).to.be.reverted;
    resolve(true);
  }));

  it("removeStake removes a stake.", () => new Promise(async (resolve, reject) => {
    const [owner, customer] = await hre.ethers.getSigners();
    await stakingToken.transfer(customer.address, 3);
    await stakingToken.connect(customer).createStake(3);
    await stakingToken.connect(customer).removeStake(1);

    expect(await stakingToken.balanceOf(customer.address)).to.be.equal(BigNumber.from(1));
    expect(await stakingToken.stakeOf(customer.address)).to.be.equal(BigNumber.from(2));
    expect(await stakingToken.totalSupply()).to.be.equal(manyTokens.sub(2));
    expect(await stakingToken.totalStakes()).to.be.equal(BigNumber.from(2));
    resolve(true);
  }));

  it("removeStake removes a stakeholder.", () => new Promise(async (resolve, reject) => {
    const [owner, customer] = await hre.ethers.getSigners();
    await stakingToken.transfer(customer.address, 3);
    await stakingToken.connect(customer).createStake(3);
    await stakingToken.connect(customer).removeStake(3);

    expect((await stakingToken.isStakeholder(customer.address))[0]).to.be.false;
    resolve(true);
  }));

  it("rewards can only be distributed by the contract owner.", () => new Promise(async (resolve, reject) => {
    const [owner, customer] = await hre.ethers.getSigners();
    await expect(stakingToken.connect(customer).distributeRewards()).to.be.reverted;
    resolve(true);
  }));

  it("rewards are distributed.", () => new Promise(async (resolve, reject) => {
    const [owner, customer] = await hre.ethers.getSigners();
    await stakingToken.transfer(customer.address, 100);
    await stakingToken.connect(customer).createStake(100);
    await stakingToken.distributeRewards();

    expect(await stakingToken.rewardOf(customer.address)).to.be.equal(BigNumber.from(1));
    expect(await stakingToken.totalRewards()).to.be.equal(BigNumber.from(1));
    resolve(true);
  }));

  it("rewards can be withdrawn.", () => new Promise(async (resolve, reject) => {
    const [owner, customer] = await hre.ethers.getSigners();
    await stakingToken.transfer(customer.address, 100);
    await stakingToken.connect(customer).createStake(100);
    await stakingToken.distributeRewards();
    await stakingToken.connect(customer).withdrawReward();

    const initialSupply = manyTokens;
    const existingStakes = BigNumber.from(100);
    const mintedAndWithdrawn = BigNumber.from(1);

    expect(await stakingToken.balanceOf(customer.address)).to.be.equal(BigNumber.from(1));
    expect(await stakingToken.stakeOf(customer.address)).to.be.equal(BigNumber.from(100));
    expect(await stakingToken.rewardOf(customer.address)).to.be.equal(BigNumber.from(0));
    expect(await stakingToken.totalSupply()).to.be.equal(initialSupply.sub(existingStakes).add(mintedAndWithdrawn));
    expect(await stakingToken.totalStakes()).to.be.equal(BigNumber.from(100));
    expect(await stakingToken.totalRewards()).to.be.equal(BigNumber.from(0));
    resolve(true);
  }));
});

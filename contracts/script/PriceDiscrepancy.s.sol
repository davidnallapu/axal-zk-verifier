// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/PlonkVerifier.sol";
import "../src/PriceDiscrepancy.sol";

contract PriceDiscrepancyScript is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        PlonkVerifier pv = new PlonkVerifier();
        PriceDiscrepancy pd = new PriceDiscrepancy{value: 0.01 ether}(address(pv));

        vm.stopBroadcast();
    }
}
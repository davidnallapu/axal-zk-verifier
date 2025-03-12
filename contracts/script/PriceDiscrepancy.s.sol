// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/PlonkVerifier.sol";
import "../src/PriceDiscrepancy.sol";
import "../src/PriceDiscrepancyDeployer.sol";

contract PriceDiscrepancyScript is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);
        vm.startBroadcast(deployerPrivateKey);

        // Deploy PlonkVerifier
        PlonkVerifier plonkVerifier = new PlonkVerifier();
        
        // Deploy PriceDiscrepancyDeployer
        PriceDiscrepancyDeployer deployer = new PriceDiscrepancyDeployer();
        
        // Use deployer to deploy implementation and proxy
        // Set the deployer address as admin
        address proxyAddress = deployer.deploy{value: 0.001 ether}(
            address(plonkVerifier),
            deployerAddress
        );
        
        console.log("PlonkVerifier deployed at:", address(plonkVerifier));
        console.log("PriceDiscrepancy proxy deployed at:", proxyAddress);

        vm.stopBroadcast();
    }
}
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./PriceDiscrepancy.sol";
import "./PriceDiscrepancyProxy.sol";

contract PriceDiscrepancyDeployer {
    event Deployed(address implementation, address proxy);
    
    function deploy(address plonkVerifierAddress, address admin) external payable returns (address) {
        // Deploy implementation
        PriceDiscrepancyV1 implementation = new PriceDiscrepancyV1();
        
        // Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            PriceDiscrepancyV1.initialize.selector,
            plonkVerifierAddress
        );
        
        // Deploy proxy with forwarded ETH
        PriceDiscrepancyProxy proxy = new PriceDiscrepancyProxy{value: msg.value}(
            address(implementation),
            admin,
            initData
        );
        
        emit Deployed(address(implementation), address(proxy));
        
        return address(proxy);
    }
} 
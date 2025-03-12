// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

contract PriceDiscrepancyProxy {
    // Storage slot with the address of the current implementation
    bytes32 private constant IMPLEMENTATION_SLOT = bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);
    
    // Storage slot with the admin of the contract
    bytes32 private constant ADMIN_SLOT = bytes32(uint256(keccak256("eip1967.proxy.admin")) - 1);

    // Events
    event Upgraded(address indexed implementation);
    event AdminChanged(address previousAdmin, address newAdmin);

    constructor(address _implementation, address _admin, bytes memory _data) payable {
        _setAdmin(_admin);
        _upgradeTo(_implementation);
        
        // Initialize implementation if data is provided
        if(_data.length > 0) {
            (bool success,) = _implementation.delegatecall(_data);
            require(success, "Initialization failed");
        }
    }

    modifier ifAdmin() {
        if (msg.sender == _getAdmin()) {
            _;
        } else {
            _fallback();
        }
    }

    // Admin functions
    function upgradeTo(address newImplementation) external ifAdmin {
        _upgradeTo(newImplementation);
    }
    
    function changeAdmin(address newAdmin) external ifAdmin {
        require(newAdmin != address(0), "New admin is the zero address");
        address oldAdmin = _getAdmin();
        _setAdmin(newAdmin);
        emit AdminChanged(oldAdmin, newAdmin);
    }
    
    function getImplementation() external ifAdmin returns (address) {
        return _getImplementation();
    }
    
    function getAdmin() external ifAdmin returns (address) {
        return _getAdmin();
    }

    // Internal functions to manage storage slots
    function _setImplementation(address newImplementation) private {
        require(newImplementation.code.length > 0, "Implementation is not a contract");
        StorageSlot.getAddressSlot(IMPLEMENTATION_SLOT).value = newImplementation;
    }
    
    function _getImplementation() private view returns (address) {
        return StorageSlot.getAddressSlot(IMPLEMENTATION_SLOT).value;
    }
    
    function _setAdmin(address newAdmin) private {
        StorageSlot.getAddressSlot(ADMIN_SLOT).value = newAdmin;
    }
    
    function _getAdmin() private view returns (address) {
        return StorageSlot.getAddressSlot(ADMIN_SLOT).value;
    }
    
    function _upgradeTo(address newImplementation) private {
        _setImplementation(newImplementation);
        emit Upgraded(newImplementation);
    }

    // Fallback function that delegates calls to the implementation
    function _fallback() private {
        _delegate(_getImplementation());
    }
    
    fallback() external payable {
        _fallback();
    }
    
    receive() external payable {
        _fallback();
    }
    
    function _delegate(address implementation) private {
        assembly {
            // Copy msg.data. We take full control of memory in this inline assembly
            // block because it will not return to Solidity code. We overwrite the
            // Solidity scratch pad at memory position 0.
            calldatacopy(0, 0, calldatasize())
            
            // Call the implementation.
            // out and outsize are 0 because we don't know the size yet.
            let result := delegatecall(gas(), implementation, 0, calldatasize(), 0, 0)
            
            // Copy the returned data.
            returndatacopy(0, 0, returndatasize())
            
            switch result
            // delegatecall returns 0 on error.
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }
}

// Helper library for accessing storage slots
library StorageSlot {
    struct AddressSlot {
        address value;
    }
    
    function getAddressSlot(bytes32 slot) internal pure returns (AddressSlot storage r) {
        assembly {
            r.slot := slot
        }
    }
} 
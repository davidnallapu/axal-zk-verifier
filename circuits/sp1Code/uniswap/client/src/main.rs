#![no_main]
sp1_zkvm::entrypoint!(main);

use alloy_primitives::{address, Address};
use alloy_sol_macro::sol;
use alloy_sol_types::SolValue;
use sp1_cc_client_executor::{io::EVMStateSketch, ClientExecutor, ContractInput};
sol! {
    /// Simplified interface of the IUniswapV3PoolState interface.
    interface IUniswapV3PoolState {
        function slot0(
        ) external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked);
    }
}

/// Address of Uniswap V3 pools.
const MAINNET_1_CONTRACT: Address = address!("88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640");
const MAINNET_2_CONTRACT: Address = address!("8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8");

pub fn main() {
    // Read the state sketch from stdin. Use this during the execution in order to
    // access Ethereum state.
    let state_sketch_bytes = sp1_zkvm::io::read::<Vec<u8>>();
    let state_sketch = bincode::deserialize::<EVMStateSketch>(&state_sketch_bytes).unwrap();

    // Initialize the client executor with the state sketch.
    let executor = ClientExecutor::new(&state_sketch).unwrap();

    // Execute the slot0 call using the client executor for mainnet.
    let slot0_call = IUniswapV3PoolState::slot0Call {};
    let mainnet_1_call = ContractInput::new_call(MAINNET_1_CONTRACT, Address::default(), slot0_call.clone());
    let mainnet_1_public_vals = executor.execute(mainnet_1_call).unwrap();

    // Execute the slot0 call using the client executor for base.
    let mainnet_2_call = ContractInput::new_call(MAINNET_2_CONTRACT, Address::default(), slot0_call);
    let mainnet_2_public_vals = executor.execute(mainnet_2_call).unwrap();

    // Commit the abi-encoded output for both calls.
    sp1_zkvm::io::commit_slice(&mainnet_1_public_vals.abi_encode());
    sp1_zkvm::io::commit_slice(&mainnet_2_public_vals.abi_encode());
}

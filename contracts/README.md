## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

-   **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
-   **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
-   **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
-   **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```

## Transparent Proxy Pattern

This project implements the transparent proxy pattern for upgradeability. This pattern allows us to:

1. Upgrade the contract logic while preserving all state and contract address
2. Separate admin functions from user functions
3. Avoid function selector clashes between proxy and implementation

### How It Works

The system consists of three main components:

1. **Implementation Contract** (`PriceDiscrepancyV1`): Contains the business logic but delegates storage to the proxy.
2. **Proxy Contract** (`PriceDiscrepancyProxy`): Holds the state and delegates function calls to the implementation.
3. **Deployer Contract** (`PriceDiscrepancyDeployer`): Handles deployment of both implementation and proxy.

### Key Features

- **Delegatecall**: The proxy uses `delegatecall` to execute the implementation's code in the context of the proxy's storage.
- **Admin Separation**: Admin functions are only accessible by the admin address, preventing function selector clashes.
- **Storage Slots**: Uses deterministic storage slots (EIP-1967) to avoid storage collisions.
- **Initialization**: Implementation is initialized via the proxy during deployment, replacing the constructor pattern.

### Upgrade Process

To upgrade the contract:

1. Deploy a new implementation contract (e.g., `PriceDiscrepancyV2`)
2. Call `upgradeTo(address newImplementation)` on the proxy with admin privileges
3. All state is preserved while logic is updated

### Implementation Details

- The proxy uses the EIP-1967 standard for storage slots to store implementation and admin addresses
- The `ifAdmin` modifier routes admin-specific functions to the proxy and all other calls to the implementation
- The deployment process uses `PriceDiscrepancyDeployer` to set up both contracts in a single transaction

### Security Considerations

- Only the admin can upgrade the implementation or change the admin address
- The implementation contract should never be used directly, always interact through the proxy
- Storage layout must be carefully preserved in new implementation versions

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## How to build the circuit

```bash
cd circuits
circom price_discrepancy.circom --r1cs --wasm --sym -o build
```
This should generate the `price_discrepancy.r1cs`, `price_discrepancy.wasm`, and `price_discrepancy.sym` files in the `build` directory.

After that, you need to generate the proving key:
```bash
npx snarkjs plonk setup build/price_discrepancy.r1cs ptau/powersOfTau28_hez_final_08.ptau build/proving_key.zkey
```
Make sure snarkjs is installed.

Generate the solidity verifier:
```bash
npx snarkjs zkey export solidityverifier circuits/build/proving_key.zkey contracts/src/PlonkVerifier.sol
```

## Build Issues

If you encounter any issues during the build process or running the circuit:
1. Uninstall circom with npm
2. Reinstall Circom using Rust's package manager: cargo install --git https://github.com/iden3/circom.git
3. Check circom --version
4. If that doesn't work: export PATH="$HOME/.cargo/bin:$PATH"
 
Note: npm seems to install an old version of circom

## Deploying the contract

To deploy the contract to the Sepolia testnet:

```bash
cd contracts
forge script script/PriceDiscrepancy.s.sol PriceDiscrepancyScript --broadcast --verify --rpc-url base-sepolia
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

## Testing the SP1 Code

This project includes succinct SP1 code that can be tested using the following steps. Note that generating a proof can take a significant amount of time, but you can test the execution by running the command below.

### How to Test

Navigate to the `circuits/sp1Code/uniswap/host` directory and run the following command:

```bash
RUST_LOG=info cargo run --release
```

This command will execute the SP1 code, allowing you to test its functionality without generating a proof. Ensure that you have all necessary dependencies installed and configured before running the command.

### Using Succinct's Prover Network

For generating proofs, I recommend using [Succinct's Prover Network](https://succinct.xyz) due to its efficiency in handling computationally intensive tasks. This network can significantly reduce the time and resources required for proof generation, making it ideal for complex circuits like the ones used in this project.

### Sample Output from the SP1 Code

```bash
#!/bin/bash

echo "Running \`/home/david/Documents/GitHub/axal/zk-verifier/zk-verifier/circuits/sp1/target/release/uniswap\`"
echo "2025-03-18T16:47:37.702870Z  INFO fetching account info for address: 0x0000000000000000000000000000000000000000"
echo "2025-03-18T16:47:37.833125Z  INFO fetching account info for address: 0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640"
echo "2025-03-18T16:47:37.966671Z  INFO fetching storage value at address: 0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640, index: 0"
echo "2025-03-18T16:47:38.012601Z  INFO fetching account info for address: 0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5"
echo "2025-03-18T16:47:38.137886Z  INFO fetching account info for address: 0x0000000000000000000000000000000000000000"
echo "2025-03-18T16:47:38.248746Z  INFO fetching account info for address: 0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8"
echo "2025-03-18T16:47:38.373506Z  INFO fetching storage value at address: 0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8, index: 0"
echo "2025-03-18T16:47:38.424026Z  INFO fetching account info for address: 0x95222290DD7278Aa3Ddd389Cc1E1d165CC4BAfe5"
echo "2025-03-18T16:47:38.531621Z  INFO fetching storage proofs"
echo "2025-03-18T16:47:38.829384Z  INFO fetching 0 ancestor headers"
echo "2025-03-18T16:47:39.753720Z  INFO vk verification: true"
echo "2025-03-18T16:47:43.123881Z  INFO execute: clk = 0 pc = 0x20c9e8"
echo "2025-03-18T16:47:43.250189Z  INFO execute: Shard Lifted: Index=0, Cluster=179"
echo "2025-03-18T16:47:43.250210Z  INFO execute: Chip Cpu: 21  -> 21"
echo "2025-03-18T16:47:43.250214Z  INFO execute: Chip DivRem: 1   -> 10"
echo "2025-03-18T16:47:43.250217Z  INFO execute: Chip AddSub: 21  -> 21"
echo "2025-03-18T16:47:43.250219Z  INFO execute: Chip Bitwise: 18  -> 18"
echo "2025-03-18T16:47:43.250222Z  INFO execute: Chip Mul: 13  -> 17"
echo "2025-03-18T16:47:43.250224Z  INFO execute: Chip ShiftRight: 15  -> 17"
echo "2025-03-18T16:47:43.250227Z  INFO execute: Chip ShiftLeft: 17  -> 17"
echo "2025-03-18T16:47:43.250229Z  INFO execute: Chip Lt: 20  -> 20"
echo "2025-03-18T16:47:43.250232Z  INFO execute: Chip MemoryInstrs: 20  -> 20"
echo "2025-03-18T16:47:43.250234Z  INFO execute: Chip Auipc: 14  -> 18"
echo "2025-03-18T16:47:43.250237Z  INFO execute: Chip Branch: 19  -> 19"
echo "2025-03-18T16:47:43.250239Z  INFO execute: Chip Jump: 15  -> 18"
echo "2025-03-18T16:47:43.250242Z  INFO execute: Chip SyscallInstrs: 9   -> 10"
echo "2025-03-18T16:47:43.250244Z  INFO execute: Chip MemoryLocal: 15  -> 18"
echo "2025-03-18T16:47:43.250247Z  INFO execute: Chip Global: 18  -> 18"
echo "2025-03-18T16:47:43.251546Z  INFO execute: Shard Lifted: Index=1, Cluster=245"
echo "2025-03-18T16:47:43.251554Z  INFO execute: Chip Cpu: 19  -> 19"
echo "2025-03-18T16:47:43.251557Z  INFO execute: Chip DivRem: 1   -> 10"
echo "2025-03-18T16:47:43.251560Z  INFO execute: Chip AddSub: 19  -> 19"
echo "2025-03-18T16:47:43.251562Z  INFO execute: Chip Bitwise: 15  -> 15"
echo "2025-03-18T16:47:43.251564Z  INFO execute: Chip Mul: 12  -> 15"
echo "2025-03-18T16:47:43.251567Z  INFO execute: Chip ShiftRight: 14  -> 15"
echo "2025-03-18T16:47:43.251569Z  INFO execute: Chip ShiftLeft: 14  -> 15"
echo "2025-03-18T16:47:43.251572Z  INFO execute: Chip Lt: 17  -> 17"
echo "2025-03-18T16:47:43.251574Z  INFO execute: Chip MemoryInstrs: 17  -> 17"
echo "2025-03-18T16:47:43.251577Z  INFO execute: Chip Auipc: 12  -> 16"
echo "2025-03-18T16:47:43.251579Z  INFO execute: Chip Branch: 16  -> 16"
echo "2025-03-18T16:47:43.251581Z  INFO execute: Chip Jump: 14  -> 16"
echo "2025-03-18T16:47:43.251584Z  INFO execute: Chip SyscallInstrs: 7   -> 10"
echo "2025-03-18T16:47:43.251586Z  INFO execute: Chip MemoryLocal: 13  -> 16"
echo "2025-03-18T16:47:43.251589Z  INFO execute: Chip Global: 16  -> 16"
echo "2025-03-18T16:47:43.252104Z  INFO execute: gas: 6047434"
echo "2025-03-18T16:47:43.254764Z  INFO execute: close time.busy=235ms time.idle=3.71µs"
echo "executed program with 2408982 cycles"
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

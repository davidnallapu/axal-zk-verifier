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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

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

## Build Issues

If you encounter any issues during the build process or running the circuit:
1. Uninstall circom with npm
2. Reinstall Circom using Rust’s package manager: cargo install --git https://github.com/iden3/circom.git
3. Check circom --version
4. If that doesn't work: export PATH="$HOME/.cargo/bin:$PATH"
 
Note: npm seems to install an old version of circom
## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

pragma circom 2.1.3;

include "../node_modules/circomlib/circuits/comparators.circom";

template PriceDiscrepancyCheck(nBits) {
    // Public inputs (from on-chain sources)
    signal input price1;      // Price from Uniswap Pool 1 (in wei)
    signal input price2;      // Price from Uniswap Pool 2 (in wei)
    signal input threshold;   // Minimum price difference required (in wei)

    // Output signal (proof result)
    signal output valid;      // 1 if price difference exceeds threshold, 0 otherwise

    // Step 1: Calculate the difference between prices
    // Note: The difference could be negative if price2 > price1
    signal difference;
    difference <== price1 - price2;

    // Step 2: Convert difference to absolute value
    // Uses circomlib's Absolute component to handle negative values
    // nBits parameter ensures sufficient bits to represent the number
    component abs_diff = Absolute(nBits);
    abs_diff.in <== difference;

    // Step 3: Compare absolute difference with threshold
    // Uses circomlib's GreaterEqThan component for comparison
    // Returns 1 if first input >= second input, 0 otherwise
    component discrepancy_check = GreaterEqThan(nBits);
    discrepancy_check.in[0] <== abs_diff.out;
    discrepancy_check.in[1] <== threshold;

    // Step 4: Set the output
    // The proof is valid (1) only if the price difference exceeds the threshold
    valid <== discrepancy_check.out;
}

// Main component instantiation
// 32 bits allows for numbers up to 2^32 - 1, suitable for most price representations
component main = PriceDiscrepancyCheck(32);

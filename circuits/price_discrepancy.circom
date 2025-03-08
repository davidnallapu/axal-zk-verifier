pragma circom 2.1.3;

// Use relative path to circomlib
include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/bitify.circom";

template PriceDiscrepancyCheck(nBits) {
    // Public inputs (from on-chain sources)
    signal input price1;      // Price from Uniswap Pool 1 (in wei)
    signal input price2;      // Price from Uniswap Pool 2 (in wei)
    signal input threshold;   // Minimum price difference required (in wei)

    // Output signal (proof result)
    signal output valid;      // 1 if price difference exceeds threshold, 0 otherwise

    // Step 1: Calculate both possible differences
    signal diff1;
    signal diff2;
    diff1 <== price1 - price2;  // If price1 > price2
    diff2 <== price2 - price1;  // If price2 > price1

    // Step 2: Determine which difference to use
    component lt = LessThan(nBits);
    lt.in[0] <== price1;
    lt.in[1] <== price2;

    // Step 3: Select the positive difference (absolute value)
    // Replace non-quadratic constraint with intermediate signals
    signal intermediate1;
    signal intermediate2;
    intermediate1 <== lt.out * diff2;
    intermediate2 <== (1 - lt.out) * diff1;
    signal abs;
    abs <== intermediate1 + intermediate2;

    // Step 4: Compare absolute difference with threshold
    component discrepancy_check = GreaterEqThan(nBits);
    discrepancy_check.in[0] <== abs;
    discrepancy_check.in[1] <== threshold;

    // Step 5: Set the output
    valid <== discrepancy_check.out;
}

// Main component instantiation
// 32 bits allows for numbers up to 2^32 - 1, suitable for most price representations
component main = PriceDiscrepancyCheck(32);

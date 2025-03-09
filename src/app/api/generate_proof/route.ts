import { generateProof } from '@/lib/generateProof';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const price1 = parseInt(body.price1);
    const price2 = parseInt(body.price2);
    const threshold = parseInt(body.threshold);
    if (Number.isNaN(price1) || Number.isNaN(price2) || Number.isNaN(threshold)) {
      return NextResponse.json(
        { error: "Invalid inputs" },
        { status: 400 }
      );
    }

    console.log("generate_proof/price1", price1);
    console.log("generate_proof/price2", price2);
    console.log("generate_proof/threshold", threshold);

    const proof = await generateProof(price1, price2, threshold);

    console.log("generate_proof/Got the proof as calldata ", proof);
    if (proof.proof === "") {
      return NextResponse.json(
        { error: "Proving failed" },
        { status: 400 }
      );
    }

    console.log("generate_proof/Returning the proof as calldata ", proof);
    return NextResponse.json(proof, { status: 200 });
  } catch (_error) {
    return NextResponse.json(
      { error: _error },
      { status: 400 }
    );
  }
}

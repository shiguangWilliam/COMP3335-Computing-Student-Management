import { NextResponse } from "next/server";
import { getServerKeyPair } from "@/lib/cryptoServer";

export const dynamic = "force-dynamic";

export async function GET() {
  const { publicKeyPem } = getServerKeyPair();
  return NextResponse.json({ publicKeyPem }, { status: 200 });
}


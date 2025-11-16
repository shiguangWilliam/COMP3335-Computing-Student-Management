import { NextRequest } from "next/server";
import { relaySecure } from "@/lib/secureProxy";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return relaySecure(req, "/students");
}
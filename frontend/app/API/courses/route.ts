import { NextRequest } from "next/server";
import { relaySecure } from "@/lib/secureProxy";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return relaySecure(req, "/courses");
}
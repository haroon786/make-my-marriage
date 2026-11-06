import type { NextRequest } from "next/server";
import { invitationHandler } from "@/modules/members/handlers";
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) { return invitationHandler(request, (await params).token, "accept"); }

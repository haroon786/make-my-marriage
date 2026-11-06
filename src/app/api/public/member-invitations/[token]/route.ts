import type { NextRequest } from "next/server";
import { invitationHandler } from "@/modules/members/handlers";
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) { return invitationHandler(request, (await params).token, "view"); }

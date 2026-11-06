import type { NextRequest } from "next/server";
import { membersHandler } from "@/modules/members/handlers";
export function GET(request: NextRequest) { return membersHandler(request, "invitations"); }
export function POST(request: NextRequest) { return membersHandler(request, "invite"); }

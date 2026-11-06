import type { NextRequest } from "next/server";
import { membersHandler } from "@/modules/members/handlers";
export function GET(request: NextRequest) { return membersHandler(request, "members"); }

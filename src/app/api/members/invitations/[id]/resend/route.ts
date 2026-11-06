import type { NextRequest } from "next/server";
import { membersHandler } from "@/modules/members/handlers";
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { return membersHandler(request, "resend", (await params).id); }

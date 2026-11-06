import type { NextRequest } from "next/server";
import { membersHandler } from "@/modules/members/handlers";
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { return membersHandler(request, "revoke", (await params).id); }

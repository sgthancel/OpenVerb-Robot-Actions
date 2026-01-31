import { NextResponse } from "next/server";
import { updatePilotSettings, getWorldState } from "@/src/store/worldStore";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { useAI, isRunning } = body;

        updatePilotSettings({
            ...(useAI !== undefined ? { useAI } : {}),
            ...(isRunning !== undefined ? { isRunning } : {})
        });

        return NextResponse.json({
            ok: true,
            pilot: getWorldState().pilot,
        });
    } catch (error) {
        return NextResponse.json({
            ok: false,
            error: { code: "BAD_REQUEST", message: "Invalid settings" },
        }, { status: 400 });
    }
}

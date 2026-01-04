import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import Ticket from "@/lib/models/Ticket";
import Organization from "@/lib/models/Organization";
import { callSnowflakeLLM } from "@/lib/snowflakeLLM";
import mongoose from "mongoose";

export const runtime = "nodejs";

/**
 * POST /api/tickets/[id]/triage - Triage a ticket using AI (org owner only)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid ticket ID" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Fetch the ticket
    const ticket = await Ticket.findById(id).lean();

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    // Verify the user owns the organization
    const organization = await Organization.findById(ticket.organizationId).lean();

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    if (organization.createdBy.toString() !== session.user.id) {
      return NextResponse.json(
        { error: "Only organization owners can triage tickets" },
        { status: 403 }
      );
    }

    // Prepare the triage prompt for Snowflake LLM
    const triagePrompt = `You are a ticket triage assistant. Analyze the following support ticket and determine:
1. Priority level (low, medium, or high)
2. Type/category (bug, feature, or tweak)

Ticket Title: ${ticket.title}
Ticket Description: ${ticket.description}

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks, just the raw JSON):
{"priority": "low|medium|high", "type": "bug|feature|tweak"}`;

    // Call Snowflake LLM (without response_format as it may not be supported)
    const llmResponse = await callSnowflakeLLM({
      prompt: triagePrompt,
    });

    // Parse the LLM response
    let triageResult: { priority: string; type: string };
    try {
      let content = llmResponse?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("No content in LLM response");
      }
      
      // Clean up the response - remove markdown code blocks if present
      content = content.trim();
      content = content.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
      content = content.trim();
      
      triageResult = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse LLM response:", parseError);
      console.error("Raw content:", llmResponse?.choices?.[0]?.message?.content);
      return NextResponse.json(
        { error: "Failed to parse AI triage result" },
        { status: 500 }
      );
    }

    // Validate the triage result
    const validPriorities = ["low", "medium", "high"];
    const validTypes = ["bug", "feature", "tweak"];

    if (
      !triageResult.priority ||
      !validPriorities.includes(triageResult.priority) ||
      !triageResult.type ||
      !validTypes.includes(triageResult.type)
    ) {
      console.error("Invalid triage result:", triageResult);
      return NextResponse.json(
        { error: "AI returned invalid triage data" },
        { status: 500 }
      );
    }

    // Update the ticket with triage results
    const updatedTicket = await Ticket.findByIdAndUpdate(
      id,
      {
        $set: {
          priority: triageResult.priority,
          tag: triageResult.type,
          lastTriagedAt: new Date(),
          triageStatus: "triaged",
        },
      },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      ticket: {
        id: updatedTicket!._id.toString(),
        priority: updatedTicket!.priority,
        type: updatedTicket!.tag,
        lastTriagedAt: updatedTicket!.lastTriagedAt?.toISOString(),
        triageStatus: updatedTicket!.triageStatus,
      },
    });
  } catch (error) {
    console.error("Error triaging ticket:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

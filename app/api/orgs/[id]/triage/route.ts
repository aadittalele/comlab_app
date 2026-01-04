import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Organization from "@/lib/models/Organization";
import Ticket from "@/lib/models/Ticket";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { callSnowflakeLLM } from "@/lib/snowflakeLLM";

// POST /api/orgs/[id]/triage - Triage all tickets for an organization (requires authentication + ownership)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid organization ID" },
        { status: 400 }
      );
    }

    // Load organization and verify ownership
    const organization = await Organization.findById(id);

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    if (organization.createdBy.toString() !== session.user.id) {
      return NextResponse.json(
        { error: "You do not have permission to triage tickets for this organization" },
        { status: 403 }
      );
    }

    // Load all tickets for this organization
    const tickets = await Ticket.find({ organizationId: organization._id })
      .select("_id title description tag priority")
      .lean();

    if (tickets.length === 0) {
      return NextResponse.json(
        { success: true, updatedCount: 0, results: [], message: "No tickets to triage" },
        { status: 200 }
      );
    }

    // Build LLM prompt with product context and all tickets
    const productContext = `Product Name: ${organization.name}
${organization.description ? `Product Description: ${organization.description}` : ""}`;

    const ticketsData = tickets.map((ticket) => ({
      id: ticket._id.toString(),
      title: ticket.title,
      description: ticket.description,
    }));

    const prompt = `${productContext}

You are a product manager triaging user-reported tickets for the product above. Analyze each ticket and assign:
1. **Priority**: "low", "medium", or "high" (how urgent/impactful)
2. **Type**: "bug", "feature", or "tweak" (what kind of issue/request)

Tickets to triage:
${JSON.stringify(ticketsData, null, 2)}

Return ONLY a JSON array with this exact structure (no markdown, no explanation):
[
  { "id": "ticket_id_1", "priority": "low|medium|high", "type": "bug|feature|tweak" },
  { "id": "ticket_id_2", "priority": "low|medium|high", "type": "bug|feature|tweak" },
  ...
]`;

    // Call LLM
    const llmResponse = await callSnowflakeLLM({
      prompt,
    });

    if (!llmResponse?.choices?.[0]?.message?.content) {
      console.error("LLM call failed - no content in response");
      return NextResponse.json(
        { error: "Failed to get triage response from LLM" },
        { status: 500 }
      );
    }

    // Parse LLM response
    let triageResults: Array<{ id: string; priority: string; type: string }>;
    try {
      let jsonText = llmResponse.choices[0].message.content.trim();
      // Strip markdown code fences if present
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }
      triageResults = JSON.parse(jsonText);

      if (!Array.isArray(triageResults)) {
        throw new Error("LLM response is not an array");
      }
    } catch (parseError) {
      console.error("Failed to parse LLM response:", parseError, llmResponse?.choices?.[0]?.message?.content);
      return NextResponse.json(
        { error: "Failed to parse triage results from LLM" },
        { status: 500 }
      );
    }

    // Validate and prepare bulk updates
    const validPriorities = ["low", "medium", "high"];
    const validTypes = ["bug", "feature", "tweak"];
    const ticketIdSet = new Set(tickets.map((t) => t._id.toString()));
    const now = new Date();

    const bulkOps = [];
    const validResults = [];

    for (const result of triageResults) {
      const { id, priority, type } = result;

      // Skip if ID not in our ticket set
      if (!ticketIdSet.has(id)) {
        console.warn(`Skipping unknown ticket ID from LLM: ${id}`);
        continue;
      }

      // Validate priority and type
      if (!validPriorities.includes(priority)) {
        console.warn(`Invalid priority "${priority}" for ticket ${id}, skipping`);
        continue;
      }

      if (!validTypes.includes(type)) {
        console.warn(`Invalid type "${type}" for ticket ${id}, skipping`);
        continue;
      }

      bulkOps.push({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(id), organizationId: organization._id },
          update: {
            $set: {
              priority: priority as "low" | "medium" | "high",
              tag: type as "bug" | "feature" | "tweak",
              lastTriagedAt: now,
              triageStatus: "triaged" as const,
            },
          },
        },
      });

      validResults.push({ id, priority, type });
    }

    // Execute bulk update
    let updatedCount = 0;
    if (bulkOps.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bulkResult = await Ticket.bulkWrite(bulkOps as any);
      updatedCount = bulkResult.modifiedCount;
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      totalTickets: tickets.length,
      results: validResults,
    });
  } catch (error) {
    console.error("Error triaging tickets:", error);
    return NextResponse.json(
      { error: "Failed to triage tickets" },
      { status: 500 }
    );
  }
}

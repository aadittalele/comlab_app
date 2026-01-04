import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongoose";
import Ticket from "@/lib/models/Ticket";
import { callSnowflakeLLM } from "@/lib/snowflakeLLM";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: orgId } = await context.params;

  try {
    await connectDB();

    // Fetch all tickets for the organization
    const tickets = await Ticket.find({ organizationId: orgId })
      .populate("reportedBy", "name")
      .sort({ createdAt: -1 })
      .lean();

    if (tickets.length === 0) {
      return NextResponse.json({
        summary: "No tickets found for this organization.",
      });
    }

    // Prepare ticket data for LLM
    const ticketData = tickets.map((ticket) => ({
      title: ticket.title,
      description: ticket.description,
      tag: ticket.tag,
      priority: ticket.priority,
      status: ticket.status,
      votes: ticket.votes,
      reportedBy: (ticket.reportedBy as any)?.name || "Unknown",
      createdAt: ticket.createdAt,
    }));

    // Create a prompt for the LLM
    const prompt = `You are a helpful assistant that summarizes user feedback and feature requests. 
Please provide a comprehensive summary of the following tickets for an organization.

Include in your summary:
1. Overall statistics (total tickets, breakdown by type, status, and priority)
2. Key themes and patterns
3. Top priorities based on votes and importance
4. Notable individual tickets or feature requests

Tickets (${tickets.length} total):
${JSON.stringify(ticketData, null, 2)}

Provide a concise summary that helps the organization understand their feedback landscape. Do not use bullet points.`;

    // Call the LLM
    const llmOutput = await callSnowflakeLLM({
      prompt,
      model: "openai-gpt-5-mini",
    });

    // Extract the content from the LLM response
    const summary =
      llmOutput.choices?.[0]?.message?.content || "Unable to generate summary.";

    return NextResponse.json({
      summary,
      ticketCount: tickets.length,
    });
  } catch (error) {
    console.error("Error generating ticket summary:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}

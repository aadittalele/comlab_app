import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import Ticket, { ITicket } from "@/lib/models/Ticket";
import Vote from "@/lib/models/Vote";
import { ticketCreateSchema } from "@/lib/validators";
import mongoose from "mongoose";

export const runtime = "nodejs";

/**
 * GET /api/tickets - List all tickets for an organization (public)
 * Requires organizationId query parameter
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");
    const submittedByMe = searchParams.get("submittedByMe");
    const searchQuery = searchParams.get("q");
    const typeFilter = searchParams.get("type");
    const sortBy = searchParams.get("sort") || "newest";

    await dbConnect();

    // Get current user if authenticated
    const session = await auth();
    const userId = session?.user?.id;

    // If user wants to see their submitted tickets
    if (submittedByMe === "true") {
      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const tickets = await Ticket.find({
        reportedBy: new mongoose.Types.ObjectId(userId),
      })
        .sort({ createdAt: -1 })
        .select("-image")
        .populate("organizationId", "name")
        .lean();

      return NextResponse.json({
        tickets: tickets.map((ticket: any) => ({
          id: ticket._id.toString(),
          title: ticket.title,
          description: ticket.description,
          votes: ticket.votes,
          priority: ticket.priority,
          status: ticket.status,
          tag: ticket.tag,
          voted: false, // User can't vote on their own tickets
          organization: ticket.organizationId
            ? {
                id: ticket.organizationId._id.toString(),
                name: ticket.organizationId.name,
              }
            : null,
          createdAt: ticket.createdAt.toISOString(),
          updatedAt: ticket.updatedAt.toISOString(),
        })),
      });
    }

    // Otherwise, filter by organization
    if (!organizationId) {
      // If no organizationId is provided, return empty array
      return NextResponse.json({ tickets: [] });
    }

    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      return NextResponse.json(
        { error: "Invalid organization ID" },
        { status: 400 }
      );
    }

    // Build query filter
    const filter: any = {
      organizationId: new mongoose.Types.ObjectId(organizationId),
    };

    // Add text search if provided
    if (searchQuery) {
      filter.$or = [
        { title: { $regex: searchQuery, $options: "i" } },
        { description: { $regex: searchQuery, $options: "i" } },
      ];
    }

    // Add type filter if provided
    if (typeFilter && ["bug", "tweak", "feature"].includes(typeFilter)) {
      filter.tag = typeFilter;
    }

    // Determine sort order
    let sortCriteria: any = { createdAt: -1 };
    if (sortBy === "mostVoted") {
      sortCriteria = { votes: -1, createdAt: -1 };
    }

    // Fetch tickets with MongoDB sort (except priority which needs in-memory sort)
    let tickets = await Ticket.find(filter)
      .sort(sortBy === "priority" ? { createdAt: -1 } : sortCriteria)
      .select("-image") // Exclude images from list for performance
      .populate("reportedBy", "firstName lastName email")
      .lean();

    // For priority sorting, we need to sort in memory due to enum ordering
    if (sortBy === "priority") {
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2, none: 3 };
      tickets = tickets.sort((a: any, b: any) => {
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    // If user is authenticated, fetch their votes for these tickets
    let userVotes = new Set<string>();
    if (userId) {
      const ticketIds = tickets.map((t: any) => t._id);
      const votes = await Vote.find({
        userId: new mongoose.Types.ObjectId(userId),
        ticketId: { $in: ticketIds },
      }).lean();
      userVotes = new Set(votes.map((v) => v.ticketId.toString()));
    }

    return NextResponse.json({
      tickets: tickets.map((ticket: any) => ({
        id: ticket._id.toString(),
        title: ticket.title,
        description: ticket.description,
        votes: ticket.votes,
        priority: ticket.priority,
        status: ticket.status,
        tag: ticket.tag,
        voted: userVotes.has(ticket._id.toString()),
        reportedBy: ticket.reportedBy
          ? {
              id: ticket.reportedBy._id.toString(),
              name:
                ticket.reportedBy.firstName || ticket.reportedBy.lastName
                  ? `${ticket.reportedBy.firstName || ""} ${ticket.reportedBy.lastName || ""}`.trim()
                  : ticket.reportedBy.email,
            }
          : null,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tickets - Create a new ticket (requires authentication)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Validate input
    const result = ticketCreateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    // Validate organizationId
    if (!mongoose.Types.ObjectId.isValid(result.data.organizationId)) {
      return NextResponse.json(
        { error: "Invalid organization ID" },
        { status: 400 }
      );
    }

    await dbConnect();

    const ticket = await Ticket.create({
      ...result.data,
      reportedBy: new mongoose.Types.ObjectId(session.user.id),
      organizationId: new mongoose.Types.ObjectId(result.data.organizationId),
      status: "open",
      votes: 0,
    });

    return NextResponse.json(
      {
        ticket: {
          id: ticket._id.toString(),
          title: ticket.title,
          description: ticket.description,
          image: ticket.image,
          votes: ticket.votes,
          priority: ticket.priority,
          status: ticket.status,
          tag: ticket.tag,
          createdAt: ticket.createdAt.toISOString(),
          updatedAt: ticket.updatedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

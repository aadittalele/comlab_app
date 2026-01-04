import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import Ticket from "@/lib/models/Ticket";
import { ticketUpdateSchema } from "@/lib/validators";
import mongoose from "mongoose";

export const runtime = "nodejs";

/**
 * GET /api/tickets/[id] - Get a single ticket by ID (public)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid ticket ID" },
        { status: 400 }
      );
    }

    await dbConnect();

    const ticket = await Ticket.findById(id)
      .populate("reportedBy", "firstName lastName email")
      .lean();

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ticket: {
        id: ticket._id.toString(),
        title: ticket.title,
        description: ticket.description,
        image: ticket.image,
        votes: ticket.votes,
        priority: ticket.priority,
        status: ticket.status,
        tag: ticket.tag,
        organizationId: ticket.organizationId.toString(),
        reportedBy: ticket.reportedBy
          ? {
              id: (ticket.reportedBy as any)._id.toString(),
              name:
                (ticket.reportedBy as any).firstName || (ticket.reportedBy as any).lastName
                  ? `${(ticket.reportedBy as any).firstName || ""} ${(ticket.reportedBy as any).lastName || ""}`.trim()
                  : (ticket.reportedBy as any).email,
            }
          : null,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching ticket:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tickets/[id] - Update a ticket (must be reported by user)
 */
export async function PATCH(
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

    const body = await req.json();

    // Validate input
    const result = ticketUpdateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    await dbConnect();

    const ticket = await Ticket.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        reportedBy: new mongoose.Types.ObjectId(session.user.id),
      },
      { $set: result.data },
      { new: true }
    );

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found or you don't have permission to update it" },
        { status: 404 }
      );
    }

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("Error updating ticket:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tickets/[id] - Delete a ticket (must be reported by user)
 */
export async function DELETE(
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

    const ticket = await Ticket.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(id),
      reportedBy: new mongoose.Types.ObjectId(session.user.id),
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found or you don't have permission to delete it" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Ticket deleted successfully" });
  } catch (error) {
    console.error("Error deleting ticket:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

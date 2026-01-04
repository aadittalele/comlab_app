import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import Ticket from "@/lib/models/Ticket";
import Organization from "@/lib/models/Organization";
import { ticketStatusUpdateSchema } from "@/lib/validators";
import mongoose from "mongoose";

export const runtime = "nodejs";

/**
 * PATCH /api/tickets/[id]/status - Update ticket status (organization owners only)
 * 
 * This endpoint allows organization owners to update the status of tickets
 * tied to their organization. It does NOT allow editing the ticket content itself.
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
    const result = ticketStatusUpdateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    await dbConnect();

    // First, get the ticket to find its organization
    const ticket = await Ticket.findById(id);

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    // Check if the user is the owner of the organization
    const organization = await Organization.findOne({
      _id: ticket.organizationId,
      createdBy: new mongoose.Types.ObjectId(session.user.id),
    });

    if (!organization) {
      return NextResponse.json(
        { error: "You must be the organization owner to update ticket status" },
        { status: 403 }
      );
    }

    // Update only the status field
    ticket.status = result.data.status;
    await ticket.save();

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
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error updating ticket status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

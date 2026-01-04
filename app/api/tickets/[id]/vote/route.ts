import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import Vote from "@/lib/models/Vote";
import Ticket from "@/lib/models/Ticket";
import mongoose from "mongoose";

export const runtime = "nodejs";

/**
 * POST /api/tickets/[id]/vote - Toggle vote on a ticket (requires authentication)
 * If vote exists: delete it and decrement ticket votes
 * If vote doesn't exist: create it and increment ticket votes
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

    const { id: ticketId } = await params;

    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return NextResponse.json(
        { error: "Invalid ticket ID" },
        { status: 400 }
      );
    }

    await dbConnect();

    const userId = new mongoose.Types.ObjectId(session.user.id);
    const ticketObjectId = new mongoose.Types.ObjectId(ticketId);

    // Check if ticket exists
    const ticket = await Ticket.findById(ticketObjectId);
    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    // Check if user has already voted
    const existingVote = await Vote.findOne({
      userId,
      ticketId: ticketObjectId,
    });

    if (existingVote) {
      // User has voted, remove the vote and decrement count
      await Vote.deleteOne({ _id: existingVote._id });
      await Ticket.findByIdAndUpdate(ticketObjectId, {
        $inc: { votes: -1 },
      });

      const updatedTicket = await Ticket.findById(ticketObjectId);

      return NextResponse.json({
        voted: false,
        votes: updatedTicket?.votes || 0,
      });
    } else {
      // User hasn't voted, create vote and increment count
      await Vote.create({
        userId,
        ticketId: ticketObjectId,
      });
      await Ticket.findByIdAndUpdate(ticketObjectId, {
        $inc: { votes: 1 },
      });

      const updatedTicket = await Ticket.findById(ticketObjectId);

      return NextResponse.json({
        voted: true,
        votes: updatedTicket?.votes || 0,
      });
    }
  } catch (error) {
    console.error("Error toggling vote:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tickets/[id]/vote - Check if current user has voted on this ticket
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ voted: false });
    }

    const { id: ticketId } = await params;

    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return NextResponse.json(
        { error: "Invalid ticket ID" },
        { status: 400 }
      );
    }

    await dbConnect();

    const vote = await Vote.findOne({
      userId: new mongoose.Types.ObjectId(session.user.id),
      ticketId: new mongoose.Types.ObjectId(ticketId),
    });

    return NextResponse.json({ voted: !!vote });
  } catch (error) {
    console.error("Error checking vote status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

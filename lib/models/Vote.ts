import mongoose, { Schema, Model, Document } from "mongoose";

export interface IVote extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  ticketId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VoteSchema = new Schema<IVote>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },
    ticketId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Ticket",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index to ensure one vote per user per ticket
VoteSchema.index({ userId: 1, ticketId: 1 }, { unique: true });

const Vote: Model<IVote> =
  mongoose.models.Vote || mongoose.model<IVote>("Vote", VoteSchema);

export default Vote;

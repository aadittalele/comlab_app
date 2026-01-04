import mongoose, { Schema, Model, Document } from "mongoose";

export interface ITicket extends Document {
  _id: mongoose.Types.ObjectId;
  reportedBy: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  image?: string; // Raw base64 encoded image (5MB cap)
  votes: number;
  priority: "none" | "low" | "medium" | "high";
  status: "open" | "in-progress" | "closed";
  tag: "bug" | "tweak" | "feature";
  lastTriagedAt?: Date;
  triageStatus?: "pending" | "triaged";
  createdAt: Date;
  updatedAt: Date;
}

const TicketSchema = new Schema<ITicket>(
  {
    reportedBy: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Organization",
      index: true, // Index for fast per-org queries
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    image: {
      type: String,
      // Raw base64 string, validated before save
    },
    votes: {
      type: Number,
      default: 0,
      min: 0,
    },
    priority: {
      type: String,
      enum: ["none", "low", "medium", "high"],
      default: "none",
      required: true,
    },
    status: {
      type: String,
      enum: ["open", "in-progress", "closed"],
      default: "open",
      required: true,
    },
    tag: {
      type: String,
      enum: ["bug", "tweak", "feature"],
      required: true,
    },
    lastTriagedAt: {
      type: Date,
    },
    triageStatus: {
      type: String,
      enum: ["pending", "triaged"],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient per-org queries
TicketSchema.index({ organizationId: 1, createdAt: -1 });

const Ticket: Model<ITicket> =
  mongoose.models.Ticket || mongoose.model<ITicket>("Ticket", TicketSchema);

export default Ticket;

import mongoose, { Schema, Model, Document } from "mongoose";

export interface IOrganization extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  nameLower: string; // For case-insensitive search
  description?: string;
  website?: string;
  github?: string;
  image?: string; // Raw base64 encoded image (1MB cap)
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    nameLower: {
      type: String,
      required: true,
      lowercase: true,
      index: true, // Enable efficient regex search
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    website: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    github: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    image: {
      type: String,
      // Raw base64 string, validated before save
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const Organization: Model<IOrganization> =
  mongoose.models.Organization ||
  mongoose.model<IOrganization>("Organization", OrganizationSchema);

export default Organization;

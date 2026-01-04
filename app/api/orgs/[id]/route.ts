import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Organization from "@/lib/models/Organization";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { organizationUpdateSchema } from "@/lib/validators";

// GET /api/orgs/[id] - Get a single organization by ID (public)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid organization ID" },
        { status: 400 }
      );
    }

    const organization = await Organization.findById(id).lean();

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: organization._id.toString(),
      name: organization.name,
      description: organization.description,
      website: organization.website,
      github: organization.github,
      image: organization.image,
      createdBy: organization.createdBy.toString(),
      createdAt: organization.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching organization:", error);
    return NextResponse.json(
      { error: "Failed to fetch organization" },
      { status: 500 }
    );
  }
}

// PATCH /api/orgs/[id] - Update an organization (requires authentication + ownership)
export async function PATCH(
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

    const body = await req.json();

    // Validate input
    const validation = organizationUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { name, description, website, github } = validation.data;

    // Find organization and check ownership
    const organization = await Organization.findById(id);

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    if (organization.createdBy.toString() !== session.user.id) {
      return NextResponse.json(
        { error: "You do not have permission to edit this organization" },
        { status: 403 }
      );
    }

    // Update organization
    organization.name = name;
    organization.nameLower = name.toLowerCase();
    organization.description = description || undefined;
    organization.website = website || undefined;
    organization.github = github || undefined;

    await organization.save();

    return NextResponse.json({
      organization: {
        id: organization._id.toString(),
        name: organization.name,
        description: organization.description,
        website: organization.website,
        github: organization.github,
        createdBy: organization.createdBy.toString(),
        createdAt: organization.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error updating organization:", error);
    return NextResponse.json(
      { error: "Failed to update organization" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Organization from "@/lib/models/Organization";
import { organizationCreateSchema } from "@/lib/validators";
import { auth } from "@/lib/auth";

// GET /api/orgs - Public search for organizations
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const limitParam = searchParams.get("limit");
    const createdBy = searchParams.get("createdBy");
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 20) : 20;

    // Build query filter
    const filter: any = {};
    
    if (query) {
      // Escape regex special characters and perform case-insensitive search
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Search in both name and description using MongoDB $regex operator
      filter.$or = [
        { name: { $regex: escapedQuery, $options: 'i' } },
        { description: { $regex: escapedQuery, $options: 'i' } }
      ];
    }
    
    if (createdBy) {
      filter.createdBy = createdBy;
    }

    const organizations = await Organization.find(filter)
      .limit(limit)
      .select("-image") // Exclude image from list for performance
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      organizations: organizations.map((org) => ({
        id: org._id.toString(),
        name: org.name,
        description: org.description,
        website: org.website,
        github: org.github,
        createdBy: org.createdBy.toString(),
        createdAt: org.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return NextResponse.json(
      { error: "Failed to fetch organizations" },
      { status: 500 }
    );
  }
}

// POST /api/orgs - Create a new organization (requires authentication)
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // Check if user has already created an organization
    const existingOrg = await Organization.findOne({ createdBy: session.user.id });
    if (existingOrg) {
      return NextResponse.json(
        { error: "You have already created an organization" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validation = organizationCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, description, website, github, image } = validation.data;

    // Create organization with nameLower for search
    const organization = await Organization.create({
      name,
      nameLower: name.toLowerCase(),
      description,
      website,
      github,
      image,
      createdBy: session.user.id,
    });

    return NextResponse.json(
      {
        id: organization._id.toString(),
        name: organization.name,
        description: organization.description,
        website: organization.website,
        github: organization.github,
        createdAt: organization.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating organization:", error);
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }
}

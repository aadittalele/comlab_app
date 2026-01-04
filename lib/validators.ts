import { z } from "zod";

// Signup validation schema
export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password is too long"),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;

// Ticket validation schema
export const ticketCreateSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().min(1, "Description is required").max(2000, "Description is too long"),
  image: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const result = validateBase64MaxBytes(val, 5 * 1024 * 1024, "Ticket image");
        return result.valid;
      },
      {
        message: "Ticket image must be valid base64 and under 5MB",
      }
    ),
  priority: z.enum(["none", "low", "medium", "high"]).default("none"),
  tag: z.enum(["bug", "tweak", "feature"]),
});

export type TicketCreateInput = z.infer<typeof ticketCreateSchema>;

// Partial ticket schema for updates (all fields optional except IDs)
export const ticketUpdateSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long").optional(),
  description: z.string().min(1, "Description is required").max(2000, "Description is too long").optional(),
  image: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const result = validateBase64MaxBytes(val, 5 * 1024 * 1024, "Ticket image");
        return result.valid;
      },
      {
        message: "Ticket image must be valid base64 and under 5MB",
      }
    ),
  priority: z.enum(["none", "low", "medium", "high"]).optional(),
  status: z.enum(["open", "in-progress", "closed"]).optional(),
  tag: z.enum(["bug", "tweak", "feature"]).optional(),
});

export type TicketUpdateInput = z.infer<typeof ticketUpdateSchema>;

// Legacy schema for backwards compatibility
export const ticketSchema = ticketCreateSchema;

// Base64 validation helper
export function validateBase64MaxBytes(
  base64String: string,
  maxBytes: number,
  fieldName: string = "Image"
): { valid: boolean; error?: string } {
  // Check if string contains only valid base64 characters
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(base64String)) {
    return {
      valid: false,
      error: `${fieldName} contains invalid base64 characters`,
    };
  }

  // Calculate decoded size: base64 encodes 3 bytes into 4 characters
  // Remove padding to get accurate count
  const withoutPadding = base64String.replace(/=/g, "");
  const decodedBytes = (withoutPadding.length * 3) / 4;

  if (decodedBytes > maxBytes) {
    return {
      valid: false,
      error: `${fieldName} exceeds maximum size of ${maxBytes} bytes (decoded size: ${Math.ceil(decodedBytes)} bytes)`,
    };
  }

  return { valid: true };
}

// Organization validation schema
export const organizationCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  description: z.string().max(500, "Description is too long").optional().or(z.literal("")),
  website: z.string().url("Invalid URL").max(200, "URL is too long").optional().or(z.literal("")),
  github: z.string().url("Invalid URL").max(200, "URL is too long").optional().or(z.literal("")),
  image: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const result = validateBase64MaxBytes(val, 1024 * 1024, "Organization image");
        return result.valid;
      },
      {
        message: "Organization image must be valid base64 and under 1MB",
      }
    ),
});

export type OrganizationCreateInput = z.infer<typeof organizationCreateSchema>;

// Organization update schema
export const organizationUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  description: z.string().max(500, "Description is too long").optional(),
  website: z.string().max(200, "URL is too long").optional().refine(
    (val) => !val || val === "" || z.string().url().safeParse(val).success,
    { message: "Invalid URL" }
  ),
  github: z.string().max(200, "URL is too long").optional().refine(
    (val) => !val || val === "" || z.string().url().safeParse(val).success,
    { message: "Invalid URL" }
  ),
});

export type OrganizationUpdateInput = z.infer<typeof organizationUpdateSchema>;

// Ticket status update schema (for organization owners)
export const ticketStatusUpdateSchema = z.object({
  status: z.enum(["open", "in-progress", "closed"], {
    required_error: "Status is required",
  }),
});

export type TicketStatusUpdateInput = z.infer<typeof ticketStatusUpdateSchema>;

// Reddit digest request schema
export const redditDigestRequestSchema = z.object({
  searchTerm: z.string().min(1, "Search term is required").max(200, "Search term is too long"),
  topN: z.number().int().min(1, "Must request at least 1 post").max(25, "Cannot request more than 25 posts"),
  timeRange: z.enum(["hour", "day", "week", "month", "year", "all"]),
});

export type RedditDigestRequestInput = z.infer<typeof redditDigestRequestSchema>;

// Reddit digest LLM response schema
export const redditDigestResponseSchema = z.object({
  bugs: z.array(z.string()).describe("List of bugs mentioned in the posts"),
  features: z.array(z.string()).describe("List of feature requests or ideas from the posts"),
  suggestions: z.array(z.string()).describe("List of general suggestions or improvements"),
  pros: z.array(z.string()).optional().describe("Positive feedback or things working well"),
  cons: z.array(z.string()).optional().describe("Negative feedback or pain points"),
  other: z.array(z.string()).optional().describe("Other notable feedback that doesn't fit above categories"),
});

export type RedditDigestResponseOutput = z.infer<typeof redditDigestResponseSchema>;

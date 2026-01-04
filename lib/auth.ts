import NextAuth, { NextAuthConfig, Session, User as NextAuthUser } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { JWT } from "next-auth/jwt";
import dbConnect from "@/lib/mongoose";
import User from "@/lib/models/User";
import { verifyPassword } from "@/lib/password";

/**
 * Extract first and last name from Google profile
 * Prefer given_name/family_name, otherwise split name
 */
function extractNames(profile: {
  given_name?: string;
  family_name?: string;
  name?: string;
}): { firstName?: string; lastName?: string } {
  if (profile.given_name || profile.family_name) {
    return {
      firstName: profile.given_name,
      lastName: profile.family_name,
    };
  }

  // Fallback: split name on space
  if (profile.name) {
    const parts = profile.name.trim().split(/\s+/);
    if (parts.length === 1) {
      return { firstName: parts[0] };
    }
    // Last part is lastName, rest is firstName
    const lastName = parts.pop();
    const firstName = parts.join(" ");
    return { firstName, lastName };
  }

  return {};
}

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async authorize(credentials): Promise<any> {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        await dbConnect();

        const user = await User.findOne({
          email: (credentials.email as string).toLowerCase(),
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await verifyPassword(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async signIn({ user, account, profile }: any) {
      // For OAuth providers, upsert user in database
      if (account?.provider === "google" && profile?.email) {
        await dbConnect();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { firstName, lastName } = extractNames(profile as any);

        const existingUser = await User.findOne({
          email: profile.email.toLowerCase(),
        });

        if (existingUser) {
          // Update existing user's names if they weren't set
          if (!existingUser.firstName && firstName) {
            existingUser.firstName = firstName;
          }
          if (!existingUser.lastName && lastName) {
            existingUser.lastName = lastName;
          }
          await existingUser.save();
          user.id = existingUser._id.toString();
          user.firstName = existingUser.firstName;
          user.lastName = existingUser.lastName;
        } else {
          // Create new user
          const newUser = await User.create({
            email: profile.email.toLowerCase(),
            firstName,
            lastName,
          });
          user.id = newUser._id.toString();
          user.firstName = newUser.firstName;
          user.lastName = newUser.lastName;
        }
      }

      return true;
    },
    async jwt({ token, user }: { token: JWT; user?: NextAuthUser }) {
      // On sign in, add user data to token
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      // Map token data to session
      if (token && session.user) {
        session.user.id = token.sub!;
        session.user.email = token.email!;
        session.user.firstName = token.firstName as string | undefined;
        session.user.lastName = token.lastName as string | undefined;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

// Extend NextAuth types
declare module "next-auth" {
  interface User {
    firstName?: string;
    lastName?: string;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    firstName?: string;
    lastName?: string;
  }
}

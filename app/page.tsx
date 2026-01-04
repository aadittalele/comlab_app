"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

interface Organization {
  id: string;
  name: string;
  createdBy: string;
}

interface Ticket {
  id: string;
  title: string;
  description?: string;
  votes: number;
  tag: string;
  reportedBy?: { name: string };
  createdAt: string;
}

//home page

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userOrgs, setUserOrgs] = useState<Organization[]>([]);
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  // Redirect unauthenticated users to landing page
  useEffect(() => {
    if (status === "unauthenticated") {
      // Show landing page content (handled below)
      setLoading(false);
    }
  }, [status]);

  const fetchDashboardData = useCallback(async () => {
    try {
      // Fetch organizations owned by user
      const orgsResponse = await fetch("/api/orgs");
      if (orgsResponse.ok) {
        const orgsData = await orgsResponse.json();
        // Filter organizations where user is the creator
        const ownedOrgs = orgsData.organizations.filter(
          (org: Organization) => org.createdBy === session?.user?.id
        );
        setUserOrgs(ownedOrgs);

        // If user owns organizations, fetch recent tickets for their orgs
        if (ownedOrgs.length > 0) {
          const ticketsPromises = ownedOrgs.map((org: Organization) =>
            fetch(`/api/tickets?organizationId=${org.id}`).then((res) =>
              res.json()
            )
          );
          const ticketsResponses = await Promise.all(ticketsPromises);
          const allTickets = ticketsResponses.flatMap((res) => res.tickets);
          // Sort by creation date and take top 3
          const sorted = allTickets.sort(
            (a: Ticket, b: Ticket) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime()
          );
          setRecentTickets(sorted.slice(0, 3));
        }
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchDashboardData();
    }
  }, [session, fetchDashboardData]);

  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  // Show dashboard for authenticated users
  if (session) {
    const isOwner = userOrgs.length > 0;

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome, {session.user.firstName || "User"}
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your organizations and tickets from your dashboard
            </p>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Explore Organizations */}
            <Link
              href="/orgs"
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center mb-2">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mr-3">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Explore Organizations
                </h3>
              </div>
              <p className="text-sm text-gray-600">
                Browse and discover organizations to follow and contribute to
              </p>
            </Link>

            {/* My Tickets */}
            <Link
              href="/tickets"
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center mb-2">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mr-3">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  My Tickets
                </h3>
              </div>
              <p className="text-sm text-gray-600">
                View and manage tickets you&apos;ve submitted as bugs, features,
                or feedback
              </p>
            </Link>

            {/* Reddit Digest */}
            <Link
              href="/reddit-digest"
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center mb-2">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center mr-3">
                  <svg
                    className="w-6 h-6 text-orange-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Reddit Digest
                </h3>
              </div>
              <p className="text-sm text-gray-600">
                Get AI-powered feedback summaries from Reddit posts about your product
              </p>
            </Link>

            {/* Create Organization - only show if user hasn't created one */}
            {!isOwner && (
              <Link
                href="/orgs"
                className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center mb-2">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center mr-3">
                    <svg
                      className="w-6 h-6 text-purple-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Create Organization
                  </h3>
                </div>
                <p className="text-sm text-gray-600">
                  Start your own organization to collect and manage feedback
                </p>
              </Link>
            )}
          </div>

          {/* Owner Section: Recent Tickets for My Organization */}
          {isOwner && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Recent Tickets for My Organization
                </h2>
                <Link
                  href={`/my-organization`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  View All →
                </Link>
              </div>

              {recentTickets.length > 0 ? (
                <div className="space-y-3">
                  {recentTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
                    >
                      <Link href={`/tickets/${ticket.id}`}>
                        <h4 className="font-semibold text-gray-900">
                          {ticket.title}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {ticket.description?.substring(0, 100)}
                          {(ticket.description?.length ?? 0) > 100 ? "..." : ""}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {ticket.tag}
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {ticket.votes || 0} votes
                          </span>
                          {ticket.reportedBy && (
                            <span className="text-xs text-gray-500">
                              by {ticket.reportedBy.name}
                            </span>
                          )}
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No recent tickets for your organization yet.</p>
                  <Link
                    href={`/orgs/${userOrgs[0].id}`}
                    className="text-blue-600 hover:text-blue-700 text-sm mt-2 inline-block"
                  >
                    Go to your organization
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Non-Owner: Placeholder */}
          {!isOwner && (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <p className="text-gray-600">
                You don&apos;t own any organizations yet. Create one to start
                managing feedback!
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show landing page for non-authenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <h1 className="text-5xl font-extrabold text-gray-900 sm:text-6xl md:text-7xl">
            ComLab
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-600">
            Community-driven product feedback and roadmap platform that turns
            unstructured discourse into actionable development insights.
          </p>
        </div>

        <div className="mt-16">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Features
          </h3>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Organize Feedback
              </h4>
              <p className="text-gray-600">
                Collect and categorize feature requests, bugs, and feedback in
                one place.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                  />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Community Voting
              </h4>
              <p className="text-gray-600">
                Let your community vote on what matters most to prioritize
                development.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                Track Progress
              </h4>
              <p className="text-gray-600">
                Monitor ticket status and keep your community informed on
                development.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


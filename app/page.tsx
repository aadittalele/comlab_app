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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  // Show dashboard for authenticated users
  if (session) {
    const isOwner = userOrgs.length > 0;

    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex justify-between items-end mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
              <p className="text-slate-500 mt-1">
                Welcome back, {session.user.firstName || "User"}
              </p>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Explore Organizations */}
            <Link
              href="/orgs"
              className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-md bg-blue-50 flex items-center justify-center mr-3 group-hover:bg-blue-100 transition-colors">
                  <svg
                    className="w-5 h-5 text-blue-600"
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
                <h3 className="text-base font-semibold text-slate-900">
                  Explore Organizations
                </h3>
              </div>
              <p className="text-sm text-slate-500">
                Browse and discover organizations to follow and contribute to.
              </p>
            </Link>

            {/* My Tickets */}
            <Link
              href="/tickets"
              className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-md bg-green-50 flex items-center justify-center mr-3 group-hover:bg-green-100 transition-colors">
                  <svg
                    className="w-5 h-5 text-green-600"
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
                <h3 className="text-base font-semibold text-slate-900">
                  My Tickets
                </h3>
              </div>
              <p className="text-sm text-slate-500">
                View and manage tickets you&apos;ve submitted as bugs or features.
              </p>
            </Link>

            {/* Reddit Digest */}
            <Link
              href="/reddit-digest"
              className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-md bg-orange-50 flex items-center justify-center mr-3 group-hover:bg-orange-100 transition-colors">
                  <svg
                    className="w-5 h-5 text-orange-600"
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
                <h3 className="text-base font-semibold text-slate-900">
                  Reddit Digest
                </h3>
              </div>
              <p className="text-sm text-slate-500">
                Get AI-powered feedback summaries from Reddit posts.
              </p>
            </Link>

            {/* Create Organization - only show if user hasn't created one */}
            {!isOwner && (
              <Link
                href="/orgs"
                className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 rounded-md bg-purple-50 flex items-center justify-center mr-3 group-hover:bg-purple-100 transition-colors">
                    <svg
                      className="w-5 h-5 text-purple-600"
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
                  <h3 className="text-base font-semibold text-slate-900">
                    Create Organization
                  </h3>
                </div>
                <p className="text-sm text-slate-500">
                  Start your own organization to collect and manage feedback.
                </p>
              </Link>
            )}
          </div>

          {/* Owner Section: Recent Tickets for My Organization */}
          {isOwner && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                <h2 className="font-semibold text-slate-900">
                  Recent Tickets
                </h2>
                <Link
                  href={`/my-organization`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  View All
                </Link>
              </div>

              {recentTickets.length > 0 ? (
                <div className="divide-y divide-slate-200">
                  {recentTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="p-4 hover:bg-slate-50 transition flex items-center justify-between group"
                    >
                      <Link href={`/tickets/${ticket.id}`} className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                              {ticket.title}
                            </h4>
                            <p className="text-sm text-slate-500 mt-1 line-clamp-1">
                              {ticket.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 ml-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                              {ticket.tag}
                            </span>
                            <span className="text-sm text-slate-500">
                              {ticket.votes || 0} votes
                            </span>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <p>No recent tickets found.</p>
                  <Link
                    href={`/orgs/${userOrgs[0].id}`}
                    className="text-blue-600 hover:text-blue-700 text-sm mt-2 inline-block font-medium"
                  >
                    Go to your organization
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Non-Owner: Placeholder */}
          {!isOwner && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8 text-center">
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-medium text-slate-900 mb-2">No Organization Found</h3>
                <p className="text-slate-500 mb-6">
                  You don&apos;t own any organizations yet. Create one to start
                  managing feedback!
                </p>
                <Link href="/orgs" className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                  Create Organization
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show landing page for non-authenticated users
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center lg:text-left lg:flex lg:items-center">
        <div className="lg:w-1/2">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
            Customer feedback, <span className="text-blue-600">simplified.</span>
          </h1>
          <p className="mt-4 text-xl text-slate-500 max-w-2xl mx-auto lg:mx-0">
            Turn community discourse into actionable product insights. The enterprise-grade platform for modern product teams.
          </p>
          <div className="mt-8 flex gap-4 justify-center lg:justify-start">
            <Link
              href="/api/auth/signin"
              className="rounded-md bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              Get Started Free
            </Link>
            <Link
              href="#features"
              className="rounded-md bg-white px-6 py-3 text-slate-700 font-medium border border-slate-300 hover:bg-slate-50 transition-colors shadow-sm"
            >
              Learn More
            </Link>
          </div>
        </div>
        <div className="hidden lg:block lg:w-1/2 pl-12">
          <div className="bg-slate-50 rounded-xl p-8 border border-slate-200 shadow-lg transform rotate-2 hover:rotate-0 transition-transform duration-500">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-4">
              <div className="h-4 w-1/3 bg-slate-200 rounded mb-2"></div>
              <div className="h-3 w-3/4 bg-slate-100 rounded"></div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-4">
              <div className="h-4 w-1/2 bg-slate-200 rounded mb-2"></div>
              <div className="h-3 w-full bg-slate-100 rounded"></div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <div className="h-4 w-2/3 bg-slate-200 rounded mb-2"></div>
              <div className="h-3 w-5/6 bg-slate-100 rounded"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="bg-slate-50 py-24 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Enterprise Features</h2>
            <p className="mt-4 text-lg text-slate-500">Everything you need to manage product feedback at scale.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg border border-slate-200 p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center mb-6">
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
              <h4 className="text-xl font-semibold text-slate-900 mb-3">
                Organize Feedback
              </h4>
              <p className="text-slate-500 leading-relaxed">
                Collect and categorize feature requests, bugs, and feedback in
                one centralized hub.
              </p>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center mb-6">
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
              <h4 className="text-xl font-semibold text-slate-900 mb-3">
                Community Voting
              </h4>
              <p className="text-slate-500 leading-relaxed">
                Empower your community to vote on what matters most to prioritize
                development effectively.
              </p>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center mb-6">
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
              <h4 className="text-xl font-semibold text-slate-900 mb-3">
                Track Progress
              </h4>
              <p className="text-slate-500 leading-relaxed">
                Monitor ticket status and keep your community informed on
                development milestones.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


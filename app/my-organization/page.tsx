"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Organization {
  id: string;
  name: string;
  description?: string;
  website?: string;
  github?: string;
  createdBy: string;
}

interface Ticket {
  id: string;
  title: string;
  description?: string;
  votes: number;
  priority: string;
  tag: string;
  status: string;
  reportedBy?: {
    name: string;
  };
  createdAt: string;
}

export default function MyOrganizationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    website: "",
    github: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sortBy, setSortBy] = useState("priority");
  const [triagingAll, setTriagingAll] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summary, setSummary] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchOrganizations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, router]);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch("/api/orgs");
      if (!response.ok) throw new Error("Failed to fetch organizations");
      const data = await response.json();

      // Filter organizations owned by current user
      const ownedOrgs = data.organizations.filter(
        (org: Organization) => org.createdBy === session?.user?.id
      );
      setOrganizations(ownedOrgs);

      if (ownedOrgs.length > 0) {
        const firstOrg = ownedOrgs[0];
        setSelectedOrg(firstOrg);
        setEditForm({
          name: firstOrg.name,
          description: firstOrg.description || "",
          website: firstOrg.website || "",
          github: firstOrg.github || "",
        });
        fetchTickets(firstOrg.id);
      } else {
        setLoading(false);
      }
    } catch {
      setError("Failed to load organizations");
      setLoading(false);
    }
  };

  const fetchTickets = async (orgId: string) => {
    try {
      const params = new URLSearchParams({ organizationId: orgId });
      if (searchQuery) params.append("q", searchQuery);
      if (typeFilter) params.append("type", typeFilter);
      if (sortBy) params.append("sort", sortBy);

      const response = await fetch(`/api/tickets?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch tickets");
      const data = await response.json();
      setTickets(data.tickets);
    } catch {
      setError("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOrganization = async () => {
    if (!selectedOrg) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/orgs/${selectedOrg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update organization");
      }

      const { organization } = await response.json();
      setSelectedOrg(organization);
      setOrganizations(
        organizations.map((org) =>
          org.id === organization.id ? organization : org
        )
      );
      setEditMode(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleTriageAll = async () => {
    if (!selectedOrg) return;

    setTriagingAll(true);
    setError("");

    try {
      const response = await fetch(`/api/orgs/${selectedOrg.id}/triage`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to triage tickets");
      }

      const { updatedCount } = await response.json();

      // Re-fetch tickets to show updated priorities
      await fetchTickets(selectedOrg.id);

      // Show success (optional - could add a success toast/notification here)
      if (updatedCount === 0) {
        setError("No tickets were updated");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Triage failed");
    } finally {
      setTriagingAll(false);
    }
  };

  const handleSummarizeTickets = async () => {
    if (!selectedOrg) return;

    setLoadingSummary(true);
    setError("");
    setShowSummaryModal(true);
    setSummary("");

    try {
      const response = await fetch(`/api/orgs/${selectedOrg.id}/summary`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate summary");
      }

      const { summary: summaryText } = await response.json();
      setSummary(summaryText);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Summary generation failed");
      setSummary("Failed to generate summary. Please try again.");
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleSearch = () => {
    if (selectedOrg) {
      fetchTickets(selectedOrg.id);
    }
  };

  // Re-fetch when filters change
  useEffect(() => {
    if (selectedOrg) {
      fetchTickets(selectedOrg.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, typeFilter]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (organizations.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            My Organization
          </h1>
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No organizations
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              You don&apos;t own any organizations yet. Create one to get started!
            </p>
            <div className="mt-6">
              <Link
                href="/orgs"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Create Organization
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          My Organization
        </h1>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Organization Details */}
        {selectedOrg && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedOrg.name}
                </h2>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/reddit-digest"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <svg
                    className="w-4 h-4 mr-2"
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
                  Reddit Digest
                </Link>
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Edit
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setEditMode(false);
                        setEditForm({
                          name: selectedOrg.name,
                          description: selectedOrg.description || "",
                          website: selectedOrg.website || "",
                          github: selectedOrg.github || "",
                        });
                      }}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveOrganization}
                      disabled={saving}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </>
                )}
              </div>
            </div>

            {editMode ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Organization Name *
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm({ ...editForm, description: e.target.value })
                    }
                    rows={3}
                    placeholder="A brief description of your organization"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Website
                  </label>
                  <input
                    type="url"
                    value={editForm.website}
                    onChange={(e) =>
                      setEditForm({ ...editForm, website: e.target.value })
                    }
                    placeholder="https://example.com"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    GitHub
                  </label>
                  <input
                    type="url"
                    value={editForm.github}
                    onChange={(e) =>
                      setEditForm({ ...editForm, github: e.target.value })
                    }
                    placeholder="https://github.com/username/repo"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedOrg.description && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Description</p>
                    <p className="text-gray-900">{selectedOrg.description}</p>
                  </div>
                )}
                {selectedOrg.website && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Website</p>
                    <a
                      href={selectedOrg.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      {selectedOrg.website}
                    </a>
                  </div>
                )}
                {selectedOrg.github && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">GitHub</p>
                    <a
                      href={selectedOrg.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      {selectedOrg.github}
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tickets List */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              All Tickets ({tickets.length})
            </h3>
            {tickets.length > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={handleSummarizeTickets}
                  disabled={loadingSummary}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingSummary ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Generating...
                    </>
                  ) : (
                    "Summarize Tickets"
                  )}
                </button>
                <button
                  onClick={handleTriageAll}
                  disabled={triagingAll}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {triagingAll ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Triaging All...
                    </>
                  ) : (
                    "Triage All Tickets"
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Search and Filter Controls */}
          <div className="mb-6 space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search tickets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                />
              </div>
              <button
                onClick={handleSearch}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Search
              </button>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Filter by Type
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                >
                  <option value="">All Types</option>
                  <option value="bug">Bug</option>
                  <option value="feature">Feature</option>
                  <option value="tweak">Tweak</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                >
                  <option value="newest">Newest</option>
                  <option value="priority">Priority</option>
                  <option value="mostVoted">Most Voted</option>
                </select>
              </div>
            </div>
          </div>

          {tickets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No tickets found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex justify-between items-start gap-4">
                    <Link href={`/tickets/${ticket.id}`} className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-semibold text-gray-900">
                          {ticket.title}
                        </h4>
                        <div className="flex gap-2">
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {ticket.votes} votes
                          </span>
                        </div>
                      </div>
                      {ticket.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {ticket.description.substring(0, 150)}
                          {ticket.description.length > 150 ? "..." : ""}
                        </p>
                      )}
                      <div className="flex gap-2 mt-2 items-center flex-wrap">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {ticket.tag}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            ticket.priority === "high"
                              ? "bg-red-100 text-red-800"
                              : ticket.priority === "medium"
                              ? "bg-orange-100 text-orange-800"
                              : ticket.priority === "low"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {ticket.priority}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          {ticket.status}
                        </span>
                        {ticket.reportedBy && (
                          <span className="text-xs text-gray-500">
                            by {ticket.reportedBy.name}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {new Date(ticket.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                Ticket Summary
              </h2>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
                aria-label="Close modal"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {loadingSummary ? (
                <div className="flex items-center justify-center py-12">
                  <svg
                    className="animate-spin h-8 w-8 text-gray-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span className="ml-3 text-gray-600">Generating summary...</span>
                </div>
              ) : (
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap text-gray-800">
                    {summary}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

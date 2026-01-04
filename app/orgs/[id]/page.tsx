"use client";

import { useState, useEffect, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface Organization {
  id: string;
  name: string;
  description?: string;
  website?: string;
  github?: string;
  image?: string;
  createdBy: string;
  createdAt: string;
}

interface Ticket {
  id: string;
  title: string;
  description: string;
  votes: number;
  priority: "none" | "low" | "medium" | "high";
  status: "open" | "in-progress" | "closed";
  tag: "bug" | "tweak" | "feature";
  reportedBy: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  voted?: boolean; // Track if current user has voted
}

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const id = params.id as string;
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image: "",
    priority: "none" as "none" | "low" | "medium" | "high",
    tag: "bug" as "bug" | "tweak" | "feature",
  });
  const [submitting, setSubmitting] = useState(false);
  const [votingTickets, setVotingTickets] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchOrganization();
    fetchTickets();
  }, [id]);

  const fetchOrganization = async () => {
    try {
      const response = await fetch(`/api/orgs/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Organization not found");
        }
        throw new Error("Failed to fetch organization");
      }
      const data = await response.json();
      setOrganization(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchTickets = async () => {
    try {
      const response = await fetch(`/api/tickets?organizationId=${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch tickets");
      }
      const data = await response.json();
      setTickets(data.tickets);
    } catch (err) {
      console.error("Error fetching tickets:", err);
    } finally {
      setTicketsLoading(false);
    }
  };

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (status !== "authenticated") {
      router.push("/login");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          organizationId: id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create ticket");
      }

      const { ticket } = await response.json();
      setTickets([ticket, ...tickets]);
      setFormData({
        title: "",
        description: "",
        image: "",
        priority: "none",
        tag: "bug",
      });
      setShowCreateForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (5MB = 5242880 bytes)
    if (file.size > 5242880) {
      setError("Image must be under 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Extract raw base64 (remove data:image/...;base64, prefix)
      const base64Data = base64.split(",")[1] || "";
      setFormData({ ...formData, image: base64Data });
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-green-100 text-green-800";
      case "in-progress":
        return "bg-purple-100 text-purple-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTagColor = (tag: string) => {
    switch (tag) {
      case "bug":
        return "bg-red-100 text-red-800";
      case "feature":
        return "bg-blue-100 text-blue-800";
      case "tweak":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleVote = async (ticketId: string) => {
    if (status !== "authenticated") {
      router.push("/login");
      return;
    }

    // Prevent double-clicking
    if (votingTickets.has(ticketId)) return;

    setVotingTickets((prev) => new Set(prev).add(ticketId));

    try {
      const response = await fetch(`/api/tickets/${ticketId}/vote`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to toggle vote");
      }

      const { voted, votes } = await response.json();

      // Update ticket in state
      setTickets((prevTickets) =>
        prevTickets.map((ticket) =>
          ticket.id === ticketId
            ? { ...ticket, votes, voted }
            : ticket
        )
      );
    } catch (err) {
      console.error("Error toggling vote:", err);
      setError("Failed to toggle vote. Please try again.");
    } finally {
      setVotingTickets((prev) => {
        const next = new Set(prev);
        next.delete(ticketId);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (error || !organization) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4">
            <Link
              href="/orgs"
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              ← Back to Organizations
            </Link>
          </div>
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Navigation */}
        <div className="mb-6">
          <Link
            href="/orgs"
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            ← Back to Organizations
          </Link>
        </div>

        {/* Organization Header */}
        <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
          <div className="px-6 py-8">
            <div className="flex items-start gap-6">
              {organization.image && (
                <div className="flex-shrink-0">
                  <img
                    src={`data:image/png;base64,${organization.image}`}
                    alt={organization.name}
                    className="h-24 w-24 rounded-lg object-cover border border-gray-200"
                  />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-gray-900">
                    {organization.name}
                  </h1>
                  {session?.user?.id === organization.createdBy && (
                    <Link
                      href="/my-organization"
                      className="inline-flex items-center px-3 py-1 border border-blue-600 rounded-md text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100"
                    >
                      Owner • Manage
                    </Link>
                  )}
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Created on{" "}
                  {new Date(organization.createdAt).toLocaleDateString()}
                </p>
                {organization.description && (
                  <p className="mt-3 text-gray-700">
                    {organization.description}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-3">
                  {organization.website && (
                    <a
                      href={organization.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      🌐 Visit Website
                    </a>
                  )}
                  {organization.github && (
                    <a
                      href={organization.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      🔗 View GitHub
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Create Ticket Button/Form */}
        <div className="mb-6">
          {!showCreateForm ? (
            <button
              onClick={() => {
                if (status !== "authenticated") {
                  router.push("/login");
                  return;
                }
                setShowCreateForm(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              + Create Ticket
            </button>
          ) : (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">
                  Create Ticket
                </h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {error && (
                <div className="mb-4 rounded-md bg-red-50 p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="title"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    id="title"
                    required
                    value={formData.title}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Description *
                  </label>
                  <textarea
                    name="description"
                    id="description"
                    required
                    rows={4}
                    value={formData.description}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="tag"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Tag *
                    </label>
                    <select
                      name="tag"
                      id="tag"
                      required
                      value={formData.tag}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    >
                      <option value="bug">Bug</option>
                      <option value="feature">Feature</option>
                      <option value="tweak">Tweak</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="priority"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Priority
                    </label>
                    <select
                      name="priority"
                      id="priority"
                      value={formData.priority}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    >
                      <option value="none">None</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="image"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Image (optional, max 5MB)
                  </label>
                  <input
                    type="file"
                    id="image"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {submitting ? "Creating..." : "Create Ticket"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Tickets Section */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Tickets</h2>
          </div>
          {ticketsLoading ? (
            <div className="px-6 py-8 text-center text-gray-500">
              Loading tickets...
            </div>
          ) : tickets.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No tickets yet. Be the first to create one!
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {tickets.map((ticket) => (
                <li key={ticket.id} className="hover:bg-gray-50">
                  <div className="flex justify-between items-start gap-4 px-6 py-4">
                    <Link 
                      href={`/tickets/${ticket.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-medium text-gray-900 hover:text-blue-600">
                          {ticket.title}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTagColor(
                            ticket.tag
                          )}`}
                        >
                          {ticket.tag}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {ticket.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded font-medium ${getStatusColor(
                            ticket.status
                          )}`}
                        >
                          {ticket.status}
                        </span>
                        {ticket.priority !== "none" && (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded font-medium ${getPriorityColor(
                              ticket.priority
                            )}`}
                          >
                            {ticket.priority} priority
                          </span>
                        )}
                        <span>
                          Reported by{" "}
                          {ticket.reportedBy?.name || "Unknown"}
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </Link>
                    <div className="flex flex-col items-center gap-1">
                      <button
                        onClick={() => handleVote(ticket.id)}
                        disabled={votingTickets.has(ticket.id)}
                        className={`flex items-center gap-1 px-3 py-1 text-sm border rounded-md transition ${
                          ticket.voted
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-300 hover:bg-gray-50"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <span>{ticket.voted ? "👍" : "👍"}</span>
                        <span className="font-medium">{ticket.votes}</span>
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Organization {
  id: string;
  name: string;
  description?: string;
  website?: string;
  github?: string;
  createdAt: string;
}

export default function OrganizationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [canCreateOrg, setCanCreateOrg] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    website: "",
    github: "",
    image: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    const checkUserOrganization = async () => {
      if (status === "authenticated" && session?.user?.id) {
        try {
          const response = await fetch(`/api/orgs?createdBy=${session.user.id}`);
          if (response.ok) {
            const data = await response.json();
            setCanCreateOrg(data.organizations.length === 0);
          }
        } catch (error) {
          console.error("Error checking user organization:", error);
        }
      }
    };
    checkUserOrganization();
  }, [status, session]);

  const fetchOrganizations = async (query = "") => {
    setLoading(true);
    try {
      const url = query
        ? `/api/orgs?q=${encodeURIComponent(query)}&limit=20`
        : "/api/orgs?limit=20";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch organizations");
      const data = await response.json();
      setOrganizations(data.organizations);
    } catch {
      setError("Failed to load organizations");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    fetchOrganizations(searchQuery);
  };

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (status !== "authenticated") {
      setError("You must be logged in to create an organization");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create organization");
      }

      const org = await response.json();
      setOrganizations([org, ...organizations]);
      setFormData({ name: "", description: "", website: "", github: "", image: "" });
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

    // Check file size (1MB = 1048576 bytes)
    if (file.size > 1048576) {
      setError("Image must be under 1MB");
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Organizations</h1>
            <p className="mt-2 text-sm text-gray-600">
              Search for organizations or create your own
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            ← Back to Home
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Search Form */}
        <div className="mb-6 bg-white shadow rounded-lg p-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search organizations..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </form>
        </div>

        {/* Create Organization Button/Form */}
        <div className="mb-6">
          {!showCreateForm ? (
            canCreateOrg && (
              <button
                onClick={() => {
                  if (status !== "authenticated") {
                    router.push("/login");
                    return;
                  }
                  setShowCreateForm(true);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                + Create Organization
              </button>
            )
          ) : (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">
                  Create Organization
                </h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Description (optional)
                  </label>
                  <textarea
                    name="description"
                    id="description"
                    rows={3}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="A brief description of your organization"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="website"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Website (optional)
                  </label>
                  <input
                    type="url"
                    name="website"
                    id="website"
                    value={formData.website}
                    onChange={handleChange}
                    placeholder="https://example.com"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="github"
                    className="block text-sm font-medium text-gray-700"
                  >
                    GitHub (optional)
                  </label>
                  <input
                    type="url"
                    name="github"
                    id="github"
                    value={formData.github}
                    onChange={handleChange}
                    placeholder="https://github.com/organization"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="image"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Image (optional, max 1MB)
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
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {submitting ? "Creating..." : "Create"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Organizations List */}
        <h2 className="text-lg font-medium text-gray-900 mb-2">
          {searchQuery
            ? `Search Results for "${searchQuery}"`
            : "Organizations"}
        </h2>
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {loading && organizations.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              Loading...
            </div>
          ) : organizations.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No organizations found
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {organizations.map((org) => (
                <li key={org.id}>
                  <Link
                    href={`/orgs/${org.id}`}
                    className="block px-6 py-4 hover:bg-gray-50 transition"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">
                          {org.name}
                        </h3>
                        <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-500">
                          {org.website && (
                            <span className="flex items-center">
                              🌐 Website
                            </span>
                          )}
                          {org.github && (
                            <span className="flex items-center">
                              🔗 GitHub
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(org.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Organization {
  id: string;
  name: string;
  createdBy: string;
}

interface DigestSummary {
  bugs: string[];
  features: string[];
  suggestions: string[];
  pros?: string[];
  cons?: string[];
  other?: string[];
}

export default function RedditDigestPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [topN, setTopN] = useState(3);
  const [timeRange, setTimeRange] = useState<'hour' | 'day' | 'week' | 'month' | 'year' | 'all'>('day');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DigestSummary | null>(null);

  // Fetch user's organization to prefill search term
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user?.id) {
      fetchUserOrganization();
    }
  }, [status, session]);

  const fetchUserOrganization = async () => {
    try {
      const response = await fetch('/api/orgs');
      if (response.ok) {
        const data = await response.json();
        const ownedOrgs = data.organizations.filter(
          (org: Organization) => org.createdBy === session?.user?.id
        );

        // Only prefill if search term is empty to avoid overwriting user input
        if (ownedOrgs.length > 0 && searchTerm === '') {
          setSearchTerm(ownedOrgs[0].name);
        }
      }
    } catch (err) {
      console.error('Failed to fetch organization:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSummary(null);

    try {
      const response = await fetch('/api/reddit/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchTerm,
          topN,
          timeRange,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate digest');
      }

      const data = await response.json();
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Reddit Digest</h1>
          <p className="text-gray-600 mt-1">
            Analyze Reddit posts and get AI-powered feedback summaries
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="searchTerm" className="block text-sm font-medium text-gray-700 mb-2">
                Search Term
              </label>
              <input
                id="searchTerm"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., your product name"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="topN" className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Posts
                </label>
                <input
                  id="topN"
                  type="number"
                  min={1}
                  max={25}
                  value={topN}
                  onChange={(e) => setTopN(Number(e.target.value) || 1)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="timeRange" className="block text-sm font-medium text-gray-700 mb-2">
                  Time Range
                </label>
                <select
                  id="timeRange"
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="hour">Past Hour</option>
                  <option value="day">Past Day</option>
                  <option value="week">Past Week</option>
                  <option value="month">Past Month</option>
                  <option value="year">Past Year</option>
                  <option value="all">All Time</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Generating Digest...' : 'Generate Digest'}
            </button>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Summary Results */}
        {summary && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Feedback Summary</h2>

            {/* No Results Message */}
            {summary.bugs.length === 0 &&
              summary.features.length === 0 &&
              summary.suggestions.length === 0 &&
              (!summary.pros || summary.pros.length === 0) &&
              (!summary.cons || summary.cons.length === 0) &&
              (!summary.other || summary.other.length === 0) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-yellow-400 mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                    No Relevant Feedback Found
                  </h3>
                  <p className="text-yellow-700">
                    The Reddit posts for the search term didn&apos;t contain any actionable feedback in the searched time range.
                    Try adjusting your search term or expanding the time range.
                  </p>
                </div>
              )}

            {/* Bugs */}
            {summary.bugs.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-semibold text-red-600 mb-4 flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Bugs
                </h3>
                <ul className="space-y-2">
                  {summary.bugs.map((bug, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-red-600 mr-2">•</span>
                      <span className="text-gray-700">{bug}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Features */}
            {summary.features.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-semibold text-green-600 mb-4 flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Feature Requests
                </h3>
                <ul className="space-y-2">
                  {summary.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-green-600 mr-2">•</span>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggestions */}
            {summary.suggestions.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-semibold text-blue-600 mb-4 flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Suggestions
                </h3>
                <ul className="space-y-2">
                  {summary.suggestions.map((suggestion, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span className="text-gray-700">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pros (Optional) */}
            {summary.pros && summary.pros.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-semibold text-purple-600 mb-4 flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                  </svg>
                  Pros
                </h3>
                <ul className="space-y-2">
                  {summary.pros.map((pro, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-purple-600 mr-2">•</span>
                      <span className="text-gray-700">{pro}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Cons (Optional) */}
            {summary.cons && summary.cons.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-semibold text-orange-600 mb-4 flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                  </svg>
                  Cons
                </h3>
                <ul className="space-y-2">
                  {summary.cons.map((con, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-orange-600 mr-2">•</span>
                      <span className="text-gray-700">{con}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Other (Optional) */}
            {summary.other && summary.other.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-semibold text-gray-600 mb-4 flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  Other Feedback
                </h3>
                <ul className="space-y-2">
                  {summary.other.map((item, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-gray-600 mr-2">•</span>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

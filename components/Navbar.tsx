"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";

export default function Navbar() {
  const { data: session, status } = useSession();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    };

    if (showProfileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfileMenu]);

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left: ComLab Logo/Brand */}
          <div className="flex-shrink-0">
            <Link
              href="/"
              className="text-2xl font-bold text-blue-600 hover:text-blue-700"
            >
              ComLab
            </Link>
          </div>

          {/* Center: Nav Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className="text-gray-700 hover:text-blue-600 font-medium"
            >
              Dashboard
            </Link>
            <Link
              href="/orgs"
              className="text-gray-700 hover:text-blue-600 font-medium"
            >
              Explore
            </Link>
            <Link
              href="/tickets"
              className="text-gray-700 hover:text-blue-600 font-medium"
            >
              My Tickets
            </Link>
            {session && (
              <Link
                href="/my-organization"
                className="text-gray-700 hover:text-blue-600 font-medium"
              >
                My Organization
              </Link>
            )}
          </div>

          {/* Right: User Profile or Auth Buttons */}
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {showMobileMenu ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>

            {status === "loading" ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : session ? (
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center space-x-3 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1"
                >
                  <span className="text-sm font-medium text-gray-700">
                    {session.user.firstName || session.user.email}
                  </span>
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                    {(session.user.firstName?.[0] ||
                      session.user.email?.[0] ||
                      "U"
                    ).toUpperCase()}
                  </div>
                </button>

                {/* Profile Dropdown Menu */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                      <div className="font-medium">
                        {session.user.firstName} {session.user.lastName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {session.user.email}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        signOut({ callbackUrl: "/" });
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                    >
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-blue-600 font-medium"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-3">
              <Link
                href="/"
                onClick={() => setShowMobileMenu(false)}
                className="text-gray-700 hover:text-blue-600 font-medium px-2 py-2 rounded-md hover:bg-gray-50"
              >
                Dashboard
              </Link>
              <Link
                href="/orgs"
                onClick={() => setShowMobileMenu(false)}
                className="text-gray-700 hover:text-blue-600 font-medium px-2 py-2 rounded-md hover:bg-gray-50"
              >
                Explore
              </Link>
              <Link
                href="/tickets"
                onClick={() => setShowMobileMenu(false)}
                className="text-gray-700 hover:text-blue-600 font-medium px-2 py-2 rounded-md hover:bg-gray-50"
              >
                My Tickets
              </Link>
              {session && (
                <Link
                  href="/my-organization"
                  onClick={() => setShowMobileMenu(false)}
                  className="text-gray-700 hover:text-blue-600 font-medium px-2 py-2 rounded-md hover:bg-gray-50"
                >
                  My Organization
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

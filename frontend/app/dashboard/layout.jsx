"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../../components/AuthProvider";
import NavBar from "../../components/NavBar";
export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const { user, loading, error } = useAuth();

  useEffect(() => {
    // Handle authentication and MFA requirements
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!user.mfaEnabled && pathname !== "/mfa-setup") {
      router.replace("/mfa-setup");
      return;
    }

    setReady(true);
  }, [loading, user, pathname, router]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500">
        {error.message || "An error occurred"}
      </div>
    );
  }

  // Don't render until ready
  if (!ready) return null;

  return (
    <section className="max-w-6xl mx-auto p-6">
      <NavBar user={user} />
      {children}
    </section>
  );
}

"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      // Store the prep_token provided by WBL
      localStorage.setItem("session_id", token);
      
      // Redirect to the dashboard
      router.push("/dashboard");
    } else {
      // If no token is provided, see if they already have one
      const existingToken = localStorage.getItem("session_id");
      if (existingToken) {
        router.push("/dashboard");
      } else {
        // Otherwise, send them back or show an error
        console.error("No authentication token provided");
      }
    }
  }, [router, searchParams]);

  return null;
}

export default function AuthGuard() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-[#0A0A0A]">
      <Suspense fallback={null}>
        <AuthContent />
      </Suspense>
      <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Authenticating...</h1>
      <p className="text-gray-500 dark:text-gray-400 mt-2">Please wait while we set up your session.</p>
    </div>
  );
}

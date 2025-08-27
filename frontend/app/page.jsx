"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getProfile } from "../lib/api";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        // if no token, go to login
        const token = localStorage.getItem("accessToken");
        if (!token) {
          router.replace("/login");
          return;
        }

        // validate token by trying to get profile
        const profile = await getProfile();
        if (!profile) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          router.replace("/login");
          return;
        }

        // token works - go to dashboard or mfa-setup based on profile
        if (!profile.mfaEnabled) {
          router.replace("/mfa-setup");
        } else {
          router.replace("/dashboard");
        }
      } catch (e) {
        // on any error (401, 428, network), clear tokens and go to login
        try {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
        } catch (e) {}
        router.replace("/login");
      }
    })();
  }, [router]);

  return null;
}

"use client";
import Link from "next/link";
import { AppBar, Toolbar, Button, Box } from "@mui/material";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(
      decodeURIComponent(
        [...json]
          .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
          .join("")
      )
    );
  } catch {
    return null;
  }
}

export default function NavBar() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);

  const updateAuthState = () => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("accessToken")
        : null;
    if (token) {
      setIsAuthenticated(true);
      const payload = parseJwt(token);
      setUserRole(payload?.role ?? null);
    } else {
      setIsAuthenticated(false);
      setUserRole(null);
    }
  };

  useEffect(() => {
    updateAuthState(); // initial
    const onChange = () => updateAuthState();
    window.addEventListener("storage", onChange); // other tabs
    window.addEventListener("auth:changed", onChange); // same tab custom event
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("auth:changed", onChange);
    };
  }, []);

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    window.dispatchEvent(new Event("auth:changed"));
    router.push("/login");
  };

  const isAdmin = userRole === "superadmin" || userRole === "tenant_admin";

  return (
    <AppBar position="static" color="inherit" elevation={0}>
      <Toolbar className="max-w-6xl w-full mx-auto">
        <Box className="flex gap-3">
          <Button component={Link} href="/" color="primary">
            Home
          </Button>

          {isAuthenticated ? (
            <>
              <Button component={Link} href="/dashboard/users" color="primary">
                Users
              </Button>
              <Button
                component={Link}
                href="/dashboard/profile"
                color="primary"
              >
                Profile
              </Button>
              <Button component={Link} href="/dashboard/upload" color="primary">
                Upload
              </Button>
              {isAdmin && (
                <Button
                  component={Link}
                  href="/dashboard/error-logs"
                  color="primary"
                >
                  Error Logs
                </Button>
              )}
              <Button onClick={logout} color="primary">
                Logout
              </Button>
            </>
          ) : (
            <Button component={Link} href="/login" color="primary">
              Login
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}

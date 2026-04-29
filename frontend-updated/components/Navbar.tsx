"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, User, Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { useState, useEffect } from "react";

interface NavbarProps {
  candidateName?: string;
  onLogout?: () => void;
}

export default function Navbar({ candidateName, onLogout }: NavbarProps) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const initialTheme = savedTheme || "dark";
    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const navItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Progress", href: "/progress" },
  ];

  return (
    <nav
      style={{
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-primary)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div style={{
        maxWidth: "1280px",
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 24px",
        gap: "32px",
      }}>
        {/* LEFT: Logo + Theme Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <Link
            href="/dashboard"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "linear-gradient(135deg, #4f46e5, #6366f1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{
                color: "white",
                fontWeight: 700,
                fontSize: 18,
              }}>W</span>
            </div>

            <span
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 700,
                fontSize: 18,
                color: "var(--text-primary)",
              }}
            >
              WBL <span style={{ color: "var(--accent)" }}>PrepHub</span>
            </span>
          </Link>

          {/* Theme Toggle */}
          {mounted && (
            <button
              onClick={toggleTheme}
              title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-secondary)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                const target = e.currentTarget as HTMLButtonElement;
                target.style.background = "var(--bg-tertiary)";
                target.style.color = "var(--accent)";
              }}
              onMouseLeave={(e) => {
                const target = e.currentTarget as HTMLButtonElement;
                target.style.background = "var(--bg-secondary)";
                target.style.color = "var(--text-secondary)";
              }}
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          )}
        </div>

        {/* CENTER: Navigation Tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: 32, flex: 1 }}>
          {navItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  position: "relative",
                  padding: "4px 0",
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: "none",
                  color: active ? "var(--text-primary)" : "var(--text-secondary)",
                  transition: "color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                  }
                }}
              >
                {item.label}

                {/* Active underline */}
                {active && (
                  <motion.div
                    layoutId="navbar-active"
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: -4,
                      height: 2,
                      borderRadius: 2,
                      background: "linear-gradient(90deg, #4f46e5, #6366f1)",
                    }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* RIGHT: User + Logout */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          {candidateName && (
            <span
              style={{
                color: "var(--text-secondary)",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {candidateName}
            </span>
          )}

          <div className="badge badge-accent">
            <User size={13} /> Active
          </div>

          <button
            className="btn-secondary"
            onClick={() => {
              const loginSource = localStorage.getItem("login_source");
              localStorage.removeItem("session_id");
              localStorage.removeItem("candidate_name");
              localStorage.removeItem("openai_key");
              localStorage.removeItem("login_source");
              
              if (loginSource === "sso") {
                const wblUrl = process.env.NEXT_PUBLIC_WBL_URL || "https://whitebox-learning.com/user_dashboard";
                // If wblUrl already ends with /user_dashboard, don't append it again
                window.location.href = wblUrl.endsWith('/user_dashboard') ? wblUrl : `${wblUrl}/user_dashboard`;
              } else {
                window.location.href = "/";
              }
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              fontSize: 13,
              borderRadius: 8,
            }}
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

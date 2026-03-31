import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "AI Prep Platform — Interview Preparation Powered by AI",
  description:
    "Upload your resume, connect your AI key, and get AI-generated case studies, interview questions, and evaluated intro practice. Become interview-ready.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#16161f",
              color: "#f0f0ff",
              border: "1px solid rgba(139,92,246,0.3)",
              borderRadius: "12px",
              fontFamily: "'Inter', sans-serif",
            },
            success: {
              iconTheme: { primary: "#10b981", secondary: "#16161f" },
            },
            error: {
              iconTheme: { primary: "#ef4444", secondary: "#16161f" },
            },
          }}
        />
      </body>
    </html>
  );
}

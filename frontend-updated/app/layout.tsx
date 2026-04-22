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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme') || 'dark';
                document.documentElement.setAttribute('data-theme', theme);
              })();
            `,
          }}
        />
      </head>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "var(--bg-tertiary)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-accent)",
              borderRadius: "12px",
              fontFamily: "'Inter', sans-serif",
            },
            success: {
              iconTheme: { primary: "var(--success)", secondary: "var(--bg-tertiary)" },
            },
            error: {
              iconTheme: { primary: "var(--danger)", secondary: "var(--bg-tertiary)" },
            },
          }}
        />
      </body>
    </html>
  );
}

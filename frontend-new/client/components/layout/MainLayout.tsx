import React, { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { motion } from "framer-motion";

interface MainLayoutProps {
  children: ReactNode;
  readiness?: number;
}

export function MainLayout({ children, readiness }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <TopNav readiness={readiness} />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="ml-80 mt-16 p-6 min-h-[calc(100vh-4rem)] bg-gradient-to-br from-background via-background to-card/20"
      >
        {children}
      </motion.main>
    </div>
  );
}

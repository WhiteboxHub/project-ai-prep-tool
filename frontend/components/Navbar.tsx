// // "use client";

// // import Link from "next/link";
// // import { usePathname } from "next/navigation";
// // import { Settings } from "lucide-react";
// // import { motion } from "framer-motion";
// // import clsx from "clsx";

// // export default function Navbar() {
// //   const pathname = usePathname();

// //   const navItems = [
// //     { label: "Dashboard", href: "/dashboard" },
// //     { label: "Mock", href: "/mock" },
// //     { label: "Progress", href: "/progress" },
// //   ];

// //   return (
// //     <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-[rgba(10,10,15,0.7)] border-b border-[var(--border)]">
      
// //       <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

// //         {/* Logo */}
// //         <Link href="/dashboard" className="flex items-center gap-3 group">
// //           <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg">
// //             <span className="text-white font-bold text-sm">W</span>
// //           </div>
// //           <span className="text-lg font-bold font-[var(--font-outfit)] tracking-tight">
// //             WBL <span className="text-[var(--accent-light)]">PrepHub</span>
// //           </span>
// //         </Link>

// //         {/* Nav */}
// //         <nav className="hidden md:flex items-center gap-6 relative">
// //           {navItems.map((item) => {
// //             const active = pathname === item.href;

// //             return (
// //               <Link
// //                 key={item.href}
// //                 href={item.href}
// //                 className="relative px-3 py-2 text-sm font-medium"
// //               >
// //                 <span
// //                   className={clsx(
// //                     "transition-colors",
// //                     active
// //                       ? "text-white"
// //                       : "text-[var(--text-secondary)] hover:text-white"
// //                   )}
// //                 >
// //                   {item.label}
// //                 </span>

// //                 {/* Active underline animation */}
// //                 {active && (
// //                   <motion.div
// //                     layoutId="navbar-active"
// //                     className="absolute left-0 right-0 -bottom-1 h-[2px] bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full"
// //                   />
// //                 )}
// //               </Link>
// //             );
// //           })}
// //         </nav>

// //         {/* Right */}
// //         <div className="flex items-center gap-3">

// //           {/* Settings */}
// //           <Link href="/setup">
// //             <div className="p-2 rounded-xl border border-[var(--border)] bg-[var(--bg-glass)] hover:border-[var(--accent)] transition cursor-pointer">
// //               <Settings size={18} />
// //             </div>
// //           </Link>

// //           {/* Avatar */}
// //           <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-indigo-500 flex items-center justify-center text-sm font-semibold text-white shadow-md">
// //             U
// //           </div>
// //         </div>

// //       </div>
// //     </header>
// //   );
// // }

// "use client";

// import Link from "next/link";
// import { LogOut, User } from "lucide-react";

// interface NavbarProps {
//   candidateName?: string;
//   onLogout?: () => void;
// }

// export default function Navbar({ candidateName, onLogout }: NavbarProps) {
//   return (
//     <nav
//       style={{
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "space-between",
//         padding: "20px 48px",
//         borderBottom: "1px solid var(--border)",
//       }}
//     >
//       {/* Logo */}
//       <Link
//         href="/"
//         style={{
//           display: "flex",
//           alignItems: "center",
//           gap: 10,
//           textDecoration: "none",
//         }}
//       >
//         <div
//           style={{
//             width: 36,
//             height: 36,
//             borderRadius: 10,
//             background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//           }}
//         >
//           <img
//             src="/logo.png"
//             alt="WBL Logo"
//             style={{ width: 22, height: 22, objectFit: "contain" }}
//           />
//         </div>

//         <span
//           style={{
//             fontFamily: "'Outfit', sans-serif",
//             fontWeight: 700,
//             fontSize: 20,
//             color: "var(--text-primary)",
//           }}
//         >
//           WBL <span style={{ color: "var(--accent-light)" }}>PrepHub</span>
//         </span>
//       </Link>

//       {/* Right Side */}
//       <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
//         {candidateName && (
//           <span
//             style={{
//               color: "var(--text-secondary)",
//               fontSize: 14,
//               fontWeight: 500,
//               marginRight: 8,
//             }}
//           >
//             Welcome, {candidateName}
//           </span>
//         )}

//         <div className="badge badge-accent">
//           <User size={12} /> Active Session
//         </div>

//         <button
//           className="btn-secondary"
//           onClick={onLogout}
//           style={{
//             display: "flex",
//             alignItems: "center",
//             gap: 6,
//             padding: "8px 16px",
//             fontSize: 13,
//           }}
//         >
//           <LogOut size={14} /> Logout
//         </button>
//       </div>
//     </nav>
//   );
// }


"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { motion } from "framer-motion";
import clsx from "clsx";

interface NavbarProps {
  candidateName?: string;
  onLogout?: () => void;
}

export default function Navbar({ candidateName, onLogout }: NavbarProps) {
  const pathname = usePathname();

  const navItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Progress", href: "/progress" },
  ];

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 48px",
        borderBottom: "1px solid var(--border)",
        background: "rgba(10,10,15,0.7)",
        backdropFilter: "blur(10px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      {/* LEFT: Logo */}
      <Link
        href="/dashboard"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          textDecoration: "none",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src="/logo.png"
            alt="logo"
            style={{ width: 22, height: 22 }}
          />
        </div>

        <span
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 700,
            fontSize: 20,
            color: "var(--text-primary)",
          }}
        >
          WBL <span style={{ color: "var(--accent-light)" }}>PrepHub</span>
        </span>
      </Link>

      {/* CENTER: Navigation Tabs */}
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        {navItems.map((item) => {
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                position: "relative",
                padding: "6px 10px",
                fontSize: 14,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              <span
                className={clsx(
                  active
                    ? "text-white"
                    : "text-[var(--text-secondary)] hover:text-white"
                )}
              >
                {item.label}
              </span>

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
                    borderRadius: 10,
                    background:
                      "linear-gradient(90deg, #7c3aed, #a78bfa)",
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>

      {/* RIGHT: User + Logout */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {candidateName && (
          <span
            style={{
              color: "var(--text-secondary)",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Hi, {candidateName}
          </span>
        )}

        <div className="badge badge-accent">
          <User size={12} /> Active
        </div>

        <button
          className="btn-secondary"
          onClick={onLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            fontSize: 13,
          }}
        >
          <LogOut size={14} /> Logout
        </button>
      </div>
    </nav>
  );
}
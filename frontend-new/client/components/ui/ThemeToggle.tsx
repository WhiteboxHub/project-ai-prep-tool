import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 smooth-transition relative flex items-center justify-center overflow-hidden w-10 h-10"
      aria-label="Toggle theme"
    >
      <div className={`absolute transition-transform duration-500 ${theme === "light" ? "rotate-0 scale-100" : "-rotate-90 scale-0"}`}>
        <Sun className="w-5 h-5" />
      </div>
      <div className={`absolute transition-transform duration-500 ${theme === "dark" ? "rotate-0 scale-100" : "rotate-90 scale-0"}`}>
        <Moon className="w-5 h-5" />
      </div>
    </button>
  );
}

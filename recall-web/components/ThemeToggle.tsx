"use client";

import { useTheme } from "@/lib/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex items-center justify-center w-10 h-10 rounded-lg bg-secondary hover:bg-secondary/80 hover:shadow-md transition-all duration-200 group"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <svg
          className="w-5 h-5 text-yellow-400 group-hover:scale-110 transition-transform"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l-2.12-2.12a.5.5 0 00-.707 0l-.707.707.707.707 2.12 2.121.707-.707-.707-.707zm2.12-10.607a.5.5 0 000 .707L11.293 9.5a.5.5 0 00.707 0l1.414-1.414a.5.5 0 000-.707l-.707-.707a.5.5 0 00-.707 0L11 7.586 9.586 6.172a.5.5 0 00-.707 0l-.707.707.707.707L10.414 8.5l-1.414 1.414.707.707.707-.707 1.414-1.414.707-.707a.5.5 0 000-.707l-.707-.707a.5.5 0 00-.707 0L9.5 7.793l-1.414-1.414a.5.5 0 00-.707 0l-.707.707.707.707 1.414 1.414-.707.707.707.707.707-.707 1.414 1.414a.5.5 0 00.707 0l.707-.707a.5.5 0 000-.707l-1.414-1.414 1.414-1.414a.5.5 0 000-.707l-.707-.707a.5.5 0 00-.707 0L8.586 8.5l1.414-1.414a.5.5 0 000-.707l-.707-.707a.5.5 0 00-.707 0L8 7.793 6.586 6.379a.5.5 0 00-.707 0l-.707.707.707.707L7.586 8.5 6.172 9.914a.5.5 0 00.707.707L8.5 9.207l1.414 1.414.707-.707-.707-.707-1.414-1.414a.5.5 0 00-.707 0l-.707.707.707.707 1.414 1.414a.5.5 0 00.707 0l.707-.707-.707-.707-1.414-1.414a.5.5 0 000-.707l.707-.707a.5.5 0 00.707 0l1.414 1.414 1.414-1.414a.5.5 0 000-.707l-.707-.707a.5.5 0 00-.707 0l-1.414 1.414-1.414-1.414a.5.5 0 00-.707 0l-.707.707.707.707 1.414 1.414a.5.5 0 00.707 0l.707-.707-.707-.707-1.414-1.414zm4.464-4.95a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm0 8a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM4 11a1 1 0 100-2H3a1 1 0 100 2h1zm0 4a1 1 0 100-2H3a1 1 0 100 2h1zm14-4a1 1 0 100-2h-1a1 1 0 100 2h1zm0 4a1 1 0 100-2h-1a1 1 0 100 2h1z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg
          className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      )}
    </button>
  );
}

"use client";

import { useTheme } from "next-themes";
import { useIntl } from '@/components/IntlProvider';
import { useEffect, useState } from "react";

export function SettingsToggle() {
  const { theme, setTheme } = useTheme();
  const { locale, setLocale } = useIntl();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
  };

  const changeLanguage = (newLocale: string) => {
    setLocale(newLocale);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Sélecteur de langue */}
      <div className="flex gap-1">
        <button
          onClick={() => changeLanguage("fr")}
          aria-label="Français"
          className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
            locale === "fr"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
          title="Français"
        >
          FR
        </button>
        <button
          onClick={() => changeLanguage("en")}
          aria-label="English"
          className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
            locale === "en"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
          title="English"
        >
          EN
        </button>
      </div>

      {/* Sélecteur de thème */}
      <button
        onClick={toggleTheme}
        aria-label={`Basculer vers le thème ${theme === "light" ? "sombre" : "clair"}`}
        className="p-2 rounded-lg border border-border hover:bg-muted transition-colors duration-200"
        title={`Thème ${theme === "light" ? "sombre" : "clair"}`}
      >
        {theme === "light" ? (
          <svg
            className="w-4 h-4 text-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        ) : (
          <svg
            className="w-4 h-4 text-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        )}
      </button>
    </div>
  );
}

"use client";

import { useRouter, usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect, useState } from "react";

export function LanguageSelector() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const changeLanguage = (newLocale: string) => {
    // Remplacer la locale dans l'URL
    const newPathname = pathname.replace(/^\/\w+/, `/${newLocale}`);
    
    // Définir le cookie de préférence de langue
    document.cookie = `NEXT_LOCALE=${newLocale}; max-age=${60 * 60 * 24 * 365}; path=/`;
    
    // Rediriger vers la nouvelle URL
    router.push(newPathname);
  };

  return (
    <div className="flex gap-1">
      <button
        onClick={() => changeLanguage("fr")}
        aria-label="Français"
        className={`px-2 py-1 rounded-md text-sm font-medium transition-colors ${
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
        className={`px-2 py-1 rounded-md text-sm font-medium transition-colors ${
          locale === "en"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted"
        }`}
        title="English"
      >
        EN
      </button>
    </div>
  );
}

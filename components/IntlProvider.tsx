"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

// Types pour les messages de traduction
type Messages = Record<string, any>;

// Contexte pour les traductions
type IntlContextType = {
  locale: string;
  messages: Messages;
  setLocale: (locale: string) => void;
  t: (key: string, params?: Record<string, any>) => string;
};

const IntlContext = createContext<IntlContextType | undefined>(undefined);

// Fonction pour obtenir la locale depuis le cookie ou le navigateur
function getInitialLocale(): string {
  if (typeof window !== "undefined") {
    // Vérifier le cookie
    const cookieLocale = document.cookie
      .split("; ")
      .find((row) => row.startsWith("NEXT_LOCALE="))
      ?.split("=")[1];

    if (cookieLocale && ["fr", "en"].includes(cookieLocale)) {
      return cookieLocale;
    }

    // Vérifier la langue du navigateur
    const navLang = navigator.language.split("-")[0];
    if (["fr", "en"].includes(navLang)) {
      return navLang;
    }
  }

  // Retourner le français par défaut
  return "fr";
}

// Fonction pour formater un message avec des paramètres
function formatMessage(
  message: string,
  params?: Record<string, any>
): string {
  if (!params) return message;

  // Remplacer les placeholders simples
  let result = message;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(new RegExp(`\{${key}\}`, "g"), String(value));
  }

  return result;
}

// Fonction pour gérer les pluriels
function handlePlural(
  key: string,
  count: number,
  messages: Messages
): string {
  // Vérifier si le message a des formes pluriels
  const message = messages[key];
  if (typeof message === "string") {
    return message;
  }

  if (typeof message === "object") {
    // Gérer les pluriels (ex: "1 day | {count} days")
    if (message["one"] && message["other"]) {
      return count === 1 ? message["one"] : message["other"].replace("{count}", String(count));
    }

    // Gérer le format "In {count} day | In {count} days"
    const parts = Object.values(message) as string[];
    if (parts.length >= 2) {
      return count === 1 ? parts[0].replace("{count}", "1") : parts[1].replace("{count}", String(count));
    }
  }

  return String(message);
}

// Composant IntlProvider
export function IntlProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<string>("fr");
  const [messages, setMessages] = useState<Messages>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initialLocale = getInitialLocale();
    setLocaleState(initialLocale);
    
    // Charger les messages pour la locale initiale
    fetch(`/messages/${initialLocale}.json`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load messages for locale: ${initialLocale}`);
        }
        return response.json();
      })
      .then((loadedMessages) => {
        setMessages(loadedMessages);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading messages:", error);
        setLoading(false);
      });
  }, []);

  // Changer de locale
  const setLocale = (newLocale: string) => {
    if (newLocale !== locale) {
      // Définir le cookie
      document.cookie = `NEXT_LOCALE=${newLocale}; max-age=${60 * 60 * 24 * 365}; path=/`;
      
      // Mettre à jour l'état
      setLocaleState(newLocale);
      setLoading(true);
      
      // Charger les nouveaux messages
      fetch(`/messages/${newLocale}.json`)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to load messages for locale: ${newLocale}`);
          }
          return response.json();
        })
        .then((loadedMessages) => {
          setMessages(loadedMessages);
          setLoading(false);
          
          // Rafraîchir la page pour appliquer la nouvelle langue
          window.location.reload();
        })
        .catch((error) => {
          console.error("Error loading messages:", error);
          setLoading(false);
        });
    }
  };

  // Fonction de traduction
  const t = (key: string, params?: Record<string, any>): string => {
    if (loading) return key;
    
    const keys = key.split(".");
    let current: any = messages;

    for (const k of keys) {
      if (current && typeof current === "object" && k in current) {
        current = current[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }

    if (typeof current === "string") {
      return formatMessage(current, params);
    }

    if (typeof current === "object" && params?.count !== undefined) {
      return handlePlural(key, params.count, messages);
    }

    return key;
  };

  const value: IntlContextType = {
    locale,
    messages,
    setLocale,
    t,
  };

  // Mettre à jour l'attribut lang de la balise html
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  if (loading) {
    return <>{children}</>;
  }

  return (
    <IntlContext.Provider value={value}>
      {children}
    </IntlContext.Provider>
  );
}

// Hook pour utiliser les traductions
export function useIntl() {
  const context = useContext(IntlContext);
  if (!context) {
    throw new Error("useIntl must be used within an IntlProvider");
  }
  return context;
}

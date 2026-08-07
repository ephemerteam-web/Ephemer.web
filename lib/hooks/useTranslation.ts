import { useIntl } from '@/components/IntlProvider';

export function useTranslation() {
  const { t, locale, setLocale } = useIntl();
  
  return {
    t,
    locale,
    setLocale,
    // Fonction pratique pour changer de langue
    changeLanguage: (newLocale: string) => {
      setLocale(newLocale);
    },
  };
}

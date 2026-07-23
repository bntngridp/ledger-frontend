import { useLanguageContext } from '@/context/language-context';

export function useTranslation() {
  const { language, setLanguage, t } = useLanguageContext();
  return {
    language,
    setLanguage,
    t,
    isIndonesian: language === 'id',
    isEnglish: language === 'en',
  };
}

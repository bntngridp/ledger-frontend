import { useAppTheme } from '@/context/theme-context';

export function useColorScheme() {
  const { activeTheme } = useAppTheme();
  return activeTheme;
}

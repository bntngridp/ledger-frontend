import { Colors } from '@/constants/theme';
import { useAppTheme } from '@/context/theme-context';

export function useTheme() {
  const { activeTheme } = useAppTheme();
  return Colors[activeTheme];
}

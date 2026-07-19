import { MoonStar, SunMedium } from 'lucide-react';
import { Button } from './ui/button';
import type { ThemeMode } from '../lib/types';

type Props = {
  mode: ThemeMode;
  onToggle: () => void;
};

export function ThemeToggle({ mode, onToggle }: Props) {
  return (
    <Button variant="outline" size="sm" onClick={onToggle} aria-label="Toggle theme">
      {mode === 'dark' ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
      {mode === 'dark' ? 'Light' : 'Dark'}
    </Button>
  );
}


'use client';

import AdZone from '@/components/ui/AdZone';
import { useFeatureGate } from '@/hooks/useFeatureGate';

interface AdBannerProps {
  zone: 'pill' | 'horizontal' | 'contextual-signal' | 'contextual-coin';
  context?: { symbol?: string; exchange?: string };
  className?: string;
}

/**
 * Conditionally renders AdZone only for users without the 'no_ads' feature.
 * Paid users (trader+) see nothing — free users see the ad.
 */
export default function AdBanner({ zone, context, className }: AdBannerProps) {
  const { canAccess } = useFeatureGate();
  if (canAccess('no_ads')) return null;
  return <AdZone zone={zone} context={context} className={className} />;
}

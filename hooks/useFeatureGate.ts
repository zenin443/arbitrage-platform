'use client';

import { useAuth } from '@/contexts/AuthContext';
import { hasFeature, getMinPlanForFeature, type FeatureKey, type PlanTier } from '@/lib/features';

interface FeatureGate {
  canAccess: (feature: FeatureKey) => boolean;
  plan: string;
  isPaid: boolean;
  minPlanFor: (feature: FeatureKey) => PlanTier;
}

export function useFeatureGate(): FeatureGate {
  let plan = 'free';
  let isPaid = false;
  let isAdmin = false;

  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const auth = useAuth();
    plan = auth?.user?.plan ?? 'free';
    isPaid = plan !== 'free';
    isAdmin = auth?.user?.role === 'admin';
  } catch {
    // Fail open — if auth context is unavailable, treat as paid
    // (gates MUST fail open for paid users)
    return {
      canAccess: () => true,
      plan: 'free',
      isPaid: false,
      minPlanFor: getMinPlanForFeature,
    };
  }

  function canAccess(feature: FeatureKey): boolean {
    // Admin bypasses all feature gates — full institutional access
    if (isAdmin) return true;
    try {
      return hasFeature(plan, feature);
    } catch {
      return true;
    }
  }

  return { canAccess, plan, isPaid: isPaid || isAdmin, minPlanFor: getMinPlanForFeature };
}

'use client';
import { useAuth } from '@/contexts/AuthContext';
import { hasFeature, type FeatureKey, type PlanTier } from '@/lib/features';

interface FeatureAccess {
  can: (feature: FeatureKey) => boolean;
  plan: PlanTier;
  isLoading: boolean;
}

export function useFeatureAccess(): FeatureAccess {
  const { user, isLoading } = useAuth();
  const plan = ((user?.plan ?? 'free') as PlanTier);

  return {
    can: (feature: FeatureKey) => hasFeature(plan, feature),
    plan,
    isLoading,
  };
}

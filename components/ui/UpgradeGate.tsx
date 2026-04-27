'use client';
import Link from 'next/link';
import { LockIcon } from 'lucide-react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import type { FeatureKey, PlanTier } from '@/lib/features';

const PLAN_LABEL: Record<PlanTier, string> = {
  free:          'Free',
  trader:        'Trader',
  pro:           'Pro',
  institutional: 'Institutional',
};

interface Props {
  feature: FeatureKey;
  /** Rendered when the user has access */
  children: React.ReactNode;
  /** Minimum plan label to show in the upgrade prompt (auto-derived if omitted) */
  requiredPlan?: PlanTier;
}

export default function UpgradeGate({ feature, children, requiredPlan }: Props) {
  const { can, isLoading } = useFeatureAccess();

  if (isLoading) return null;

  if (can(feature)) return <>{children}</>;

  const label = requiredPlan ? PLAN_LABEL[requiredPlan] : 'a higher';

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#21262D] border border-[#30363D]">
        <LockIcon className="h-5 w-5 text-[#484F58]" />
      </div>
      <div>
        <p className="text-[13px] font-mono font-semibold text-[#E6EDF3]">
          {label.charAt(0).toUpperCase() + label.slice(1)} plan required
        </p>
        <p className="text-[11px] font-mono text-[#484F58] mt-0.5">
          Upgrade to unlock this feature
        </p>
      </div>
      <Link
        href="/pricing"
        className="text-[11px] font-mono text-[#388BFD] hover:text-[#58a6ff] border border-[#388BFD]/40 hover:border-[#388BFD] rounded px-4 py-1.5 transition-colors"
      >
        View plans →
      </Link>
    </div>
  );
}

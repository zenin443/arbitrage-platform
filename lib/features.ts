/**
 * Feature flag definitions per plan tier.
 * Used by both server-side gates and the client-side useFeatureAccess hook.
 */

export type PlanTier = 'free' | 'trader' | 'pro' | 'institutional';

export type FeatureKey =
  | 'real_time_data'
  | 'all_coins'
  | 'all_gap_types'
  | 'intelligence_page'
  | 'cex_arb'
  | 'dex_arb'
  | 'cross_chain_arb'
  | 'funding_rates'
  | 'basic_alerts'
  | 'push_alerts'
  | 'magnus_ai'
  | 'api_access'
  | 'webhooks'
  | 'white_label'
  | 'no_ads'
  | 'export_csv'
  | 'export_full'
  | 'priority_support';

const PLAN_RANK: Record<PlanTier, number> = {
  free:          0,
  trader:        1,
  pro:           2,
  institutional: 3,
};

/** Minimum plan required to access each feature. */
const FEATURE_MIN_PLAN: Record<FeatureKey, PlanTier> = {
  real_time_data:    'trader',
  all_coins:         'trader',
  all_gap_types:     'trader',
  intelligence_page: 'trader',
  cex_arb:           'free',
  dex_arb:           'trader',
  cross_chain_arb:   'trader',
  funding_rates:     'trader',
  basic_alerts:      'trader',
  push_alerts:       'pro',
  magnus_ai:         'pro',
  api_access:        'pro',
  webhooks:          'institutional',
  white_label:       'institutional',
  no_ads:            'trader',
  export_csv:        'trader',
  export_full:       'pro',
  priority_support:  'pro',
};

export function hasFeature(userPlan: string, feature: FeatureKey): boolean {
  const plan = (userPlan?.toLowerCase() ?? 'free') as PlanTier;
  const userRank    = PLAN_RANK[plan]                     ?? 0;
  const requiredRank = PLAN_RANK[FEATURE_MIN_PLAN[feature]] ?? 0;
  return userRank >= requiredRank;
}

export function getMinPlanForFeature(feature: FeatureKey): PlanTier {
  return FEATURE_MIN_PLAN[feature];
}

export { FEATURE_MIN_PLAN };

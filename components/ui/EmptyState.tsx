interface EmptyStateProps {
  title: string
  subtitle?: string
}

export function EmptyState({ title, subtitle }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60px] text-center px-4 py-6">
      <p className="text-[#8B949E]" style={{ fontSize: 'var(--fs-sm, 12px)' }}>
        {title}
      </p>
      {subtitle && (
        <p className="text-[#484F58] mt-1" style={{ fontSize: 'var(--fs-xs, 11px)' }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}

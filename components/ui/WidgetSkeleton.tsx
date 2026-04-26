interface WidgetSkeletonProps {
  type: 'stat' | 'chart' | 'table' | 'list' | 'card'
  rows?: number
}

export function WidgetSkeleton({ type, rows = 4 }: WidgetSkeletonProps) {
  if (type === 'stat') {
    return (
      <div className="animate-pulse p-3">
        <div className="h-3 bg-[#21262D] rounded w-1/2 mb-2" />
        <div className="h-6 bg-[#21262D] rounded w-3/4 mb-1" />
        <div className="h-2 bg-[#21262D] rounded w-1/3" />
      </div>
    )
  }

  if (type === 'chart') {
    return (
      <div className="animate-pulse p-3 h-full">
        <div className="h-3 bg-[#21262D] rounded w-1/3 mb-3" />
        <div className="flex items-end gap-1 h-[60px]">
          {[40, 25, 60, 35, 50, 20, 45].map((h, i) => (
            <div key={i} className="flex-1 bg-[#21262D] rounded-t" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    )
  }

  if (type === 'table') {
    return (
      <div className="animate-pulse p-2">
        <div className="h-3 bg-[#21262D] rounded w-full mb-3" />
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-3 mb-2">
            <div className="h-3 bg-[#21262D] rounded w-1/4" />
            <div className="h-3 bg-[#21262D] rounded w-1/6" />
            <div className="h-3 bg-[#21262D] rounded w-1/5" />
            <div className="h-3 bg-[#21262D] rounded flex-1" />
          </div>
        ))}
      </div>
    )
  }

  if (type === 'list') {
    return (
      <div className="animate-pulse">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex justify-between py-1.5">
            <div className="h-3 bg-[#21262D] rounded w-2/5" />
            <div className="h-3 bg-[#21262D] rounded w-1/5" />
          </div>
        ))}
      </div>
    )
  }

  // card (default)
  return (
    <div className="animate-pulse p-3">
      <div className="h-4 bg-[#21262D] rounded w-1/2 mb-3" />
      <div className="h-3 bg-[#21262D] rounded w-full mb-2" />
      <div className="h-3 bg-[#21262D] rounded w-3/4" />
    </div>
  )
}

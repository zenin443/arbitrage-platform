'use client'

import { useState } from 'react'

export function InfoCorner({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative inline-flex flex-shrink-0">
      <div
        className="w-[14px] h-[14px] rounded-full border border-[#484F58] text-[#484F58] text-[9px] flex items-center justify-center cursor-help hover:border-[#8B949E] hover:text-[#8B949E] transition-colors"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        i
      </div>
      {show && (
        <div className="absolute bottom-[20px] right-0 w-[200px] bg-[#21262D] border border-[#30363D] rounded-md p-2 text-[11px] text-[#E6EDF3] leading-relaxed z-50 shadow-lg">
          {text}
        </div>
      )}
    </div>
  )
}

export default InfoCorner

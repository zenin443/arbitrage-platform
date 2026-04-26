'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface Props {
  children: React.ReactNode
  defaultWidth?: number
  defaultHeight?: number
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  storageKey?: string
  className?: string
  header?: React.ReactNode
}

export default function ResizableWidget({
  children,
  defaultWidth,
  defaultHeight,
  minWidth = 150,
  minHeight = 150,
  maxWidth,
  maxHeight,
  storageKey,
  className = '',
  header,
}: Props) {
  const [size, setSize] = useState({
    width: defaultWidth ?? 300,
    height: defaultHeight ?? 400,
  })
  const containerRef = useRef<HTMLDivElement>(null)
  const hasWidthControl = defaultWidth !== undefined

  useEffect(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        try {
          setSize(JSON.parse(saved))
        } catch {}
      }
    }
  }, [storageKey])

  useEffect(() => {
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(size))
    }
  }, [size, storageKey])

  const handleResize = useCallback(
    (e: React.MouseEvent, direction: string) => {
      e.preventDefault()
      e.stopPropagation()
      const startX = e.clientX
      const startY = e.clientY
      const startWidth = size.width
      const startHeight = size.height
      const mw = maxWidth ?? window.innerWidth - 100
      const mh = maxHeight ?? window.innerHeight - 100

      const onMouseMove = (ev: MouseEvent) => {
        const deltaX = ev.clientX - startX
        const deltaY = ev.clientY - startY
        let newWidth = startWidth
        let newHeight = startHeight

        if (direction.includes('right')) newWidth = Math.max(minWidth, Math.min(startWidth + deltaX, mw))
        if (direction.includes('left'))  newWidth = Math.max(minWidth, Math.min(startWidth - deltaX, mw))
        if (direction.includes('bottom')) newHeight = Math.max(minHeight, Math.min(startHeight + deltaY, mh))
        if (direction.includes('top'))   newHeight = Math.max(minHeight, Math.min(startHeight - deltaY, mh))

        setSize({ width: newWidth, height: newHeight })
      }

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)

      if (direction === 'top-left' || direction === 'bottom-right') document.body.style.cursor = 'nwse-resize'
      else if (direction === 'top-right' || direction === 'bottom-left') document.body.style.cursor = 'nesw-resize'
      else if (direction === 'left' || direction === 'right') document.body.style.cursor = 'ew-resize'
      else document.body.style.cursor = 'ns-resize'

      document.body.style.userSelect = 'none'
    },
    [size, minWidth, minHeight, maxWidth, maxHeight]
  )

  const h = 'absolute bg-transparent hover:bg-[#388BFD]/30 transition-colors z-20'

  return (
    <div
      ref={containerRef}
      className={`relative bg-[#161B22] border border-[#21262D] rounded-lg flex flex-col overflow-hidden ${className}`}
      style={{
        width: hasWidthControl ? `${size.width}px` : undefined,
        height: `${size.height}px`,
      }}
    >
      {/* Top/bottom edge handles */}
      <div className={`${h} top-0 left-3 right-3 h-[4px] cursor-ns-resize`} onMouseDown={e => handleResize(e, 'top')} />
      <div className={`${h} bottom-0 left-3 right-3 h-[4px] cursor-ns-resize`} onMouseDown={e => handleResize(e, 'bottom')} />

      {/* Left/right edge handles — only when width is controlled */}
      {hasWidthControl && (
        <>
          <div className={`${h} left-0 top-3 bottom-3 w-[4px] cursor-ew-resize`} onMouseDown={e => handleResize(e, 'left')} />
          <div className={`${h} right-0 top-3 bottom-3 w-[4px] cursor-ew-resize`} onMouseDown={e => handleResize(e, 'right')} />
        </>
      )}

      {/* Corner handles — only when width is controlled */}
      {hasWidthControl && (
        <>
          <div className={`${h} top-0 left-0 w-3 h-3 cursor-nwse-resize`} onMouseDown={e => handleResize(e, 'top-left')} />
          <div className={`${h} top-0 right-0 w-3 h-3 cursor-nesw-resize`} onMouseDown={e => handleResize(e, 'top-right')} />
          <div className={`${h} bottom-0 left-0 w-3 h-3 cursor-nesw-resize`} onMouseDown={e => handleResize(e, 'bottom-left')} />
          <div className={`${h} bottom-0 right-0 w-3 h-3 cursor-nwse-resize`} onMouseDown={e => handleResize(e, 'bottom-right')} />
        </>
      )}

      {/* Optional header */}
      {header && (
        <div className="flex-shrink-0 bg-[#161B22] border-b border-[#21262D] z-10">
          {header}
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto min-h-0">
        {children}
      </div>
    </div>
  )
}

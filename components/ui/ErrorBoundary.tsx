import React from 'react'

interface Props {
  children: React.ReactNode
  name: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[Widget Error] ${this.props.name}:`, error.message, errorInfo.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[60px] text-center px-4 py-3 rounded-md bg-[#161B22] border border-[#21262D]">
          <p className="text-[#8B949E]" style={{ fontSize: 'var(--fs-xs, 11px)' }}>
            {this.props.name} unavailable
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-2 text-[#388BFD] hover:underline"
            style={{ fontSize: 'var(--fs-xs, 11px)' }}
          >
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class UIErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  override componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
       
      console.error('ErrorBoundary caught an error', _error)
    }
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 px-6">
          <div className="max-w-md w-full text-center rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 shadow-sm">
            <h2 className="text-xl font-medium text-neutral-900 dark:text-white mb-2">Something went wrong</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-6">
              An unexpected error occurred while rendering the page.
            </p>
            <button
              type="button"
              onClick={() => { window.location.reload(); }}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-900 dark:border-white px-6 py-2 text-sm font-medium text-white dark:text-black bg-neutral-900 dark:bg-white transition-all duration-200 hover:bg-neutral-800 dark:hover:bg-neutral-200 hover:border-neutral-800 dark:hover:border-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple-strong focus-visible:ring-offset-2 dark:focus-visible:ring-brand-purple-weak dark:focus-visible:ring-offset-neutral-900"
            >
              Refresh page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default UIErrorBoundary

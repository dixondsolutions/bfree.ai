'use client'

import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return (
          <FallbackComponent 
            error={this.state.error!} 
            resetErrorBoundary={this.resetErrorBoundary}
          />
        )
      }

      return (
        <DefaultErrorFallback 
          error={this.state.error!} 
          resetErrorBoundary={this.resetErrorBoundary}
        />
      )
    }

    return this.props.children
  }
}

// Default Error Fallback Component
export function DefaultErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <Card className="w-full max-w-md border-error-200 bg-error-50">
        <CardHeader className="text-center pb-4">
          <div className="w-16 h-16 bg-error-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-error-600" />
          </div>
          <h3 className="text-lg font-semibold text-error-900">Something went wrong</h3>
          <p className="text-sm text-error-700">
            We encountered an unexpected error. This has been logged and we're working to fix it.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error Details (only in development) */}
          {process.env.NODE_ENV === 'development' && error && (
            <div className="bg-error-100 border border-error-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-error-800 mb-2">Error Details</h4>
              <code className="text-xs text-error-700 block whitespace-pre-wrap">
                {error.message}
              </code>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col space-y-2">
            <Button 
              onClick={resetErrorBoundary}
              variant="default"
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button 
              onClick={() => window.location.href = '/dashboard'}
              variant="outline"
              className="w-full"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-center">
            <p className="text-xs text-error-600">
              If this problem persists, please contact support.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Compact Error Fallback for smaller components
export function CompactErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center p-4 bg-error-50 border border-error-200 rounded-lg">
      <div className="text-center">
        <AlertTriangle className="h-6 w-6 text-error-600 mx-auto mb-2" />
        <p className="text-sm font-medium text-error-800 mb-2">Error loading component</p>
        <Button onClick={resetErrorBoundary} size="sm" variant="outline">
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      </div>
    </div>
  )
}

// Hook for programmatic error boundary usage
export function useErrorHandler() {
  return (error: Error, errorInfo?: React.ErrorInfo) => {
    console.error('Error caught by useErrorHandler:', error, errorInfo)
    // In a real app, you might send this to an error reporting service
  }
} 
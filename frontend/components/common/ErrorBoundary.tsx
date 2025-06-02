"use client";

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Uncaught error:", error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="min-h-[200px] flex flex-col items-center justify-center p-6 text-center border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 rounded-lg">
          <AlertTriangle className="h-10 w-10 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-4">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <button
            className="text-sm bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 text-red-700 dark:text-red-300 px-4 py-2 rounded-md transition-colors"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
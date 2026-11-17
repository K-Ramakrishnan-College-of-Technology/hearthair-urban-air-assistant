import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-700">
              <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
              <h2 className="text-lg font-semibold">Application recovery needed</h2>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Something interrupted the air quality workspace. Your unsaved edits remain protected if you retry below.
            </p>
            <div className="bg-slate-100 rounded-lg p-3 text-xs font-mono text-slate-700 break-words">
              {this.state.message}
            </div>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>Restore Workspace</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

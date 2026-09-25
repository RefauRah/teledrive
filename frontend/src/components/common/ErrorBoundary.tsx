import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('TeleDrive Uncaught UI Error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col items-center justify-center p-6 text-center">
          <div className="w-full max-w-md p-8 rounded-3xl bg-bg-secondary border border-border-medium shadow-2xl flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-error/15 text-error flex items-center justify-center border border-error/20">
              <AlertTriangle size={32} />
            </div>
            <h1 className="text-xl font-bold text-text-primary">Terjadi Kesalahan Aplikasi</h1>
            <p className="text-xs text-text-secondary">
              {this.state.error?.message || 'Aplikasi mengalami kendala saat merender komponen.'}
            </p>
            <button
              onClick={this.handleReset}
              className="mt-2 px-6 py-2.5 rounded-xl gradient-warm text-text-inverse font-bold text-xs flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-accent-warm/20"
            >
              <RefreshCw size={14} />
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

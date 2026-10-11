import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

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
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturó un error no controlado:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleClearStorageAndReload = () => {
    try {
      localStorage.removeItem('iglesia_flujo_transacciones_v2');
      localStorage.removeItem('iglesia_flujo_proyectos_v2');
      localStorage.removeItem('iglesia_flujo_pactos_v2');
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6 font-sans">
          <div className="max-w-md w-full bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-6 sm:p-8 text-center shadow-2xl shadow-black/50 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-bold text-white mb-2">
              Algo no salió como se esperaba
            </h2>

            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-6">
              El sistema detectó una inconsistencia temporal al renderizar la vista. Tus datos en la base de datos están completamente a salvo.
            </p>

            {this.state.error?.message && (
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-left mb-6 overflow-x-auto">
                <span className="text-[10px] font-mono text-rose-300 block truncate">
                  {this.state.error.message}
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-98 text-white text-xs font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reintentar Vista</span>
              </button>

              <button
                type="button"
                onClick={this.handleClearStorageAndReload}
                className="py-3 px-4 rounded-xl bg-slate-700/70 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-600 flex items-center justify-center space-x-1.5"
                title="Sincronizar de nuevo desde la nube"
              >
                <Home className="w-4 h-4" />
                <span>Recargar Datos</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;

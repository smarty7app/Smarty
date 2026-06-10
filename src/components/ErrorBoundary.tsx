import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  // Explicitly declare state & props to comply with strict TypeScript guidelines in standard subclassing
  public props!: Props & { children?: ReactNode };
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    // Return pristine state to trigger fallback UI in renderer
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Strictly log all programming/rendering errors to the browser console for security and diagnostic audits
    console.error("🔒 [Security Isolation Zone] Component rendering error caught and isolated:", error);
    if (errorInfo && errorInfo.componentStack) {
      console.error("Component stack trace:", errorInfo.componentStack);
    }
  }

  public render() {
    if ((this.state as any).hasError) {
      return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 font-sans">
          <div className="max-w-xl w-full bg-zinc-900 border border-red-500/25 p-8 rounded-3xl shadow-xl space-y-6">
            <div className="flex items-center gap-4 text-red-500">
              <span className="text-3xl">⚠️</span>
              <div>
                <h1 className="text-xl font-bold">عطل في النظام / System Exception Caught</h1>
                <p className="text-xs text-zinc-400">The application encountered a critical client-side rendering error.</p>
              </div>
            </div>
            
            <div className="bg-black/50 p-4 rounded-xl border border-zinc-800 font-mono text-xs text-zinc-300 overflow-auto max-h-60 space-y-2">
              <p className="font-bold text-red-400">Error rendering UI component</p>
              <p className="whitespace-pre-wrap leading-relaxed text-zinc-400">
                Please reload the browser or check console logs. If you are in iframe, try opening in a new tab.
              </p>
            </div>
            
            <button 
              onClick={() => window.location.reload()} 
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all duration-200"
            >
              إعادة تحميل الصفحة / Reload App
            </button>
          </div>
        </div>
      );
    }

    // Default pristine rendering context
    return (this as any).props.children;
  }
}

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
      // Return null to keep any visual errors completely invisible from the user as requested
      return null;
    }

    // Default pristine rendering context
    return (this as any).props.children;
  }
}

import * as React from "react";

interface Props {
  children: React.ReactNode;
  /** Short label of the area, e.g. "workflows" — used in the fallback copy. */
  area?: string;
}

interface State {
  error: Error | null;
}

/**
 * Catches render crashes so a bad row or unexpected payload shows a friendly
 * "reload" card instead of a silent blank white screen.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error): void {
    console.error("[ErrorBoundary]", this.props.area || "app", error);
  }

  override render(): React.ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="max-w-sm text-center space-y-3">
          <div className="text-[14px] font-semibold text-fg-primary">
            Something went wrong loading {this.props.area || "this page"}
          </div>
          <div className="text-[12px] text-fg-secondary leading-relaxed">
            {this.state.error.message}
          </div>
          <button
            type="button"
            onClick={() => {
              this.setState({ error: null });
              window.location.reload();
            }}
            className="inline-flex items-center h-9 px-4 rounded-md bg-brand-500 hover:bg-brand-600 text-white text-[12px] font-semibold"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}

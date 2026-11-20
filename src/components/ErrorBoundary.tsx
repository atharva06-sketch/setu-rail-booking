import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Catches render-time crashes and shows a readable message instead of a
 * silent blank screen. Keeps the rest of the app debuggable.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Rail Bandhu crashed while rendering:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#F4F7FA",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          color: "#1B2733",
        }}
      >
        <div
          style={{
            maxWidth: 560,
            width: "100%",
            background: "#fff",
            border: "1px solid #D8E2EC",
            borderRadius: 10,
            padding: 24,
            boxShadow: "0 8px 24px rgba(11,60,107,0.08)",
          }}
        >
          <div style={{ fontSize: 12, letterSpacing: 1, color: "#0B3C6B", fontWeight: 700 }}>
            RAIL BANDHU
          </div>
          <h1 style={{ fontSize: 20, margin: "8px 0 6px" }}>Something went wrong</h1>
          <p style={{ fontSize: 13, color: "#5B6B7A", lineHeight: 1.5, margin: "0 0 14px" }}>
            The app hit an unexpected error. Reload the page to try again. If it keeps happening,
            restart the dev server with <code>npm run dev:all</code> and check the terminal output.
          </p>
          <pre
            style={{
              margin: "0 0 18px",
              padding: 12,
              borderRadius: 6,
              background: "#F4F7FA",
              border: "1px solid #E1E8F0",
              fontSize: 11,
              color: "#7A2E2E",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: 160,
              overflow: "auto",
            }}
          >
            {this.state.error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "#F5821F",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "10px 18px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}

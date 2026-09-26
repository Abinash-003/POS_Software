import { Component } from "react";
import { HiOutlineArrowPath, HiOutlineExclamationTriangle } from "react-icons/hi2";

/**
 * Last line of defence: a render crash shows a recoverable screen instead of a
 * blank page. Text is intentionally bilingual since the language provider may
 * itself be part of the broken tree.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("[ui] render error", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-danger-50 text-danger-500">
          <HiOutlineExclamationTriangle className="size-7" aria-hidden="true" />
        </span>
        <div>
          <p className="text-lg font-semibold text-ink-900">Something went wrong</p>
          <p className="mt-1 text-sm text-ink-500">ஏதோ தவறு நடந்தது</p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-500 px-5 text-sm font-semibold text-white shadow-float transition hover:bg-brand-600"
        >
          <HiOutlineArrowPath className="size-5" aria-hidden="true" />
          Reload / மீண்டும் ஏற்று
        </button>
      </div>
    );
  }
}

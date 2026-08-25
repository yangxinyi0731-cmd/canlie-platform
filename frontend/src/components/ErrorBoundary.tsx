import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
          <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">页面加载异常</h2>
          <p className="text-sm text-gray-500 mb-6 text-center">
            请尝试刷新页面或重新登录
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              localStorage.removeItem('token');
              window.location.replace('/login');
            }}
            className="px-6 py-2.5 bg-[#FF6B00] text-white rounded-xl text-sm font-medium hover:bg-[#e86000] transition-colors shadow-sm"
          >
            返回登录
          </button>
          {this.state.error && (
            <details className="mt-6 text-xs text-gray-400 max-w-md">
              <summary className="cursor-pointer">错误详情</summary>
              <pre className="mt-2 p-3 bg-gray-100 rounded-lg overflow-auto text-xs whitespace-pre-wrap">
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

/// <reference types="vite/client" />
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-novel-bg flex items-center justify-center p-8">
          <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-8 max-w-xl w-full">
            <h2 className="text-lg font-bold text-red-600 mb-3">页面渲染出错</h2>
            <pre className="text-sm text-red-700 bg-red-50 rounded-lg p-4 overflow-auto max-h-[60vh] whitespace-pre-wrap font-mono">
              {this.state.error.stack || this.state.error.message || String(this.state.error)}
            </pre>
            <button
              onClick={() => { this.setState({ error: null }); window.location.reload() }}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
            >
              刷新重试
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

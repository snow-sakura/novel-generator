import { Component } from 'react'
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
              <AlertTriangle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">出错了</h1>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              应用遇到了一个错误，请尝试刷新页面或返回首页。
            </p>
            {this.state.error && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left border border-gray-100">
                <p className="text-xs font-mono text-gray-600 break-all leading-relaxed">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                返回首页
              </button>
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-rose-600 transition-all shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                重试
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

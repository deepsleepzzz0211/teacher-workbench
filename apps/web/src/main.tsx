import { App as AntApp, ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import '@ant-design/v5-patch-for-react-19'
import 'antd/dist/reset.css'

import App from './App'
import { AuthProvider } from './auth/AuthContext'
import { themeConfig } from './theme'

dayjs.locale('zh-cn')

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

const container = document.getElementById('root')
if (!container) throw new Error('找不到挂载节点 #root')

createRoot(container).render(
  <StrictMode>
    <ConfigProvider locale={zhCN} theme={themeConfig}>
      <AntApp>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  </StrictMode>,
)

import { useState } from 'react'

import { Alert, Button, Card, Divider, Flex, Form, Input, Typography, App as AntApp } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import { loginSchema } from '@tw/shared'

import { getErrorMessage } from '@/api/client'
import { useAuth } from '@/auth/AuthContext'
import { palette } from '@/theme'

interface LoginFormValues {
  username: string
  password: string
}

const DEMO_ACCOUNTS = [
  { username: 't1001', label: '专任教师 · 陈立群', password: 'Teach@2026' },
  { username: 'admin', label: '院系管理员 · 刘建国', password: 'Teach@2026' },
]

export function LoginPage(): React.ReactNode {
  const { user, ready, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { message } = AntApp.useApp()
  const [form] = Form.useForm<LoginFormValues>()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (ready && user) {
    const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/'
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (values: LoginFormValues): Promise<void> => {
    const parsed = loginSchema.safeParse(values)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? '请检查输入')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await login(parsed.data)
      message.success('登录成功')
      navigate('/', { replace: true })
    } catch (caught) {
      setError(getErrorMessage(caught))
    } finally {
      setSubmitting(false)
    }
  }

  const fillDemo = (account: (typeof DEMO_ACCOUNTS)[number]): void => {
    form.setFieldsValue({ username: account.username, password: account.password })
    setError(null)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: `linear-gradient(135deg,${palette.sider} 0%,${palette.primaryDark} 55%,${palette.primary} 100%)`,
        padding: 24,
      }}
    >
      <Card style={{ width: 420, boxShadow: '0 24px 64px rgba(7,20,45,0.35)' }} styles={{ body: { padding: 32 } }}>
        <Flex vertical gap={4} style={{ marginBottom: 24 }}>
          <Flex align="center" gap={10}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: `linear-gradient(135deg,${palette.primary},${palette.primaryLight})`,
                display: 'grid',
                placeItems: 'center',
                color: palette.surface,
                fontWeight: 700,
                fontSize: 18,
              }}
            >
              教
            </div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              高职院校教师工作台
            </Typography.Title>
          </Flex>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            课表 · 工作量 · 教科研成果 · 企业实践 · 审批 · 待办，一处录入，自动汇总
          </Typography.Text>
        </Flex>

        {error ? <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} /> : null}

        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ username: '', password: '' }}>
          <Form.Item
            name="username"
            label="用户名 / 工号"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="例如 t1001" size="large" autoComplete="username" />
          </Form.Item>

          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入密码"
              size="large"
              autoComplete="current-password"
            />
          </Form.Item>

          <Button type="primary" htmlType="submit" size="large" block loading={submitting}>
            登录
          </Button>
        </Form>

        <Divider plain style={{ marginTop: 24 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            演示账号（点击填入）
          </Typography.Text>
        </Divider>

        <Flex vertical gap={8}>
          {DEMO_ACCOUNTS.map((account) => (
            <Button key={account.username} block onClick={() => fillDemo(account)}>
              {account.label}
            </Button>
          ))}
        </Flex>
      </Card>
    </div>
  )
}

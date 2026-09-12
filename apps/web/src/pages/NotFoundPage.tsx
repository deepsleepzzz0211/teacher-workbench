import { Button, Result } from 'antd'
import { useNavigate } from 'react-router-dom'

export function NotFoundPage(): React.ReactNode {
  const navigate = useNavigate()
  return (
    <Result
      status="404"
      title="页面不存在"
      subTitle="该功能可能已调整，请从左侧菜单重新进入。"
      extra={
        <Button type="primary" onClick={() => navigate('/')}>
          返回工作台
        </Button>
      }
    />
  )
}

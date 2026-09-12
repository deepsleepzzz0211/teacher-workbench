import type { ThemeConfig } from 'antd'

export const PRIMARY = '#1d4ed8'
export const SIDER_BG = '#0b1b33'

export const themeConfig: ThemeConfig = {
  token: {
    colorPrimary: PRIMARY,
    colorInfo: PRIMARY,
    borderRadius: 8,
    fontSize: 14,
    colorBgLayout: '#f4f6fb',
    fontFamily:
      '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI", system-ui, -apple-system, sans-serif',
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      headerHeight: 60,
      siderBg: SIDER_BG,
      bodyBg: '#f4f6fb',
    },
    Menu: {
      darkItemBg: SIDER_BG,
      darkSubMenuItemBg: SIDER_BG,
      darkItemSelectedBg: PRIMARY,
      darkItemHoverBg: 'rgba(255,255,255,0.08)',
      itemMarginInline: 8,
      itemHeight: 44,
    },
    Card: {
      headerFontSize: 16,
      paddingLG: 20,
    },
    Table: {
      headerBg: '#fafbfe',
    },
  },
}

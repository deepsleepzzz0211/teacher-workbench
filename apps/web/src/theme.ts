import type { ThemeConfig } from 'antd'

/** 全站色彩令牌的唯一来源。页面与组件一律从这里取色——换品牌色只需改这一处。 */
export const palette = {
  primary: '#1d4ed8',
  primaryDark: '#123a7a',
  primaryLight: '#38bdf8',
  primarySoftBorder: '#dbeafe',
  success: '#16a34a',
  warning: '#d97706',
  chartSeries: '#0ea5e9',
  sider: '#0b1b33',
  surface: '#ffffff',
  surfaceMuted: '#f8fafc',
  bgLayout: '#f4f6fb',
  tableHeaderBg: '#fafbfe',
  borderSubtle: '#eef1f7',
  textSecondary: '#475569',
  textMuted: '#64748b',
  hoverOverlay: 'rgba(255,255,255,0.08)',
} as const

export const PRIMARY = palette.primary
export const SIDER_BG = palette.sider

export const themeConfig: ThemeConfig = {
  token: {
    colorPrimary: palette.primary,
    colorInfo: palette.primary,
    borderRadius: 8,
    fontSize: 14,
    colorBgLayout: palette.bgLayout,
    fontFamily:
      '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI", system-ui, -apple-system, sans-serif',
  },
  components: {
    Layout: {
      headerBg: palette.surface,
      headerHeight: 60,
      siderBg: palette.sider,
      bodyBg: palette.bgLayout,
    },
    Menu: {
      darkItemBg: palette.sider,
      darkSubMenuItemBg: palette.sider,
      darkItemSelectedBg: palette.primary,
      darkItemHoverBg: palette.hoverOverlay,
      itemMarginInline: 8,
      itemHeight: 44,
    },
    Card: {
      headerFontSize: 16,
      paddingLG: 20,
    },
    Table: {
      headerBg: palette.tableHeaderBg,
    },
  },
}

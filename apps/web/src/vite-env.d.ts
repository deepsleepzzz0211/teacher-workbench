/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 后端接口基地址；留空则走同源 `/api`（开发期由 Vite 代理转发） */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

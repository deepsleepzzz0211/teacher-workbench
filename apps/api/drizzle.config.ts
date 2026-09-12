import { defineConfig } from 'drizzle-kit'

import { loadEnv } from './src/config/env'

loadEnv()

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgres://tw_app:tw_app_pwd_2026@127.0.0.1:5432/teacher_workbench',
  },
  strict: true,
  verbose: true,
})

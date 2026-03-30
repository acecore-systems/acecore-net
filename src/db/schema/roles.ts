/**
 * roles テーブルスキーマ
 *
 * ユーザーに割り当てられたロール。初期は user / admin の 2 種。
 */
import { pgTable, text, timestamp, primaryKey } from 'drizzle-orm/pg-core'
import { users } from './users'

export const roles = pgTable(
  'roles',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.role] })],
)

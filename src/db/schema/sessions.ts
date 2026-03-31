/**
 * sessions テーブルスキーマ
 *
 * cookie ベースのセッション管理用。トークンハッシュと有効期限を保持する。
 */
import { pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { users } from './users'

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex('sessions_token_hash_idx').on(table.tokenHash)],
)

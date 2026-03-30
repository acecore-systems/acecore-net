/**
 * profiles テーブルスキーマ
 *
 * ユーザーの公開プロフィール情報。users テーブルと 1:1 で紐付く。
 */
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users'

export const profiles = pgTable('profiles', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  phone: text('phone'),
  bio: text('bio'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

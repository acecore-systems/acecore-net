CREATE TABLE IF NOT EXISTS school_guardian_accounts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  stripe_customer_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS school_students (
  id TEXT PRIMARY KEY,
  guardian_id TEXT NOT NULL,
  name TEXT NOT NULL,
  grade TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (guardian_id) REFERENCES school_guardian_accounts (id)
);

CREATE TABLE IF NOT EXISTS school_instructors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  calendar_token TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS school_courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  target TEXT NOT NULL,
  recommended_age TEXT NOT NULL,
  frequency TEXT NOT NULL,
  price_label TEXT NOT NULL,
  monthly_price_env_key TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS school_course_instructors (
  course_id TEXT NOT NULL,
  instructor_id TEXT NOT NULL,
  PRIMARY KEY (course_id, instructor_id),
  FOREIGN KEY (course_id) REFERENCES school_courses (id),
  FOREIGN KEY (instructor_id) REFERENCES school_instructors (id)
);

CREATE TABLE IF NOT EXISTS school_availability_rules (
  id TEXT PRIMARY KEY,
  instructor_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  weekday INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  slot_minutes INTEGER NOT NULL DEFAULT 60,
  capacity INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (instructor_id) REFERENCES school_instructors (id),
  FOREIGN KEY (course_id) REFERENCES school_courses (id)
);

CREATE TABLE IF NOT EXISTS school_bookings (
  id TEXT PRIMARY KEY,
  booking_type TEXT NOT NULL,
  status TEXT NOT NULL,
  guardian_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  instructor_id TEXT NOT NULL,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Tokyo',
  guardian_name TEXT NOT NULL,
  guardian_email TEXT NOT NULL,
  guardian_phone TEXT,
  student_name TEXT NOT NULL,
  student_grade TEXT,
  message TEXT,
  stripe_checkout_session_id TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  cancel_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (guardian_id) REFERENCES school_guardian_accounts (id),
  FOREIGN KEY (student_id) REFERENCES school_students (id),
  FOREIGN KEY (course_id) REFERENCES school_courses (id),
  FOREIGN KEY (instructor_id) REFERENCES school_instructors (id)
);

CREATE TABLE IF NOT EXISTS school_booking_audit_logs (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (booking_id) REFERENCES school_bookings (id)
);

CREATE TABLE IF NOT EXISTS school_portal_otps (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS school_portal_sessions (
  id TEXT PRIMARY KEY,
  guardian_id TEXT NOT NULL,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  FOREIGN KEY (guardian_id) REFERENCES school_guardian_accounts (id)
);

CREATE TABLE IF NOT EXISTS school_stripe_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  processed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_school_students_guardian
  ON school_students (guardian_id);

CREATE INDEX IF NOT EXISTS idx_school_bookings_guardian_start
  ON school_bookings (guardian_id, start_at);

CREATE INDEX IF NOT EXISTS idx_school_bookings_instructor_start
  ON school_bookings (instructor_id, start_at);

CREATE INDEX IF NOT EXISTS idx_school_bookings_course_start
  ON school_bookings (course_id, start_at);

CREATE INDEX IF NOT EXISTS idx_school_bookings_status_start
  ON school_bookings (status, start_at);

CREATE INDEX IF NOT EXISTS idx_school_portal_otps_email_created
  ON school_portal_otps (email, created_at);

INSERT OR IGNORE INTO school_instructors (
  id,
  name,
  email,
  calendar_token,
  active,
  sort_order,
  created_at,
  updated_at
) VALUES
  ('hatt', 'Hatt', 'info@acecore.net', 'cal_' || lower(hex(randomblob(24))), 1, 10, '2026-06-07T00:00:00.000Z', '2026-06-07T00:00:00.000Z'),
  ('acecore-staff', 'Acecore Staff', 'info@acecore.net', 'cal_' || lower(hex(randomblob(24))), 1, 20, '2026-06-07T00:00:00.000Z', '2026-06-07T00:00:00.000Z');

INSERT OR IGNORE INTO school_courses (
  id,
  title,
  summary,
  target,
  recommended_age,
  frequency,
  price_label,
  monthly_price_env_key,
  active,
  sort_order,
  created_at,
  updated_at
) VALUES
  ('juku', '学習塾', '学校の学習、定期テスト、受験対策を個別に組み立てます。', '小学生・中学生・高校生', '小学4年生以上', '週1回から相談', '月謝 8千〜3.3万円', 'STRIPE_PRICE_SCHOOLS_JUKU_MONTHLY', 1, 10, '2026-06-07T00:00:00.000Z', '2026-06-07T00:00:00.000Z'),
  ('robot-programming', 'ロボット / プログラミング', '工作、センサー、マインクラフトなどから論理的思考を育てます。', '小学生・中学生', '小学3年生以上', '月2回または週1回', '月謝 8千〜2.2万円', 'STRIPE_PRICE_SCHOOLS_ROBOT_MONTHLY', 1, 20, '2026-06-07T00:00:00.000Z', '2026-06-07T00:00:00.000Z'),
  ('practical-programming', '実践プログラミング', 'Web制作、Python、API、Gitなど実務につながる内容を学びます。', '中学生以上・社会人', '中学生以上', '週1回から相談', '月謝 1.1万〜3.3万円', 'STRIPE_PRICE_SCHOOLS_PROGRAMMING_MONTHLY', 1, 30, '2026-06-07T00:00:00.000Z', '2026-06-07T00:00:00.000Z'),
  ('pc-smartphone', 'パソコン / スマホ', '基本操作、Office、メール、オンライン会議、セキュリティを扱います。', '初心者・シニア・社会人', '年齢不問', '単発または月2回から', '月謝 8千円〜 / 単発相談可', 'STRIPE_PRICE_SCHOOLS_PC_MONTHLY', 1, 40, '2026-06-07T00:00:00.000Z', '2026-06-07T00:00:00.000Z'),
  ('ged', '高卒認定', '科目ごとの計画作成、過去問演習、学習習慣づくりを支援します。', '高卒認定を目指す方', '高校生相当以上', '週1回から相談', '月謝 1.1万〜3.3万円', 'STRIPE_PRICE_SCHOOLS_GED_MONTHLY', 1, 50, '2026-06-07T00:00:00.000Z', '2026-06-07T00:00:00.000Z');

INSERT OR IGNORE INTO school_course_instructors (course_id, instructor_id) VALUES
  ('juku', 'acecore-staff'),
  ('robot-programming', 'hatt'),
  ('robot-programming', 'acecore-staff'),
  ('practical-programming', 'hatt'),
  ('pc-smartphone', 'acecore-staff'),
  ('ged', 'acecore-staff');

INSERT OR IGNORE INTO school_availability_rules (
  id,
  instructor_id,
  course_id,
  weekday,
  start_time,
  end_time,
  slot_minutes,
  capacity,
  active,
  created_at,
  updated_at
) VALUES
  ('rule-juku-wed', 'acecore-staff', 'juku', 3, '17:00', '20:00', 60, 1, 1, '2026-06-07T00:00:00.000Z', '2026-06-07T00:00:00.000Z'),
  ('rule-juku-sat', 'acecore-staff', 'juku', 6, '10:00', '14:00', 60, 1, 1, '2026-06-07T00:00:00.000Z', '2026-06-07T00:00:00.000Z'),
  ('rule-robot-sat', 'hatt', 'robot-programming', 6, '14:00', '18:00', 60, 1, 1, '2026-06-07T00:00:00.000Z', '2026-06-07T00:00:00.000Z'),
  ('rule-programming-thu', 'hatt', 'practical-programming', 4, '18:00', '21:00', 60, 1, 1, '2026-06-07T00:00:00.000Z', '2026-06-07T00:00:00.000Z'),
  ('rule-pc-tue', 'acecore-staff', 'pc-smartphone', 2, '13:00', '17:00', 60, 1, 1, '2026-06-07T00:00:00.000Z', '2026-06-07T00:00:00.000Z'),
  ('rule-ged-fri', 'acecore-staff', 'ged', 5, '17:00', '20:00', 60, 1, 1, '2026-06-07T00:00:00.000Z', '2026-06-07T00:00:00.000Z');

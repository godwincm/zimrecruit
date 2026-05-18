-- Append to schema.sql (notifications table)
-- Run: mysql zimrecruit < notifications_migration.sql

CREATE TABLE IF NOT EXISTS notifications (
  id           CHAR(36)      NOT NULL,
  recipient_id CHAR(36)      NOT NULL,
  type         VARCHAR(60)   NOT NULL,
  title        VARCHAR(200)  NOT NULL,
  body         TEXT          NOT NULL,
  link         VARCHAR(255)  DEFAULT NULL,
  is_read      TINYINT(1)    NOT NULL DEFAULT 0,
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_notif_recipient FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notif_recipient_read (recipient_id, is_read)
) ENGINE=InnoDB;

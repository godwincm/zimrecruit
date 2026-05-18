-- ============================================================
-- ZimRecruit Database Schema — MySQL 8.0+
-- Run: mysql -u root -p < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS zimrecruit
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE zimrecruit;

-- ── USERS ────────────────────────────────────────────────────
-- Mirrors Appwrite user; appwrite_id is the external identity key.
CREATE TABLE IF NOT EXISTS users (
  id             CHAR(36)     NOT NULL,
  appwrite_id    VARCHAR(64)  NOT NULL,
  email          VARCHAR(255) NOT NULL,
  full_name      VARCHAR(150) NOT NULL,
  phone          VARCHAR(32)  DEFAULT NULL,
  avatar_file_id VARCHAR(64)  DEFAULT NULL,
  is_active      TINYINT(1)   NOT NULL DEFAULT 1,
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_appwrite_id (appwrite_id),
  UNIQUE KEY uq_email (email),
  INDEX idx_users_email (email)
) ENGINE=InnoDB;

-- ── USER ROLES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_roles (
  user_id CHAR(36)                                            NOT NULL,
  role    ENUM('applicant','employer','verifier','admin')     NOT NULL,
  PRIMARY KEY (user_id, role),
  CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── APPLICANT PROFILES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS applicant_profiles (
  user_id    CHAR(36)      NOT NULL,
  headline   VARCHAR(160)  DEFAULT NULL,
  bio        TEXT          DEFAULT NULL,
  location   VARCHAR(120)  DEFAULT NULL,
  skills     JSON          DEFAULT NULL,
  education  JSON          DEFAULT NULL,
  experience JSON          DEFAULT NULL,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_ap_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── EMPLOYER PROFILES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employer_profiles (
  user_id       CHAR(36)      NOT NULL,
  company_name  VARCHAR(200)  NOT NULL,
  location      VARCHAR(120)  NOT NULL,
  contact_email VARCHAR(255)  NOT NULL,
  industry      VARCHAR(120)  DEFAULT NULL,
  website       VARCHAR(255)  DEFAULT NULL,
  logo_file_id  VARCHAR(64)   DEFAULT NULL,
  verified      TINYINT(1)    NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_ep_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_emp_industry (industry)
) ENGINE=InnoDB;

-- ── INSTITUTIONS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS institutions (
  id             CHAR(36)                              NOT NULL,
  name           VARCHAR(200)                          NOT NULL,
  category       ENUM('zrp','medical','education')     NOT NULL,
  wallet_address CHAR(42)                              NOT NULL,
  contact_email  VARCHAR(255)                          NOT NULL,
  is_active      TINYINT(1)                            NOT NULL DEFAULT 1,
  created_at     TIMESTAMP                             NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wallet (wallet_address),
  INDEX idx_inst_category (category)
) ENGINE=InnoDB;

-- ── INSTITUTION MEMBERS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS institution_members (
  user_id        CHAR(36) NOT NULL,
  institution_id CHAR(36) NOT NULL,
  PRIMARY KEY (user_id, institution_id),
  CONSTRAINT fk_im_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_im_inst FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── JOBS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id            CHAR(36)                             NOT NULL,
  employer_id   CHAR(36)                             NOT NULL,
  title         VARCHAR(200)                         NOT NULL,
  industry      VARCHAR(120)                         NOT NULL,
  qualification VARCHAR(120)                         DEFAULT NULL,
  skills        JSON                                 DEFAULT NULL,
  duties        TEXT                                 DEFAULT NULL,
  description   TEXT                                 NOT NULL,
  location      VARCHAR(120)                         DEFAULT NULL,
  deadline      DATETIME                             NOT NULL,
  status        ENUM('open','expired','closed')       NOT NULL DEFAULT 'open',
  created_at    TIMESTAMP                             NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_job_employer FOREIGN KEY (employer_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_jobs_industry (industry),
  INDEX idx_jobs_status_deadline (status, deadline),
  FULLTEXT INDEX idx_jobs_search (title, description)
) ENGINE=InnoDB;

-- ── APPLICATIONS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS applications (
  id           CHAR(36)                                                              NOT NULL,
  job_id       CHAR(36)                                                              NOT NULL,
  applicant_id CHAR(36)                                                              NOT NULL,
  status       ENUM('applied','shortlisted','interview','offer','rejected','withdrawn') NOT NULL DEFAULT 'applied',
  cover_letter TEXT                                                                  DEFAULT NULL,
  created_at   TIMESTAMP                                                             NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_app (job_id, applicant_id),
  CONSTRAINT fk_app_job      FOREIGN KEY (job_id)       REFERENCES jobs(id)  ON DELETE CASCADE,
  CONSTRAINT fk_app_applicant FOREIGN KEY (applicant_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_app_status (status)
) ENGINE=InnoDB;

-- ── INTERVIEWS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interviews (
  id             CHAR(36)     NOT NULL,
  application_id CHAR(36)     NOT NULL,
  scheduled_at   DATETIME     NOT NULL,
  location       VARCHAR(255) DEFAULT NULL,
  notes          TEXT         DEFAULT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_int_app FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── DOCUMENTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documents (
  id               CHAR(36)                                          NOT NULL,
  applicant_id     CHAR(36)                                          NOT NULL,
  doc_type         ENUM('education','police_clearance','medical','id','other') NOT NULL,
  title            VARCHAR(200)                                      NOT NULL,
  appwrite_file_id VARCHAR(64)                                       NOT NULL,
  appwrite_bucket  VARCHAR(64)                                       NOT NULL,
  sha256_hash      CHAR(66)                                          NOT NULL, -- 0x + 64 hex
  size_bytes       BIGINT                                            DEFAULT NULL,
  mime_type        VARCHAR(120)                                      DEFAULT NULL,
  created_at       TIMESTAMP                                         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_doc_applicant FOREIGN KEY (applicant_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_doc_hash (sha256_hash),
  INDEX idx_doc_owner_type (applicant_id, doc_type)
) ENGINE=InnoDB;

-- ── VERIFICATION REQUESTS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS verification_requests (
  id             CHAR(36)                          NOT NULL,
  document_id    CHAR(36)                          NOT NULL,
  institution_id CHAR(36)                          NOT NULL,
  status         ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  reviewer_id    CHAR(36)                          DEFAULT NULL,
  reason         TEXT                              DEFAULT NULL,
  created_at     TIMESTAMP                         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decided_at     TIMESTAMP                         DEFAULT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_vr_doc  FOREIGN KEY (document_id)    REFERENCES documents(id)    ON DELETE CASCADE,
  CONSTRAINT fk_vr_inst FOREIGN KEY (institution_id) REFERENCES institutions(id),
  CONSTRAINT fk_vr_rev  FOREIGN KEY (reviewer_id)    REFERENCES users(id),
  INDEX idx_vr_status (status),
  INDEX idx_vr_inst_status (institution_id, status)
) ENGINE=InnoDB;

-- ── ON-CHAIN ATTESTATIONS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS on_chain_attestations (
  id               CHAR(36)     NOT NULL,
  request_id       CHAR(36)     NOT NULL,
  document_hash    CHAR(66)     NOT NULL,  -- matches documents.sha256_hash
  institution_id   CHAR(36)     NOT NULL,
  institution_name VARCHAR(200) NOT NULL,
  verifier_wallet  CHAR(42)     NOT NULL,
  tx_hash          CHAR(66)     NOT NULL,
  block_number     BIGINT       DEFAULT NULL,
  chain_id         INT          DEFAULT NULL,
  revoked          TINYINT(1)   NOT NULL DEFAULT 0,
  attested_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_request (request_id),
  UNIQUE KEY uq_tx_hash (tx_hash),
  CONSTRAINT fk_oca_request FOREIGN KEY (request_id) REFERENCES verification_requests(id) ON DELETE CASCADE,
  INDEX idx_att_hash (document_hash)
) ENGINE=InnoDB;

-- ── AUDIT LOGS ────────────────────────────────────────────────
-- Append-only; row_hash = sha256(prev_hash || row_data) for tamper evidence.
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

CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGINT AUTO_INCREMENT NOT NULL,
  actor_id    CHAR(36)              DEFAULT NULL,
  actor_role  ENUM('applicant','employer','verifier','admin') DEFAULT NULL,
  action      VARCHAR(80)           NOT NULL,
  entity      VARCHAR(80)           DEFAULT NULL,
  entity_id   CHAR(36)              DEFAULT NULL,
  metadata    JSON                  DEFAULT NULL,
  ip_address  VARCHAR(45)           DEFAULT NULL,
  prev_hash   CHAR(66)              DEFAULT NULL,
  row_hash    CHAR(66)              DEFAULT NULL,
  created_at  TIMESTAMP             NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_audit_actor  (actor_id),
  INDEX idx_audit_entity (entity, entity_id),
  INDEX idx_audit_time   (created_at)
) ENGINE=InnoDB;

-- ── SEED DATA (dev / staging only) ───────────────────────────
-- Institutions
INSERT IGNORE INTO institutions (id, name, category, wallet_address, contact_email) VALUES
  ('i-uz-0001', 'University of Zimbabwe',    'education', '0x1111111111111111111111111111111111111111', 'verify@uz.ac.zw'),
  ('i-msu-0001','Midlands State University', 'education', '0x2222222222222222222222222222222222222222', 'verify@msu.ac.zw'),
  ('i-zrp-0001','Zimbabwe Republic Police',  'zrp',       '0x3333333333333333333333333333333333333333', 'clearance@zrp.gov.zw'),
  ('i-hch-0001','Harare Central Hospital',   'medical',   '0x4444444444444444444444444444444444444444', 'fitness@hch.gov.zw');

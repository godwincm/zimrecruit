create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key,
  supabase_user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  phone text,
  avatar_file_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('applicant', 'employer', 'verifier', 'admin')),
  primary key (user_id, role)
);

create table if not exists public.applicant_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  headline text,
  bio text,
  location text,
  skills jsonb,
  education jsonb,
  experience jsonb
);

create table if not exists public.employer_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  company_name text not null,
  location text not null,
  contact_email text not null,
  industry text,
  website text,
  logo_file_id text,
  verified boolean not null default false
);

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('zrp', 'medical', 'education')),
  contact_email text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.institution_members (
  user_id uuid not null references public.users(id) on delete cascade,
  institution_id uuid not null references public.institutions(id) on delete cascade,
  primary key (user_id, institution_id)
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  industry text not null,
  qualification text,
  skills jsonb,
  duties text,
  description text not null,
  location text,
  deadline timestamptz not null,
  status text not null default 'open' check (status in ('open', 'expired', 'closed')),
  created_at timestamptz not null default now()
);
create index if not exists idx_jobs_status_deadline on public.jobs(status, deadline);
create index if not exists idx_jobs_search on public.jobs using gin (to_tsvector('english', title || ' ' || description));

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  applicant_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'applied' check (status in ('applied', 'shortlisted', 'interview', 'offer', 'rejected', 'withdrawn')),
  cover_letter text,
  created_at timestamptz not null default now(),
  unique (job_id, applicant_id)
);

create table if not exists public.interviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  scheduled_at timestamptz not null,
  location text,
  notes text
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.users(id) on delete cascade,
  doc_type text not null check (doc_type in ('education', 'police_clearance', 'medical', 'id', 'other')),
  title text not null,
  storage_path text not null,
  storage_bucket text not null default 'zimrecruit-media',
  sha256_hash text not null,
  size_bytes bigint,
  mime_type text,
  created_at timestamptz not null default now()
);
create index if not exists idx_doc_hash on public.documents(sha256_hash);

create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  institution_id uuid not null references public.institutions(id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewer_id uuid references public.users(id),
  reason text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create table if not exists public.mockchain_attestations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.verification_requests(id) on delete restrict,
  document_hash text not null,
  institution_id uuid not null references public.institutions(id),
  institution_name text not null,
  verifier_id uuid not null references public.users(id),
  receipt_hash text not null unique,
  sequence_number bigint generated always as identity unique,
  revoked boolean not null default false,
  attested_at timestamptz not null default now()
);
create index if not exists idx_mockchain_att_hash on public.mockchain_attestations(document_hash);
alter table public.mockchain_attestations
  drop constraint if exists mockchain_attestations_document_hash_key;
alter table public.mockchain_attestations
  drop constraint if exists mockchain_attestations_request_id_fkey;
alter table public.mockchain_attestations
  add constraint mockchain_attestations_request_id_fkey
  foreign key (request_id) references public.verification_requests(id) on delete restrict;
create unique index if not exists uq_mockchain_active_document_hash
  on public.mockchain_attestations(document_hash) where revoked = false;

create or replace function public.append_mockchain_attestation(
  p_request_id uuid,
  p_document_hash text,
  p_institution_id uuid,
  p_institution_name text,
  p_verifier_id uuid
) returns public.mockchain_attestations
language plpgsql
as $$
declare
  entry public.mockchain_attestations;
begin
  if not exists (
    select 1
    from public.verification_requests vr
    join public.documents d on d.id = vr.document_id
    join public.institutions i on i.id = vr.institution_id
    join public.institution_members im
      on im.institution_id = vr.institution_id and im.user_id = p_verifier_id
    where vr.id = p_request_id
      and vr.status = 'approved'
      and vr.reviewer_id = p_verifier_id
      and d.sha256_hash = p_document_hash
      and i.id = p_institution_id
      and i.name = p_institution_name
  ) then
    raise exception using
      errcode = '23514',
      message = 'Attestation must match an approved verification request and its verifier institution.';
  end if;

  insert into public.mockchain_attestations (
    request_id,
    document_hash,
    institution_id,
    institution_name,
    verifier_id,
    receipt_hash
  ) values (
    p_request_id,
    p_document_hash,
    p_institution_id,
    p_institution_name,
    p_verifier_id,
    '0x' || encode(digest(
      concat_ws('|', p_request_id::text, p_document_hash, p_institution_id::text, p_verifier_id::text, clock_timestamp()::text, gen_random_uuid()::text),
      'sha256'
    ), 'hex')
  )
  returning * into entry;

  return entry;
end;
$$;

do $$
begin
  if to_regclass('public.on_chain_attestations') is not null then
    insert into public.mockchain_attestations (
      request_id,
      document_hash,
      institution_id,
      institution_name,
      verifier_id,
      receipt_hash,
      revoked,
      attested_at
    )
    select
      legacy.request_id,
      legacy.document_hash,
      legacy.institution_id,
      legacy.institution_name,
      request.reviewer_id,
      legacy.tx_hash,
      legacy.revoked,
      legacy.attested_at
    from public.on_chain_attestations legacy
    join public.verification_requests request on request.id = legacy.request_id
    where request.reviewer_id is not null
    on conflict do nothing;

    drop table public.on_chain_attestations;
  end if;
end;
$$;

alter table public.institutions drop column if exists wallet_address;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notif_recipient_read on public.notifications(recipient_id, is_read);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  subject text,
  created_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);
create index if not exists idx_messages_conversation_time on public.messages(conversation_id, created_at);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.users(id),
  actor_role text check (actor_role in ('applicant', 'employer', 'verifier', 'admin')),
  action text not null,
  entity text,
  entity_id uuid,
  metadata jsonb,
  ip_address text,
  prev_hash text,
  row_hash text,
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'zimrecruit-media',
  'zimrecruit-media',
  false,
  10485760,
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

alter table public.notifications enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications" on public.notifications for select to authenticated
using (recipient_id = auth.uid());

drop policy if exists "participants read conversations" on public.conversations;
create policy "participants read conversations" on public.conversations for select to authenticated
using (exists (
  select 1 from public.conversation_participants p
  where p.conversation_id = conversations.id and p.user_id = auth.uid()
));

drop policy if exists "participants read membership" on public.conversation_participants;
create policy "participants read membership" on public.conversation_participants for select to authenticated
using (user_id = auth.uid());

drop policy if exists "participants read messages" on public.messages;
create policy "participants read messages" on public.messages for select to authenticated
using (exists (
  select 1 from public.conversation_participants p
  where p.conversation_id = messages.conversation_id and p.user_id = auth.uid()
));

drop policy if exists "users upload own media" on storage.objects;
create policy "users upload own media" on storage.objects for insert to authenticated
with check (bucket_id = 'zimrecruit-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users read own media" on storage.objects;
create policy "users read own media" on storage.objects for select to authenticated
using (bucket_id = 'zimrecruit-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users delete own media" on storage.objects;
create policy "users delete own media" on storage.objects for delete to authenticated
using (bucket_id = 'zimrecruit-media' and (storage.foldername(name))[1] = auth.uid()::text);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

insert into public.institutions (id, name, category, contact_email) values
  ('11111111-1111-4111-8111-111111111111', 'University of Zimbabwe', 'education', 'verify@uz.ac.zw'),
  ('22222222-2222-4222-8222-222222222222', 'Midlands State University', 'education', 'verify@msu.ac.zw'),
  ('33333333-3333-4333-8333-333333333333', 'Zimbabwe Republic Police', 'zrp', 'clearance@zrp.gov.zw'),
  ('44444444-4444-4444-8444-444444444444', 'Harare Central Hospital', 'medical', 'fitness@hch.gov.zw')
on conflict (id) do nothing;

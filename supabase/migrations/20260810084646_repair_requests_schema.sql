-- PLAN.md task 3: repair_requests + status_history tables, and a trigger that
-- logs every status change (app-made or manual, e.g. edited directly in the
-- Supabase dashboard) into status_history. See PRD.md Section 5 for field rules.

create sequence if not exists repair_request_id_seq start 1;

create table if not exists repair_requests (
  id text primary key default ('RPR-' || lpad(nextval('repair_request_id_seq')::text, 6, '0')),
  device_type text not null check (device_type in ('Desktop', 'Laptop', 'Monitor', 'Printer', 'Other')),
  device_type_other text,
  issue_description text not null check (char_length(issue_description) between 10 and 500),
  phone_number text not null check (phone_number ~ '^[0-9]{10}$'),
  photo_paths text[] not null default '{}',
  status text not null default 'Received' check (status in ('Received', 'In Repair', 'Ready for Pickup', 'Completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists repair_requests_phone_idx on repair_requests (phone_number);

create table if not exists status_history (
  id bigint generated always as identity primary key,
  request_id text not null references repair_requests (id) on delete cascade,
  status text not null,
  changed_at timestamptz not null default now()
);

create index if not exists status_history_request_id_idx on status_history (request_id);

-- keep updated_at current on every edit
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists repair_requests_set_updated_at on repair_requests;
create trigger repair_requests_set_updated_at
before update on repair_requests
for each row execute function set_updated_at();

-- log every status change to status_history: the initial insert (status = Received)
-- and any later change to `status`, including manual edits made directly in the
-- Supabase dashboard (there is no admin UI for staff — see PRD.md Section 6).
create or replace function log_status_change()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    insert into status_history (request_id, status, changed_at) values (new.id, new.status, now());
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into status_history (request_id, status, changed_at) values (new.id, new.status, now());
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists repair_requests_log_status_change on repair_requests;
create trigger repair_requests_log_status_change
after insert or update on repair_requests
for each row execute function log_status_change();

-- lock down direct public access; the app only ever talks to these tables through
-- Next.js API routes using the service-role key, which bypasses RLS.
alter table repair_requests enable row level security;
alter table status_history enable row level security;

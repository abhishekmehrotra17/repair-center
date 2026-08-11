-- Gap fix: status_history.status had no CHECK constraint, unlike
-- repair_requests.status, so history rows could record a stage outside the
-- 4 values PRD.md Section 5 defines. Mirror the same constraint here.
alter table status_history
  add constraint status_history_status_check
  check (status in ('Received', 'In Repair', 'Ready for Pickup', 'Completed'));

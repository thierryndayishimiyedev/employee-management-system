-- Adds Late as an attendance status. Run once in the Supabase SQL editor
-- before using the Late action in the attendance register.
alter type public.attendance_status add value if not exists 'LATE';

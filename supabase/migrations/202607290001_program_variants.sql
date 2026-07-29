-- Split the private program into two variants without losing the existing PDF.
-- Existing row 1 becomes Uomo; row 2 is the new Donna slot.

alter table public.program_config
  drop constraint if exists program_config_id_check;

alter table public.program_config
  add constraint program_config_id_check check (id in (1, 2));

insert into public.program_config (id, active)
values (2, false)
on conflict (id) do nothing;

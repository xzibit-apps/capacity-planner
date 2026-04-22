-- Phase 1b: align engines with real project data
-- Additive only — no DROP, no ALTER COLUMN TYPE. Reversible by dropping new columns.
-- Applied out-of-band to the live Supabase project (rklzgzyqbajhpjvixlkr).
-- Kept here so the repo reflects what's on the database.

begin;

alter table public.cp_projects
  add column if not exists job_type                   text,
  add column if not exists truck_load_date_parsed     date,
  add column if not exists truck_load_date_confidence text;
  -- confidence: 'iso' | 'day_mon_year' | 'mon_year_assumed_mid' | 'unparseable' | null

update public.cp_projects p
set    job_type = jt.name
from   public.cp_job_types jt
where  jt.mongo_id = p.job_type_mongo_id
  and  (p.job_type is null or p.job_type is distinct from jt.name);

update public.cp_projects set
  truck_load_date_parsed =
    case
      when truck_load_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        then to_date(truck_load_date, 'YYYY-MM-DD')
      when truck_load_date ~ '^[0-9]{1,2} [A-Za-z]{3,9} [0-9]{4}$'
        then to_date(truck_load_date, 'FMDD FMMon YYYY')
      when truck_load_date ~ '^[A-Za-z]{3,9} [0-9]{4}$'
        then to_date('15 ' || truck_load_date, 'FMDD FMMon YYYY')
      else null
    end,
  truck_load_date_confidence =
    case
      when truck_load_date is null or btrim(truck_load_date) = ''         then null
      when truck_load_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'               then 'iso'
      when truck_load_date ~ '^[0-9]{1,2} [A-Za-z]{3,9} [0-9]{4}$'        then 'day_mon_year'
      when truck_load_date ~ '^[A-Za-z]{3,9} [0-9]{4}$'                   then 'mon_year_assumed_mid'
      else 'unparseable'
    end;

create index if not exists idx_cp_projects_truck_load_date_parsed
  on public.cp_projects (truck_load_date_parsed);
create index if not exists idx_cp_projects_job_type
  on public.cp_projects (job_type);

commit;

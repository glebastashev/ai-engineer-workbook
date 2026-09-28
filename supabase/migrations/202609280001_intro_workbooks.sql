-- Only this application's tables and functions are changed.
create function public.valid_intro_answers(value jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare entry record;
begin
  if value is null or jsonb_typeof(value) <> 'object' or octet_length(value::text) > 128000 then return false; end if;
  for entry in select key, val from jsonb_each(value) as item(key,val) loop
    if entry.key = any(array['reason','interests','firstStep','questions','courseGoal','moduleGoal','goalEvidence','reviewDate','weekPlan','weekHours','firstTask','firstSession','reservePlan','weeklyReview']) then
      if jsonb_typeof(entry.val) <> 'string' or length(entry.val #>> '{}') > 4000 then return false; end if;
    elsif entry.key = any(array['lesson1Watched','programRead','orderUnderstood','startReady','lesson2Watched','goalChecked','moduleGoalChecked','reviewPlanned','lesson3Watched','scheduleChecked','taskChecked','calendarChecked']) then
      if jsonb_typeof(entry.val) <> 'boolean' then return false; end if;
    else return false;
    end if;
  end loop;
  return true;
end $$;

create table public.intro_workbooks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb check (public.valid_intro_answers(data)),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.intro_workbooks enable row level security;
revoke all on public.intro_workbooks from anon, authenticated;
grant select on public.intro_workbooks to authenticated;
grant insert(user_id) on public.intro_workbooks to authenticated;
grant update(data) on public.intro_workbooks to authenticated;
create policy intro_read_own on public.intro_workbooks for select to authenticated using ((select auth.uid()) = user_id and active);
create policy intro_create_own on public.intro_workbooks for insert to authenticated with check ((select auth.uid()) = user_id and active);
create policy intro_update_own on public.intro_workbooks for update to authenticated using ((select auth.uid()) = user_id and active) with check ((select auth.uid()) = user_id and active);

create function public.stamp_intro_workbook() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
create trigger stamp_intro_workbook before update on public.intro_workbooks for each row execute function public.stamp_intro_workbook();

create function public.open_intro_workbook() returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare record public.intro_workbooks%rowtype;
begin
  if auth.uid() is null then raise exception 'SIGN_IN_REQUIRED' using errcode = '42501'; end if;
  insert into public.intro_workbooks(user_id) values(auth.uid()) on conflict(user_id) do nothing;
  select * into record from public.intro_workbooks where user_id = auth.uid();
  if not found then raise exception 'ACCESS_CLOSED' using errcode = '42501'; end if;
  return jsonb_build_object('data',record.data,'updatedAt',record.updated_at);
end $$;

create function public.save_intro_workbook(p_patch jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare record public.intro_workbooks%rowtype;
begin
  if not public.valid_intro_answers(p_patch) then raise exception 'INVALID_ANSWERS' using errcode = '22023'; end if;
  perform public.open_intro_workbook();
  update public.intro_workbooks set data = data || p_patch where user_id = auth.uid() returning * into record;
  if not found then raise exception 'ACCESS_CLOSED' using errcode = '42501'; end if;
  return jsonb_build_object('data',record.data,'updatedAt',record.updated_at);
end $$;

revoke all on function public.open_intro_workbook(),public.save_intro_workbook(jsonb) from public,anon;
grant execute on function public.open_intro_workbook(),public.save_intro_workbook(jsonb) to authenticated;
revoke all on function public.stamp_intro_workbook() from public,anon,authenticated;

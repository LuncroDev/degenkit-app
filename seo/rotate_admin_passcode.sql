-- DegenKit: move the admin passcode OUT of the code.
-- Run once in Supabase → SQL Editor. Before running, replace NEW_LONG_RANDOM_PASSCODE below
-- with your own long random passcode (20+ characters) and keep it in a password manager.
-- The old passcode stops working as soon as this runs. The new one is never stored in plain text
-- (only its SHA-256 hash) and is never put in the website code: the admin panel asks for it when needed.

create table if not exists admin_secret (
  id int primary key default 1 check (id = 1),
  passcode_hash text not null
);
alter table admin_secret enable row level security;   -- no policies: nobody can read it through the API
revoke all on admin_secret from anon, authenticated;

insert into admin_secret (id, passcode_hash)
values (1, encode(sha256(convert_to('NEW_LONG_RANDOM_PASSCODE', 'UTF8')), 'hex'))
on conflict (id) do update set passcode_hash = excluded.passcode_hash;

create or replace function dk_admin_ok(passcode text) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from admin_secret
    where passcode_hash = encode(sha256(convert_to(coalesce(passcode, ''), 'UTF8')), 'hex')
  );
$$;
revoke execute on function dk_admin_ok(text) from public, anon, authenticated;

create or replace function get_mint_logs(passcode text)
returns setof mint_logs language plpgsql security definer set search_path = public as $$
begin
  if not dk_admin_ok(passcode) then raise exception 'invalid passcode'; end if;
  return query select * from mint_logs order by created_at desc;
end; $$;

create or replace function get_action_logs(passcode text)
returns setof actions_log language plpgsql security definer set search_path = public as $$
begin
  if not dk_admin_ok(passcode) then raise exception 'invalid passcode'; end if;
  return query select * from actions_log order by created_at desc;
end; $$;

create or replace function set_tool_fee(passcode text, p_tool_key text, p_fee_sol numeric)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not dk_admin_ok(passcode) then raise exception 'invalid passcode'; end if;
  update tool_fees set fee_sol = p_fee_sol, updated_at = now() where tool_key = p_tool_key;
end; $$;

grant execute on function get_mint_logs(text) to anon;
grant execute on function get_action_logs(text) to anon;
grant execute on function set_tool_fee(text, text, numeric) to anon;
-- list_free_wallets / add_free_wallet / remove_free_wallet already call dk_admin_ok(), so they pick this up automatically.

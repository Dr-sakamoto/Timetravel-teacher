-- 通信対戦の中継サーバー（Supabase の無料プロジェクト）の休止を防ぐための表。
-- .github/workflows/keepalive.yml が毎日、公開キーでこの表を読む。
-- プロジェクトを作り直した時は、SQL Editor でこれを実行する（2026-10-29 に適用済み）
create table public.keepalive (
  id int primary key,
  note text not null default 'read by .github/workflows/keepalive.yml'
);
insert into public.keepalive (id) values (1);
alter table public.keepalive enable row level security;
-- 公開キーで読めるのはこの表だけ・読み取りのみ（書き込みの権限は付けない）
create policy "keepalive is readable" on public.keepalive for select to anon using (true);

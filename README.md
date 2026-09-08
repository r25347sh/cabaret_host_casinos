# Cabaret Host Casinos

キャバホスト風カジノポイント管理システム（客側 / スタッフ側分離）

デザインは [5g-fest](https://github.com/r25347sh/5g-fest) 準拠。  
スタッフログインは [5G-staff](https://github.com/r25347sh/5G-staff) の `users.json` をそのまま使用。

## ファイル構成

```
.
├── index.html
├── admin.html
├── regist.html
└── src/
    ├── css/ (style / regist / index / admin)
    ├── js/ (main / supabase / regist / index / admin/*)
    └── data/users.json
```

## Supabase セットアップ（必須）

テーブルが無いと `Could not find the table 'public.guests'` になります。

1. [Supabase Dashboard](https://supabase.com/dashboard) → プロジェクト `ngjculhtbbxazgkkelvi`
2. 左メニュー **SQL Editor** → New query
3. 以下を貼って **Run**:

```sql
create table if not exists public.guests (
  id text primary key,
  name text not null,
  point1 integer not null default 0,
  point2 integer not null default 0,
  point3 integer not null default 0,
  created_at timestamptz default now()
);

alter table public.guests enable row level security;

create policy "anon_all" on public.guests
  for all
  to anon
  using (true)
  with check (true);
```

4. Table Editor で `guests` が見えれば OK。

## 使い方

- 客: `regist.html` → ニックネーム → `index.html`（QRスキャンでポイント）
- スタッフ: `admin.html`（5G-staff と同じ ID/PASS）→ QR生成

ゲーム: Point1=BJ / Point2=Poker / Point3=チンチロ

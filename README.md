# Cabaret Host Casinos

キャバホスト風カジノポイント管理システム（客側 / スタッフ側分離）

デザインは [5g-fest](https://github.com/r25347sh/5g-fest) 準拠。  
スタッフログインは [5G-staff](https://github.com/r25347sh/5G-staff) の `users.json` をそのまま使用。

## ファイル構成

```
.
├── index.html          # 客側ダッシュボード（ポイント表示 + QRスキャン）
├── admin.html          # スタッフ側（ログイン + ポイントQR生成）
├── regist.html         # 客側初回登録（ニックネーム）
└── src/
    ├── css/
    │   ├── style.css
    │   ├── regist.css
    │   ├── index.css
    │   └── admin.css
    ├── js/
    │   ├── main.js
    │   ├── supabase.js
    │   ├── regist.js
    │   ├── index.js
    │   └── admin/
    │       ├── login.js
    │       └── admin.js
    └── data/
        └── users.json  # スタッフ認証用
```

## Supabase セットアップ

1. プロジェクト: `https://ngjculhtbbxazgkkelvi.supabase.co`
2. SQL Editor で以下を実行:

```sql
create table if not exists public.guests (
  id text primary key,
  name text not null,
  point1 integer not null default 0,
  point2 integer not null default 0,
  point3 integer not null default 0,
  point4 integer not null default 0,
  created_at timestamptz default now()
);

-- anon から読み書き可能（イベント用途の簡易設定）
alter table public.guests enable row level security;

create policy "anon_all" on public.guests
  for all
  to anon
  using (true)
  with check (true);
```

3. 公開キーは `src/js/supabase.js` に記載済み。

## 使い方

### 客側
1. `regist.html` を開く → 自動で一意 ID 生成
2. ニックネーム入力 → Supabase に保存 → `index.html` へ自動遷移
3. ポイント表示。スタッフが発行した QR をスキャンしてポイント加算

### スタッフ側
1. `admin.html` でログイン（5G-staff と同じ ID/PASS）
2. ゲーム種類 + ポイント数を指定して QR 生成（デコレーション付き）
3. お客様に読み取ってもらう

## デプロイ

GitHub Pages（`.github/workflows/deploy.yml` あり）

## 注意

- 本番利用時は RLS をより厳格に、または Edge Function 経由に変更推奨
- カメラ権限が必要なため HTTPS 必須（GitHub Pages は HTTPS）

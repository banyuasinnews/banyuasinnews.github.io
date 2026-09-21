-- BANYUASIN NEWS CMS
-- Jalankan seluruh script ini di Supabase > SQL Editor.
-- Setelah itu buat user admin melalui Authentication > Users.

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  category text not null default 'BANYUASIN',
  excerpt text,
  content text not null,
  image_url text,
  author text not null default 'Redaksi',
  published_at timestamptz not null default now(),
  status text not null default 'published' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.articles enable row level security;

create policy "Public can read published articles"
on public.articles for select
using (status = 'published');

create policy "Logged in users can manage articles"
on public.articles for all
to authenticated
using (true)
with check (true);

-- Storage bucket untuk foto berita.
insert into storage.buckets (id, name, public)
values ('news-images', 'news-images', true)
on conflict (id) do nothing;

create policy "Public can view news images"
on storage.objects for select
using (bucket_id = 'news-images');

create policy "Logged in users can upload news images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'news-images');

create policy "Logged in users can update news images"
on storage.objects for update
to authenticated
using (bucket_id = 'news-images')
with check (bucket_id = 'news-images');

create policy "Logged in users can delete news images"
on storage.objects for delete
to authenticated
using (bucket_id = 'news-images');

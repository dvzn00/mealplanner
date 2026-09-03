-- Meal Planner — bucket de imagens das receitas
--
-- Depende do schema `storage`, que só existe em um projeto Supabase de
-- verdade. Por isso esta migração fica de fora da suíte de testes local.
--
-- Convenção de caminho: `<user_id>/<arquivo>`. É o que permite a política
-- de escrita distinguir a pasta de cada usuário.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recipe-images',
  'recipe-images',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;

drop policy if exists "recipe-images: leitura pública" on storage.objects;
create policy "recipe-images: leitura pública"
  on storage.objects for select
  using (bucket_id = 'recipe-images');

drop policy if exists "recipe-images: envio na própria pasta" on storage.objects;
create policy "recipe-images: envio na própria pasta"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'recipe-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "recipe-images: troca de arquivo próprio" on storage.objects;
create policy "recipe-images: troca de arquivo próprio"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'recipe-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'recipe-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "recipe-images: remoção de arquivo próprio" on storage.objects;
create policy "recipe-images: remoção de arquivo próprio"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'recipe-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

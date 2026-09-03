-- Meal Planner — bucket de imagens das receitas
--
-- Esta migração é a última de propósito, e tolera falta de permissão de
-- propósito. As duas coisas pela mesma razão:
--
-- Em projetos Supabase mais novos, `storage.objects` pertence a
-- `supabase_storage_admin`, e `create policy` sobre ela falha para o papel do
-- SQL Editor. O editor para no primeiro erro — então, quando este bloco vinha
-- no meio do arquivo, tudo que estava depois dele deixava de ser aplicado, em
-- silêncio. Foi assim que `handle_new_user` ficou com uma definição antiga sem
-- ninguém perceber.
--
-- Agora o bloco engole o erro de permissão e avisa. Se ele não puder rodar,
-- o bucket é criado pela interface de Storage, e nada mais é afetado.
--
-- Convenção de caminho: `<user_id>/<arquivo>`. É o que permite a política de
-- escrita distinguir a pasta de cada usuário.

do $bloco$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'recipe-images',
    'recipe-images',
    true,
    5242880, -- 5 MB
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  )
  on conflict (id) do nothing;

  execute $sql$
    drop policy if exists "recipe-images: leitura pública" on storage.objects
  $sql$;
  execute $sql$
    create policy "recipe-images: leitura pública"
      on storage.objects for select
      using (bucket_id = 'recipe-images')
  $sql$;

  execute $sql$
    drop policy if exists "recipe-images: envio na própria pasta" on storage.objects
  $sql$;
  execute $sql$
    create policy "recipe-images: envio na própria pasta"
      on storage.objects for insert to authenticated
      with check (
        bucket_id = 'recipe-images'
        and (storage.foldername(name))[1] = (select auth.uid())::text
      )
  $sql$;

  execute $sql$
    drop policy if exists "recipe-images: troca de arquivo próprio" on storage.objects
  $sql$;
  execute $sql$
    create policy "recipe-images: troca de arquivo próprio"
      on storage.objects for update to authenticated
      using (
        bucket_id = 'recipe-images'
        and (storage.foldername(name))[1] = (select auth.uid())::text
      )
      with check (
        bucket_id = 'recipe-images'
        and (storage.foldername(name))[1] = (select auth.uid())::text
      )
  $sql$;

  execute $sql$
    drop policy if exists "recipe-images: remoção de arquivo próprio" on storage.objects
  $sql$;
  execute $sql$
    create policy "recipe-images: remoção de arquivo próprio"
      on storage.objects for delete to authenticated
      using (
        bucket_id = 'recipe-images'
        and (storage.foldername(name))[1] = (select auth.uid())::text
      )
  $sql$;

exception
  when insufficient_privilege or undefined_table or undefined_object then
    raise notice
      'Bucket recipe-images não pôde ser configurado por SQL (%). Crie-o pela interface de Storage; o resto do schema seguiu normalmente.',
      sqlerrm;
end
$bloco$;

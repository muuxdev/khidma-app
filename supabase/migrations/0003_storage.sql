-- =============================================================================
-- Khidma — Storage buckets + policies
-- =============================================================================

-- Public buckets: avatars and service covers/images.
insert into storage.buckets (id, name, public)
values
  ('avatars',          'avatars',          true),
  ('service-images',   'service-images',   true)
on conflict (id) do nothing;

-- Private bucket: order/quote attachments (chat files).
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- avatars: anyone can read; users write into their own folder ({uid}/...)
-- ---------------------------------------------------------------------------
drop policy if exists "avatars_read_public" on storage.objects;
create policy "avatars_read_public" on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_write_self" on storage.objects;
create policy "avatars_write_self" on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = split_part(name, '/', 1)
  );

drop policy if exists "avatars_update_self" on storage.objects;
create policy "avatars_update_self" on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = split_part(name, '/', 1)
  );

drop policy if exists "avatars_delete_self" on storage.objects;
create policy "avatars_delete_self" on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = split_part(name, '/', 1)
  );

-- ---------------------------------------------------------------------------
-- service-images: public read; freelancer writes into their own folder.
-- ---------------------------------------------------------------------------
drop policy if exists "service_images_read_public" on storage.objects;
create policy "service_images_read_public" on storage.objects for select
  using (bucket_id = 'service-images');

drop policy if exists "service_images_write_self" on storage.objects;
create policy "service_images_write_self" on storage.objects for insert
  with check (
    bucket_id = 'service-images'
    and auth.uid()::text = split_part(name, '/', 1)
  );

drop policy if exists "service_images_update_self" on storage.objects;
create policy "service_images_update_self" on storage.objects for update
  using (
    bucket_id = 'service-images'
    and auth.uid()::text = split_part(name, '/', 1)
  );

drop policy if exists "service_images_delete_self" on storage.objects;
create policy "service_images_delete_self" on storage.objects for delete
  using (
    bucket_id = 'service-images'
    and auth.uid()::text = split_part(name, '/', 1)
  );

-- ---------------------------------------------------------------------------
-- attachments: only conversation participants can read/write under {uid}/...
-- ---------------------------------------------------------------------------
drop policy if exists "attachments_read_self" on storage.objects;
create policy "attachments_read_self" on storage.objects for select
  using (
    bucket_id = 'attachments'
    and auth.uid()::text = split_part(name, '/', 1)
  );

drop policy if exists "attachments_write_self" on storage.objects;
create policy "attachments_write_self" on storage.objects for insert
  with check (
    bucket_id = 'attachments'
    and auth.uid()::text = split_part(name, '/', 1)
  );

drop policy if exists "attachments_delete_self" on storage.objects;
create policy "attachments_delete_self" on storage.objects for delete
  using (
    bucket_id = 'attachments'
    and auth.uid()::text = split_part(name, '/', 1)
  );

import { createClient } from '@supabase/supabase-js';

// Client helper to call the Edge Function. Adjust base URL if needed for your deployment.
export async function uploadNFeFiles(supabase, files: File[], empresaId: string) {
  const form = new FormData();
  form.append('empresa_id', empresaId);
  files.forEach(f => form.append('files', f, f.name));

  // Attempt to get access token
  const session = await supabase.auth.getSession();
  const accessToken = session?.data?.session?.access_token;

  const resp = await fetch('/api/import-nfe', {
    method: 'POST',
    body: form,
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
}

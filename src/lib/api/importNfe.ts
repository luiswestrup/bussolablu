import { createClient } from '@supabase/supabase-js';

export async function uploadNFeFiles(supabase, files: File[], empresaId: string) {
  const form = new FormData();
  form.append('empresa_id', empresaId);
  files.forEach(f => form.append('files', f, f.name));

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

export async function reprocessMappings(empresaId: string, notaId: string, mappings: any[]) {
  const resp = await fetch('/api/import-nfe-reprocess', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ empresa_id: empresaId, nota_id: notaId, mappings })
  });
  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
}

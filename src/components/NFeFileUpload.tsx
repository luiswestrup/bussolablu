"use client";

import React, { useState } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { useEmpresa } from '@/context/EmpresaContext';

export default function NFeFileUpload({ onComplete }: { onComplete: (results: any[]) => void }) {
  const supabase = useSupabaseClient();
  const user = useUser();
  const { empresaAtiva } = useEmpresa();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files;
    if (!f) return;
    setFiles(Array.from(f));
  }

  async function submit() {
    if (!empresaAtiva) return alert('Selecione a empresa');
    if (files.length === 0) return alert('Selecione pelo menos um arquivo');
    setLoading(true);

    const form = new FormData();
    form.append('empresa_id', empresaAtiva.id);
    files.forEach(f => form.append('files', f, f.name));

    // call Edge Function endpoint. Adjust URL to your deployment (Supabase Functions URL) if needed.
    const resp = await fetch('/api/import-nfe', {
      method: 'POST',
      body: form,
      headers: {
        // pass through auth token
        Authorization: `Bearer ${(await supabase.auth.getSession()).data?.session?.access_token}`
      }
    });

    if (!resp.ok) {
      const text = await resp.text();
      alert('Import failed: ' + text);
      setLoading(false);
      return;
    }

    const json = await resp.json();
    setResults(json.results || []);
    setLoading(false);
    if (onComplete) onComplete(json.results || []);
  }

  return (
    <div className="bg-white p-4 rounded shadow">
      <input type="file" accept="text/xml,application/xml" multiple onChange={handleFiles} />
      <div className="mt-2">
        <button className="px-4 py-2 bg-sky-700 text-white rounded" onClick={submit} disabled={loading}>{loading ? 'Enviando...' : 'Importar lote'}</button>
      </div>

      {results.length > 0 && (
        <div className="mt-4">
          <h3 className="font-medium">Resultados</h3>
          <ul className="list-disc pl-6">
            {results.map((r, i) => (
              <li key={i}>{r.filename}: {r.status}{r.reason ? ` — ${r.reason}` : ''}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

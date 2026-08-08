"use client";

import React, { useState } from 'react';
import NFeFileUpload from '@/components/NFeFileUpload';
import NFeUnmappedItemsModal from '@/components/NFeUnmappedItemsModal';

export default function ImportNFePage() {
  const [summary, setSummary] = useState<any>(null);
  const [unmapped, setUnmapped] = useState<any[]>([]);

  function handleResults(results: any[]) {
    setSummary(results);
    // gather all unmapped items
    const allUnmapped: any[] = [];
    results.forEach(r => { if (r.unmappedItems && r.unmappedItems.length) allUnmapped.push({ filename: r.filename, nota_id: r.nota_id, items: r.unmappedItems }); });
    setUnmapped(allUnmapped);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Importar notas fiscais (NF-e)</h1>
      <p className="mb-4 text-sm text-gray-600">Faça upload de um ou mais arquivos XML de NF-e. Itens não reconhecidos poderão ser mapeados ao final.</p>

      <NFeFileUpload onComplete={handleResults} />

      {summary && (
        <div className="mt-6 bg-white p-4 rounded shadow">
          <h2 className="font-semibold">Resumo</h2>
          <pre className="text-sm">{JSON.stringify(summary, null, 2)}</pre>
        </div>
      )}

      <NFeUnmappedItemsModal items={unmapped} />
    </div>
  );
}

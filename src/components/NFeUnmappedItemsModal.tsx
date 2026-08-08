"use client";

import React from 'react';

export default function NFeUnmappedItemsModal({ items }: { items: any[] }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="mt-6 bg-white p-4 rounded shadow">
      <h3 className="font-semibold mb-2">Itens não reconhecidos</h3>
      {items.map((note, idx) => (
        <div key={idx} className="mb-4">
          <div className="font-medium">Arquivo: {note.filename} — Nota: {note.nota_id}</div>
          <div className="mt-2 grid gap-2">
            {note.items.map((it: any, i: number) => (
              <div key={i} className="p-2 border rounded bg-amber-50">
                <div><strong>Código fornecedor:</strong> {it.codigo || '-'}</div>
                <div><strong>Descrição:</strong> {it.descricao}</div>
                <div><strong>Quantidade:</strong> {it.quantidade}</div>
                <div><strong>Valor unitário:</strong> R$ {Number(it.valor_unitario).toFixed(2)}</div>
                <div className="mt-2">
                  {/* Controls to map to existing product or create new product could be added here */}
                  <button className="px-3 py-1 bg-sky-600 text-white rounded">Mapear</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

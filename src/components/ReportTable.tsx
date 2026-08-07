"use client";

import React from 'react';

export default function ReportTable({ data, columns }: { data: any[]; columns: string[] }) {
  if (!data) return <div>Sem dados</div>;

  return (
    <div className="overflow-auto">
      <table className="min-w-full bg-white">
        <thead>
          <tr>
            {columns.map(col => <th key={col} className="p-2 text-left">{col}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className={row.estoque_baixo ? 'bg-amber-50' : ''}>
              {columns.map(col => (
                <td key={col} className="p-2">{renderCell(row, col)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderCell(row: any, col: string) {
  const val = row[col] ?? row[col.toLowerCase()];
  if (typeof val === 'number') return val.toFixed ? val.toFixed(2) : String(val);
  if (typeof val === 'boolean') return val ? 'SIM' : 'NÃO';
  return String(val ?? '-');
}

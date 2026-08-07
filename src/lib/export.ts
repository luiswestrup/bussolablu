export function exportCSV(rows: any[], filename = 'export.csv') {
  if (!rows || rows.length === 0) {
    const blob = new Blob([""], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, filename);
    return;
  }

  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const r of rows) {
    const row = headers.map(h => {
      const cell = r[h] ?? '';
      const cellStr = String(cell).replace(/"/g, '""');
      return `"${cellStr}"`;
    }).join(',');
    lines.push(row);
  }

  const csvContent = '\uFEFF' + lines.join('\n'); // BOM
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

export function exportPDF(html: string, filename = 'report.pdf') {
  // Opção A: abrir nova janela com HTML imprimível para o usuário salvar como PDF via browser
  const win = window.open('', '_blank');
  if (!win) return alert('Não foi possível abrir a janela para exportar PDF.');
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${filename}</title><meta name="viewport" content="width=device-width,initial-scale=1"/><style>body{font-family:Arial,Helvetica,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px}</style></head><body>${html}</body></html>`);
  win.document.close();
  // Instruir o usuário: pode usar print para salvar
  setTimeout(() => {
    try { win.focus(); } catch (e) {}
  }, 500);
}

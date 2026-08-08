import { serve } from 'std/server';
import { createClient } from '@supabase/supabase-js';
import { XMLParser } from 'fast-xml-parser';

// Supabase Edge Function to import NF-e XML files in batch.
// Expects multipart/form-data with files (one or more) and empresa_id field.
// Requires Authorization: Bearer <access_token> header (user token). The function uses SERVICE_ROLE_KEY
// to perform DB writes, but verifies the caller's user and role before proceeding.

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return new Response('Server misconfigured', { status: 500 });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { global: { headers: { 'x-supabase-Edge-Function': 'import-nfe' } } });

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return new Response('Missing Authorization header', { status: 401 });
  const userToken = authHeader.split(' ')[1];

  // verify user
  const { data: userData, error: userErr } = await supabase.auth.getUser(userToken);
  if (userErr || !userData?.user) return new Response('Invalid user token', { status: 401 });
  const user = userData.user;

  const form = await req.formData();
  const empresa_id = form.get('empresa_id')?.toString();
  if (!empresa_id) return new Response('empresa_id is required', { status: 400 });

  // check user belongs to company and has allowed role (admin,financeiro,estoque per request)
  const { data: ueRows } = await supabase
    .from('usuario_empresa')
    .select('papel')
    .eq('user_id', user.id)
    .eq('empresa_id', empresa_id);

  const papel = (ueRows && ueRows[0] && (ueRows[0] as any).papel) || null;
  if (!papel) return new Response('User not associated with company', { status: 403 });
  if (!['admin','financeiro','estoque'].includes(papel)) return new Response('User role not allowed to import NF-e', { status: 403 });

  // collect files
  const files = form.getAll('files') as File[];
  if (!files || files.length === 0) return new Response('No files uploaded', { status: 400 });

  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

  const results: any[] = [];

  for (const file of files) {
    const filename = file.name || 'unnamed.xml';
    try {
      const xml = await file.text();
      const parsed = parser.parse(xml);

      // try to locate infNFe object
      const infNFe = parsed?.NFe?.infNFe || parsed?.nfeProc?.NFe?.infNFe || parsed?.infNFe;
      if (!infNFe) throw new Error('infNFe tag not found');

      // chave de acesso: atributo Id (ex: "NFe123...")
      const rawId = infNFe['@_Id'] || infNFe['@Id'] || infNFe['Id'];
      if (!rawId) throw new Error('infNFe/@Id (chave de acesso) not found');
      const chave_acesso = String(rawId).replace(/^NFe/i, '').trim();
      if (chave_acesso.length !== 44) throw new Error('chave_acesso length != 44');

      // emitente
      const emit = infNFe.emit;
      const emitCNPJ = emit?.CNPJ || emit?.Cnpj || (emit?.CNPJFisico ? emit.CNPJFisico : null);
      const emitNome = emit?.xNome || emit?.xnome || emit?.xNomeEmit;

      // total
      const vNF = Number(infNFe.total?.ICMSTot?.vNF || infNFe.total?.ICMSTot?.vNf || 0);

      // check duplicate
      const { data: existing } = await supabase.from('nota_fiscal_importada').select('id').eq('empresa_id', empresa_id).eq('chave_acesso', chave_acesso).limit(1);
      if (existing && existing.length > 0) {
        results.push({ filename, status: 'skipped', reason: 'already_imported' });
        continue; // skip
      }

      // find or create fornecedor by CNPJ
      let fornecedor_id: string | null = null;
      if (emitCNPJ) {
        const { data: found } = await supabase.from('fornecedor').select('id').eq('cnpj', emitCNPJ).limit(1);
        if (found && found.length > 0) fornecedor_id = found[0].id;
        else {
          const { data: ins, error: insErr } = await supabase.from('fornecedor').insert([{ cnpj: emitCNPJ, nome: emitNome || 'Fornecedor (importado)' }]).select().single();
          if (insErr) throw insErr;
          fornecedor_id = (ins as any).id;
        }
      }

      // insert nota_fiscal_importada (status pending importada)
      const numero_nota = infNFe.ide?.nNF || infNFe.ide?.nNf || null;
      const dataEmissaoRaw = infNFe.ide?.dEmi || infNFe.ide?.dEmissao || null;
      const data_emissao = dataEmissaoRaw ? new Date(String(dataEmissaoRaw)).toISOString().slice(0,10) : null;

      const { data: notaInserted, error: notaErr } = await supabase.from('nota_fiscal_importada').insert([{
        empresa_id,
        chave_acesso,
        fornecedor_id: fornecedor_id || null,
        numero_nota: numero_nota || null,
        data_emissao: data_emissao || null,
        valor_total: vNF || null,
        status: 'importada'
      }]).select().single();

      if (notaErr) throw notaErr;
      const notaId = (notaInserted as any).id;

      // items
      const det = infNFe.det ? (Array.isArray(infNFe.det) ? infNFe.det : [infNFe.det]) : [];
      const unmappedItems: any[] = [];
      let movementsCreated = 0;

      for (const item of det) {
        // depending on parser structure, item may be like { prod: { cProd, xProd, qCom, vUnCom, vProd } }
        const prod = item?.prod || item?.detProd || item;
        const cProd = prod?.cProd || prod?.cProd?.trim?.() || null;
        const xProd = prod?.xProd || prod?.xProd?.trim?.() || null;
        const qCom = Number(prod?.qCom || prod?.qCom?.replace?.(',','.') || 0);
        const vUnCom = Number(prod?.vUnCom || prod?.vUnCom?.replace?.(',','.') || 0);
        const vProd = Number(prod?.vProd || prod?.vProd?.replace?.(',','.') || (qCom * vUnCom));

        if (!cProd) {
          unmappedItems.push({ codigo: null, descricao: xProd, quantidade: qCom, valor_unitario: vUnCom, valor_total: vProd });
          continue;
        }

        // try find mapping
        const { data: mapRow } = await supabase.from('produto_fornecedor_map').select('produto_id').eq('empresa_id', empresa_id).eq('fornecedor_id', fornecedor_id).eq('codigo_produto_fornecedor', String(cProd)).limit(1);
        if (mapRow && mapRow.length > 0 && mapRow[0].produto_id) {
          const produto_id = mapRow[0].produto_id;
          // insert movimento_estoque (entrada)
          const { error: movErr } = await supabase.from('movimento_estoque').insert([{
            produto_id,
            tipo: 'entrada',
            quantidade: qCom,
            data: data_emissao || new Date().toISOString().slice(0,10),
            motivo: `Entrada por NF-e ${numero_nota || chave_acesso}`
          }]);
          if (movErr) throw movErr;
          movementsCreated += 1;
        } else {
          // insert pending item
          const { error: pendErr } = await supabase.from('nfe_item_pending').insert([{
            nota_fiscal_id: notaId,
            empresa_id,
            fornecedor_id: fornecedor_id || null,
            codigo_prod_fornecedor: String(cProd),
            descricao: xProd,
            quantidade: qCom,
            valor_unitario: vUnCom,
            valor_total: vProd
          }]);
          if (pendErr) throw pendErr;
          unmappedItems.push({ codigo: cProd, descricao: xProd, quantidade: qCom, valor_unitario: vUnCom, valor_total: vProd });
        }
      }

      // duplicatas: infNFe.cobr.dup
      const dups = infNFe.cobr ? (Array.isArray(infNFe.cobr?.dup) ? infNFe.cobr.dup : (infNFe.cobr?.dup ? [infNFe.cobr.dup] : [])) : [];
      let titlesCreated = 0;
      if (dups && dups.length > 0) {
        for (const dup of dups) {
          const nDup = dup?.nDup;
          const dVenc = dup?.dVenc ? new Date(String(dup.dVenc)).toISOString().slice(0,10) : null;
          const vDup = Number(dup?.vDup || 0);
          const descricao = `NF-e ${numero_nota || chave_acesso} — parcela ${nDup || ''}`;
          const { error: cpErr } = await supabase.from('conta_pagar').insert([{
            empresa_id,
            descricao,
            valor: vDup,
            fornecedor_id: fornecedor_id || null,
            data_vencimento: dVenc || new Date().toISOString().slice(0,10),
            data_pagamento: null
          }]);
          if (cpErr) throw cpErr;
          titlesCreated += 1;
        }
      } else {
        // create single estimated title: vencimento = data_emissao + 30 days
        const venc = data_emissao ? new Date(data_emissao) : new Date();
        venc.setDate(venc.getDate() + 30);
        const data_venc_est = venc.toISOString().slice(0,10);
        const descricao = `NF-e ${numero_nota || chave_acesso} — vencimento estimado`;
        const { error: cpErr } = await supabase.from('conta_pagar').insert([{
          empresa_id,
          descricao,
          valor: vNF || 0,
          fornecedor_id: fornecedor_id || null,
          data_vencimento: data_venc_est,
          data_pagamento: null
        }]);
        if (cpErr) throw cpErr;
        titlesCreated += 1;
      }

      results.push({ filename, status: 'imported', nota_id: notaId, movementsCreated, titlesCreated, unmappedCount: unmappedItems.length, unmappedItems });
    } catch (err: any) {
      console.error('Error processing file', filename, err?.message || err);
      // attempt to record a nota_fiscal_importada with status erro (best-effort)
      try {
        const parsedXmlAttempt = await (async () => { try { const txt = await file.text(); const p = parser.parse(txt); const inf = p?.NFe?.infNFe || p?.nfeProc?.NFe?.infNFe || p?.infNFe; const rawId = inf?.['@_Id'] || inf?.['@Id'] || null; return { chave: rawId ? String(rawId).replace(/^NFe/i,'') : null }; } catch (e){ return { chave: null }; }})();
        await supabase.from('nota_fiscal_importada').insert([{ empresa_id, chave_acesso: parsedXmlAttempt.chave || null, status: 'erro' }]);
      } catch (e) {
        // ignore
      }
      results.push({ filename, status: 'error', reason: err?.message || String(err) });
    }
  }

  return new Response(JSON.stringify({ results }), { status: 200, headers: { 'Content-Type': 'application/json' } });
});

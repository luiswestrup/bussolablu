import { serve } from 'std/server';
import { createClient } from '@supabase/supabase-js';

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return new Response('Server misconfigured', { status: 500 });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { global: { headers: { 'x-supabase-Edge-Function': 'import-nfe-reprocess' } } });

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return new Response('Missing Authorization header', { status: 401 });
  const userToken = authHeader.split(' ')[1];

  // verify user
  const { data: userData, error: userErr } = await supabase.auth.getUser(userToken);
  if (userErr || !userData?.user) return new Response('Invalid user token', { status: 401 });
  const user = userData.user;

  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const { empresa_id, nota_id, mappings } = body;
  if (!empresa_id || !nota_id || !Array.isArray(mappings)) return new Response('empresa_id, nota_id and mappings are required', { status: 400 });

  // check user belongs to company and has allowed role (admin, estoque)
  const { data: ueRows } = await supabase
    .from('usuario_empresa')
    .select('papel')
    .eq('user_id', user.id)
    .eq('empresa_id', empresa_id);

  const papel = (ueRows && ueRows[0] && (ueRows[0] as any).papel) || null;
  if (!papel) return new Response('User not associated with company', { status: 403 });
  if (!['admin','estoque'].includes(papel)) return new Response('User role not allowed to map items', { status: 403 });

  const results: any[] = [];
  let totalMappingsSaved = 0;
  let totalMovementsCreated = 0;
  let totalItemsResolved = 0;

  for (const m of mappings) {
    const codigo = m.codigo_prod_fornecedor;
    const produto_id = m.produto_id;
    const fornecedor_id = m.fornecedor_id;

    // upsert mapping
    try {
      const { data: existing } = await supabase.from('produto_fornecedor_map').select('id').eq('empresa_id', empresa_id).eq('fornecedor_id', fornecedor_id).eq('codigo_produto_fornecedor', codigo).limit(1);
      if (!existing || existing.length === 0) {
        const { error: insErr } = await supabase.from('produto_fornecedor_map').insert([{
          empresa_id,
          fornecedor_id,
          codigo_produto_fornecedor: codigo,
          produto_id
        }]);
        if (insErr) throw insErr;
        totalMappingsSaved += 1;
      }

      // find pending items for this nota and codigo
      const { data: pendings } = await supabase.from('nfe_item_pending').select('id,quantidade').eq('nota_fiscal_id', nota_id).eq('codigo_prod_fornecedor', codigo).eq('resolved', false);
      if (pendings && pendings.length > 0) {
        for (const p of pendings) {
          // create movimento_estoque
          const { error: movErr } = await supabase.from('movimento_estoque').insert([{
            produto_id,
            tipo: 'entrada',
            quantidade: p.quantidade,
            data: new Date().toISOString().slice(0,10),
            motivo: `Entrada por NF-e (reprocessada) - nota ${nota_id}`
          }]);
          if (movErr) throw movErr;
          totalMovementsCreated += 1;

          // mark pending resolved
          const { error: updErr } = await supabase.from('nfe_item_pending').update({ resolved: true }).eq('id', p.id);
          if (updErr) throw updErr;
          totalItemsResolved += 1;
        }
      }

      results.push({ codigo, mapped: true });
    } catch (e: any) {
      results.push({ codigo, mapped: false, reason: e?.message || String(e) });
    }
  }

  // Optionally, update nota_fiscal_importada status if all pendings resolved
  try {
    const { data: pendingLeft } = await supabase.from('nfe_item_pending').select('id').eq('nota_fiscal_id', nota_id).eq('resolved', false).limit(1);
    if (!pendingLeft || pendingLeft.length === 0) {
      await supabase.from('nota_fiscal_importada').update({ status: 'importada' }).eq('id', nota_id);
    }
  } catch (e) {
    // ignore
  }

  return new Response(JSON.stringify({ results, totalMappingsSaved, totalMovementsCreated, totalItemsResolved }), { status: 200, headers: { 'Content-Type': 'application/json' } });
});

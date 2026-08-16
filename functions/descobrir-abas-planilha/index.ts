import { serve } from 'std/server';
import { createClient } from '@supabase/supabase-js';
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

// Edge Function: descobrir-abas-planilha
// Recebe multipart/form-data: file (xlsx) e empresa_id
// Authorization: Bearer <user_token>
// Retorna list of sheets { name, sheetId } and missing (not in planilha_aba_config for empresa)

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return new Response('Server misconfigured', { status: 500 });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { 'x-supabase-Edge-Function': 'descobrir-abas-planilha' } }
  });

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return new Response('Missing Authorization header', { status: 401 });
  const userToken = authHeader.split(' ')[1];

  // verify user token
  const { data: userData, error: userErr } = await supabase.auth.getUser(userToken);
  if (userErr || !userData?.user) return new Response('Invalid user token', { status: 401 });
  const user = userData.user;

  try {
    const form = await req.formData();
    const empresa_id = form.get('empresa_id')?.toString();
    if (!empresa_id) return new Response('empresa_id is required', { status: 400 });

    // check user belongs to company
    const { data: ueRows } = await supabase.from('usuario_empresa').select('papel').eq('user_id', user.id).eq('empresa_id', empresa_id);
    if (!ueRows || ueRows.length === 0) return new Response('User not associated with company', { status: 403 });

    const file = form.get('file') as File | null;
    if (!file) return new Response('file is required', { status: 400 });

    const buffer = await file.arrayBuffer();

    // load zip
    const jszip = new JSZip();
    const zip = await jszip.loadAsync(Buffer.from(buffer));

    // typical path inside xlsx
    const workbookPath = 'xl/workbook.xml';
    const workbookFile = zip.file(workbookPath) || zip.file(workbookPath.replace(/^\//, ''));
    if (!workbookFile) {
      return new Response(JSON.stringify({ error: 'workbook.xml not found inside xlsx' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const workbookXml = await workbookFile.async('text');

    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const parsed = parser.parse(workbookXml);

    const sheetsRaw = parsed?.workbook?.sheets?.sheet || parsed?.sheets?.sheet;
    if (!sheetsRaw) {
      return new Response(JSON.stringify({ error: 'no sheets found in workbook.xml' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const sheets = Array.isArray(sheetsRaw) ? sheetsRaw : [sheetsRaw];
    const parsedSheets = sheets.map((s: any) => {
      const name = s['@_name'] || s.name || null;
      const sheetId = s['@_sheetId'] || s['@_sheetid'] || s['@_sheetID'] || s['@_rId'] || s.sheetId || s['@_id'] || null;
      // sheetId from workbook.xml is usually a number (string). Return as string.
      return { name: name || '', sheetId: sheetId ? String(sheetId) : '' };
    });

    // fetch existing planilha_aba_config for this empresa
    const { data: configs } = await supabase.from('planilha_aba_config').select('*').eq('empresa_id', empresa_id);
    const existingSet = new Set<string>();
    if (configs && configs.length) {
      for (const c of configs) {
        // attempt common property names that may hold gid/sheet id
        const gid = c.gid ?? c.sheet_gid ?? c.sheetId ?? c.sheet_id ?? c.sheetid ?? c.id;
        if (gid != null) existingSet.add(String(gid));
      }
    }

    const notRegistered = parsedSheets.filter((sh: any) => {
      // sheetId may be like '1' but Google gid can be different; the user expects sheetId==gid when exported by Google.
      return !existingSet.has(String(sh.sheetId));
    });

    return new Response(JSON.stringify({ sheets: parsedSheets, notRegistered }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('Error in descobrir-abas-planilha', err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});

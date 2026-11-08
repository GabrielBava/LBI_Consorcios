// Importa a planilha de planos (planos/Cadastro_de_Planos.xlsx) para js/planos.js, lido pelo simulador.
// Uso: npm run planos                      (planilha padrão)
//      npm run planos -- outra-planilha.xlsx
// Lê o .xlsx sem dependências (zip + XML), confere cada linha e só grava se não houver erro.
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const raiz = path.join(__dirname, '..');
const { ADMINISTRADORAS } = require('../js/calc.js');
const PLANILHA_PADRAO = path.join(raiz, 'planos', 'Cadastro_de_Planos.xlsx');
const SAIDA = path.join(raiz, 'js', 'planos.js');

// ---------------------------------------------------------------------------
// Leitura do .xlsx (zip com XML)
// ---------------------------------------------------------------------------

/** Arquivos do zip: { 'xl/workbook.xml': Buffer, ... } */
function abrirZip(buf) {
  let fim = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { fim = i; break; }
  }
  if (fim < 0) throw new Error('arquivo não é um .xlsx válido');
  const total = buf.readUInt16LE(fim + 10);
  let p = buf.readUInt32LE(fim + 16);
  const arquivos = {};
  for (let k = 0; k < total; k++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('índice do .xlsx corrompido');
    const metodo = buf.readUInt16LE(p + 10);
    const tamanho = buf.readUInt32LE(p + 20);
    const nLen = buf.readUInt16LE(p + 28), xLen = buf.readUInt16LE(p + 30), cLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const nome = buf.toString('utf8', p + 46, p + 46 + nLen);
    const ini = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const dados = buf.subarray(ini, ini + tamanho);
    arquivos[nome] = metodo === 0 ? dados : metodo === 8 ? zlib.inflateRawSync(dados) : null;
    p += 46 + nLen + xLen + cLen;
  }
  return arquivos;
}

const ENT = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
const texto = (x) => String(x).replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) =>
  e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENT[e] || m);
const atributos = (s) => { const o = {}; s.replace(/([\w:]+)="([^"]*)"/g, (m, k, v) => { o[k] = texto(v); }); return o; };
const textoRico = (xml) => (xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '').match(/<t\b[^>]*>[\s\S]*?<\/t>|<t\b[^>]*\/>/g) || [])
  .map((t) => texto(t.replace(/^<t\b[^>]*>|<\/t>$|^<t\b[^>]*\/>$/g, ''))).join('');
const letrasParaIndice = (l) => l.split('').reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;

/** Formatos de número que são percentuais (o Excel guarda 20% como 0,2). */
function estilosPercentuais(xml) {
  if (!xml) return [];
  const proprios = {};
  (xml.match(/<numFmt\b[^>]*>/g) || []).forEach((t) => { const a = atributos(t); proprios[a.numFmtId] = a.formatCode || ''; });
  const xfs = ((xml.match(/<cellXfs\b[\s\S]*?<\/cellXfs>/) || [''])[0].match(/<xf\b[^>]*/g)) || [];
  return xfs.map((t) => {
    const id = atributos(t).numFmtId || '0';
    if (id === '9' || id === '10') return true;
    const cod = (proprios[id] || '').replace(/"[^"]*"|\\./g, '');
    return cod.includes('%');
  });
}

/**
 * Abas da planilha: { nome: [[célula, ...], ...] }, cada célula { v: número | texto | booleano, pct: formato percentual }.
 */
function lerXlsx(buf) {
  const z = abrirZip(buf);
  const ler = (n) => (z[n] ? z[n].toString('utf8') : '');
  const compart = (ler('xl/sharedStrings.xml').match(/<si\b[\s\S]*?<\/si>/g) || []).map(textoRico);
  const pct = estilosPercentuais(ler('xl/styles.xml'));
  const rels = {};
  (ler('xl/_rels/workbook.xml.rels').match(/<Relationship\b[^>]*>/g) || []).forEach((t) => { const a = atributos(t); rels[a.Id] = a.Target; });
  const abas = {};
  (ler('xl/workbook.xml').match(/<sheet\b[^>]*>/g) || []).forEach((t) => {
    const a = atributos(t);
    const alvo = rels[a['r:id']] || '';
    const arq = alvo.startsWith('/') ? alvo.slice(1) : 'xl/' + alvo.replace(/^\.\//, '');
    const linhas = [];
    const xml = ler(arq);
    (xml.match(/<row\b[^>]*>[\s\S]*?<\/row>|<row\b[^>]*\/>/g) || []).forEach((row) => {
      const r = Number(atributos(row.match(/<row\b[^>]*/)[0]).r) - 1;
      const cel = [];
      const re = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
      let m;
      while ((m = re.exec(row))) {
        const a = atributos(m[1]);
        const corpo = m[2] || '';
        const v = (corpo.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
        let valor = null;
        if (a.t === 's') valor = v === undefined ? null : compart[Number(v)];
        else if (a.t === 'inlineStr') valor = textoRico((corpo.match(/<is>[\s\S]*?<\/is>/) || [''])[0]);
        else if (a.t === 'str' || a.t === 'e') valor = v === undefined ? null : texto(v);
        else if (a.t === 'b') valor = v === '1';
        else if (v !== undefined) valor = Number(v);
        const col = a.r ? letrasParaIndice(a.r.replace(/\d+/g, '')) : cel.length;
        cel[col] = { v: valor, pct: !!pct[Number(a.s || 0)] };
      }
      linhas[r] = cel;
    });
    abas[a.name] = linhas;
  });
  return abas;
}

// ---------------------------------------------------------------------------
// Planilha → planos do simulador
// ---------------------------------------------------------------------------

const chave = (t) => String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9%]+/g, ' ').trim();

// Colunas reconhecidas pelo início do título (sem acentos e sem o * de obrigatório)
const COLUNAS = [
  ['administradora', /^administradora/],
  ['nome', /^(nome do plano|plano)\b/],
  ['categoria', /^(categoria|tipo)\b/],
  ['prazo', /^prazo/],
  ['creditoMinimo', /^credito minimo/],
  ['creditoMaximo', /^credito maximo/],
  ['taxaAdm', /^taxa de administracao|^taxa adm/],
  ['fundoReserva', /^fundo de reserva/],
  ['adesaoPct', /^taxa de adesao|^adesao %|^adesao$/],
  ['adesaoMeses', /^adesao diluida|^diluicao/],
  ['seguroPct', /^seguro/],
  ['modalidade', /^modalidade/],
  ['redutorOutro', /^outro redutor/],
  ['embutidoPct', /^lance embutido/],
  ['fixoPct', /^lance fixo/],
  ['abatimento', /^abatimento/],
  ['indice', /^indice/],
  ['indiceTaxa', /^taxa estimada/],
  ['ativo', /^ativo/],
  ['id', /^codigo/],
  ['observacoes', /^observa/]
];
const OBRIGATORIAS = { administradora: 'Administradora', nome: 'Plano', categoria: 'Tipo', prazo: 'Prazo (meses)', creditoMinimo: 'Crédito mínimo (R$)', taxaAdm: 'Taxa de administração (%)', fundoReserva: 'Fundo de reserva (%)' };
const ROTULOS = Object.assign({ creditoMaximo: 'Crédito máximo (R$)', adesaoPct: 'Taxa de adesão (%)', adesaoMeses: 'Adesão diluída em (meses)', seguroPct: 'Seguro prestamista (% a.m.)', redutorOutro: 'Outro redutor (%)', embutidoPct: 'Lance embutido (%)', fixoPct: 'Lance fixo (%)', indiceTaxa: 'Taxa estimada do índice (% a.a.)' }, OBRIGATORIAS);
const PERCENTUAIS = ['taxaAdm', 'fundoReserva', 'adesaoPct', 'seguroPct', 'redutorOutro', 'embutidoPct', 'fixoPct', 'indiceTaxa'];
const MODALIDADES = { 'parcela integral': 0, integral: 0, 'redutor de 50%': 50, 'redutor 50%': 50, 'redutor de 25%': 25, 'redutor 25%': 25 };
const INDICES = { incc: 'incc', ipca: 'ipca', inpc: 'inpc', 'pre fixado 5%': 'pre5', 'pre fixado 6%': 'pre6', 'pre 5%': 'pre5', 'pre 6%': 'pre6', outro: 'outro' };
const INDICE_PADRAO = { imovel: 'incc', veiculo: 'ipca' };

/** Número de uma célula: aceita número, "20,5", "R$ 200.000,00" e "20%" (o percentual é tratado pela coluna). */
function numero(c, percentual) {
  if (!c || c.v === null || c.v === undefined || c.v === '') return null;
  if (typeof c.v === 'number') return percentual && c.pct ? Math.round(c.v * 100 * 1e9) / 1e9 : c.v;
  let t = String(c.v).replace(/R\$|%|\s/g, '');
  if (!t) return null;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}
const textoCel = (c) => (c && c.v !== null && c.v !== undefined ? String(c.v).trim() : '');
const codigoAuto = (adm, nome) => (chave(adm) + '-' + chave(nome)).toUpperCase().replace(/%/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 40);

/**
 * Converte as linhas da aba Planos em planos do simulador.
 * Devolve { planos, erros, avisos, inativos }; erros e avisos citam a linha da planilha.
 */
function planosDaPlanilha(linhas) {
  const erros = [], avisos = [];
  const iCab = linhas.findIndex((l) => l && l.some((c) => c && /^administradora/.test(chave(c.v))));
  if (iCab < 0) return { planos: [], erros: ['Cabeçalho não encontrado: a planilha precisa da coluna "Administradora".'], avisos, inativos: 0 };
  const mapa = {};
  linhas[iCab].forEach((c, i) => {
    const k = chave(c && c.v);
    const achada = COLUNAS.find(([, re]) => re.test(k));
    if (achada && mapa[achada[0]] === undefined) mapa[achada[0]] = i;
  });
  Object.entries(OBRIGATORIAS).forEach(([k, rot]) => { if (mapa[k] === undefined) erros.push('Coluna "' + rot + '" não encontrada no cabeçalho.'); });
  if (erros.length) return { planos: [], erros, avisos, inativos: 0 };

  const planos = [];
  const ids = new Map(), nomes = new Map();
  // Grafia da administradora: a da lista do simulador (HS, Itaú...) ou a da primeira linha em que aparece
  const grafias = new Map(ADMINISTRADORAS.map((a) => [chave(a), a]));
  let inativos = 0;
  for (let r = iCab + 1; r < linhas.length; r++) {
    const l = linhas[r] || [];
    const cel = (k) => (mapa[k] === undefined ? null : l[mapa[k]]);
    // Linha vazia (a coluna Conferência e as observações sozinhas não contam)
    if (!Object.keys(mapa).some((k) => k !== 'observacoes' && textoCel(cel(k)))) continue;
    const n = r + 1;
    const erro = (m) => erros.push('Linha ' + n + ': ' + m);
    const ativo = chave(textoCel(cel('ativo')));
    if (ativo && /^(nao|n|false|0|inativo)$/.test(ativo)) { inativos++; continue; }

    const v = {};
    Object.keys(mapa).forEach((k) => { v[k] = ['administradora', 'nome', 'categoria', 'modalidade', 'abatimento', 'indice', 'ativo', 'id', 'observacoes'].includes(k) ? textoCel(cel(k)) : numero(cel(k), PERCENTUAIS.includes(k)); });
    Object.entries(OBRIGATORIAS).forEach(([k, rot]) => { if (v[k] === '' || v[k] === null) erro('falta ' + rot + '.'); });
    Object.keys(v).forEach((k) => { if (Number.isNaN(v[k])) erro('valor inválido em ' + (ROTULOS[k] || k) + '.'); });
    // "(exemplo)" no nome ou código EX-...: plano de exemplo (o simulador mostra "(exemplo)" na lista)
    const exemplo = /\(\s*exemplo\s*\)/i.test(v.nome) || /^ex-/i.test(v.id || '');
    const nome = v.nome.replace(/\s*\(\s*exemplo\s*\)\s*/gi, ' ').trim();
    const adm = v.administradora ? grafias.get(chave(v.administradora)) || v.administradora : '';
    if (adm && !grafias.has(chave(adm))) grafias.set(chave(adm), adm);
    const pl = { id: v.id || codigoAuto(adm, nome), administradora: adm, nome };
    if (exemplo) pl.exemplo = true;
    const cat = chave(v.categoria);
    if (v.categoria) {
      if (/^im/.test(cat)) pl.categoria = 'imovel';
      else if (/^ve/.test(cat)) pl.categoria = 'veiculo';
      else erro('tipo "' + v.categoria + '" inválido (use Imóvel ou Veículo).');
    }
    const tem = (k) => mapa[k] !== undefined;
    const faixa = (k, rot, min, max, inteiro) => {
      const x = v[k];
      if (x === null || x === undefined || Number.isNaN(x)) return;
      if (x < min || x > max || (inteiro && !Number.isInteger(x))) erro(rot + ' fora da faixa (' + (inteiro ? 'inteiro de ' : 'de ') + String(min).replace('.', ',') + ' a ' + String(max).replace('.', ',') + ').');
      else pl[k] = x;
    };
    faixa('prazo', 'Prazo', 1, 420, true);
    faixa('creditoMinimo', 'Crédito mínimo', 0.01, 1e9);
    faixa('creditoMaximo', 'Crédito máximo', 0.01, 1e9);
    if (pl.creditoMaximo !== undefined && pl.creditoMinimo !== undefined && pl.creditoMaximo < pl.creditoMinimo) erro('crédito máximo menor que o crédito mínimo.');
    faixa('taxaAdm', 'Taxa de administração', 0, 100);
    faixa('fundoReserva', 'Fundo de reserva', 0, 100);
    faixa('embutidoPct', 'Lance embutido', 0, 100);
    faixa('fixoPct', 'Lance fixo', 0, 100);
    if (v.indice) {
      const ind = INDICES[chave(v.indice)] || (/^pr/.test(chave(v.indice)) && /6/.test(v.indice) ? 'pre6' : /^pr/.test(chave(v.indice)) ? 'pre5' : null);
      if (ind) pl.indice = ind;
      else erro('índice "' + v.indice + '" inválido (use INCC, IPCA, INPC, Pré-fixado 5% ou Pré-fixado 6%).');
    } else if (pl.categoria) pl.indice = INDICE_PADRAO[pl.categoria];

    // Colunas opcionais (aceitas se forem acrescentadas à planilha): só valem quando a coluna existe
    if (tem('adesaoPct')) {
      faixa('adesaoPct', 'Taxa de adesão', 0, 100);
      if (pl.adesaoPct === undefined) pl.adesaoPct = 0;
      faixa('adesaoMeses', 'Adesão diluída em (meses)', 1, 420, true);
      if (pl.adesaoPct > 0 && v.adesaoMeses == null) erro('informe em quantos meses a adesão é diluída.');
      if (pl.adesaoMeses !== undefined && pl.prazo !== undefined && pl.adesaoMeses > pl.prazo) erro('a adesão não pode ser diluída em mais meses que o prazo.');
    }
    if (tem('seguroPct')) faixa('seguroPct', 'Seguro prestamista', 0, 100);
    if (tem('modalidade')) {
      const mod = chave(v.modalidade);
      if (!mod || MODALIDADES[mod] !== undefined) pl.redutorPct = mod ? MODALIDADES[mod] : 0;
      else if (/^outro/.test(mod)) {
        faixa('redutorOutro', 'Outro redutor', 0.01, 99.99);
        if (v.redutorOutro == null) erro('modalidade "Outro percentual": informe o outro redutor (%).');
        if (pl.redutorOutro !== undefined) pl.redutorPct = pl.redutorOutro;
      } else erro('modalidade de parcela "' + v.modalidade + '" inválida.');
      delete pl.redutorOutro;
    }
    if (tem('abatimento')) {
      const abat = chave(v.abatimento);
      if (!abat || /^parc/.test(abat)) pl.abatimento = 'parcela';
      else if (/^praz/.test(abat)) pl.abatimento = 'prazo';
      else erro('abatimento "' + v.abatimento + '" inválido (use Parcela ou Prazo).');
    }
    faixa('indiceTaxa', 'Taxa estimada do índice', -50, 100);
    if (pl.indice && /^pre/.test(pl.indice)) delete pl.indiceTaxa;

    const kId = pl.id.toLowerCase(), kNome = chave(pl.administradora) + '|' + chave(pl.nome);
    if (nomes.has(kNome)) erro('plano "' + pl.nome + '" repetido na administradora ' + pl.administradora + ' (linha ' + nomes.get(kNome) + ').');
    else nomes.set(kNome, n);
    if (ids.has(kId)) { if (v.id) erro('código "' + pl.id + '" repetido (linha ' + ids.get(kId) + ').'); }
    else ids.set(kId, n);
    if (pl.exemplo) avisos.push('Linha ' + n + ': plano de exemplo (' + pl.nome + '). Apague a linha quando cadastrar os planos reais.');
    planos.push(pl);
  }
  if (!planos.length && !erros.length) erros.push('Nenhum plano ativo na planilha.');
  return { planos, erros, avisos, inativos };
}

/** Lê a aba "Planos" (ou a primeira aba) do arquivo. */
function importar(arquivo) {
  const abas = lerXlsx(fs.readFileSync(arquivo));
  const nome = Object.keys(abas).find((n) => chave(n) === 'planos') || Object.keys(abas)[0];
  return planosDaPlanilha(abas[nome] || []);
}

function conteudoJs(planos, origem) {
  const agora = new Date();
  const dd = (x) => String(x).padStart(2, '0');
  const quando = dd(agora.getDate()) + '/' + dd(agora.getMonth() + 1) + '/' + agora.getFullYear() + ' ' + dd(agora.getHours()) + ':' + dd(agora.getMinutes());
  return '/* Planos cadastrados no simulador: administradora, plano, crédito mínimo e máximo, prazo, taxas, lances e índice.\n' +
    ' * Gerado por "npm run planos" a partir de ' + origem + ' em ' + quando + '.\n' +
    ' * Não edite à mão: altere a planilha e rode o comando de novo. */\n' +
    'window.CONFIG_SIMULADOR = window.CONFIG_SIMULADOR || {};\n' +
    'window.CONFIG_SIMULADOR.planos = [\n' + planos.map((p) => '  ' + JSON.stringify(p)).join(',\n') + '\n];\n';
}

if (require.main === module) {
  const arquivo = path.resolve(process.argv[2] || PLANILHA_PADRAO);
  if (!fs.existsSync(arquivo)) { console.error('Planilha não encontrada: ' + arquivo); process.exit(1); }
  let res;
  try { res = importar(arquivo); } catch (e) { console.error('Não foi possível ler a planilha: ' + e.message); process.exit(1); }
  res.avisos.forEach((a) => console.warn('Aviso: ' + a));
  if (res.erros.length) {
    console.error('A planilha tem ' + res.erros.length + ' erro(s); js/planos.js não foi alterado:');
    res.erros.forEach((e) => console.error('  - ' + e));
    process.exit(1);
  }
  const origem = path.relative(raiz, arquivo).split(path.sep).join('/');
  fs.writeFileSync(SAIDA, conteudoJs(res.planos, origem.startsWith('..') ? path.basename(arquivo) : origem));
  const adms = new Set(res.planos.map((p) => p.administradora));
  console.log('js/planos.js gerado: ' + res.planos.length + ' plano(s) de ' + adms.size + ' administradora(s)' + (res.inativos ? '; ' + res.inativos + ' inativo(s) ignorado(s)' : '') + '.');
  console.log('Gere a nova versão em seguida (npm run build:protegido).');
}

module.exports = { lerXlsx, planosDaPlanilha, importar, numero, conteudoJs };

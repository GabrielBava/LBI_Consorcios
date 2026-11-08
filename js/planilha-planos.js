/*
 * Leitura da planilha de planos (.xlsx) no navegador e no Node, sem dependências.
 * Usada pelo botão "Carregar planilha de planos" do simulador e por "npm run planos" (gera js/planos.js).
 *
 * - Lê todas as abas com cabeçalho reconhecido (as demais, como Instruções, são ignoradas).
 * - Colunas reconhecidas pelo título, em qualquer ordem e com variações usuais
 *   ("Taxa adm", "Tx. Adm.", "FR", "Segmento", "Produto"...).
 * - Sem coluna Administradora, vale o nome da aba (uma aba por administradora).
 * - Sem coluna Tipo, o tipo (Imóvel/Veículo) vem do nome do plano ou da aba.
 * - Percentuais em número (20 = 20%) ou em célula de percentual (0,2 formatado como 20%).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PlanilhaPlanos = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Leitura do .xlsx (zip com XML)
  // ---------------------------------------------------------------------------

  const utf8 = (b) => new TextDecoder('utf-8').decode(b);

  /** Descompacta no navegador (DecompressionStream); no Node o importador passa o zlib. */
  async function inflarNavegador(bytes) {
    if (typeof DecompressionStream === 'undefined') throw new Error('navegador sem suporte à leitura de .xlsx; atualize o navegador');
    const fluxo = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(fluxo).arrayBuffer());
  }

  /** Arquivos do zip: { 'xl/workbook.xml': Uint8Array, ... } (só os XML usados). */
  async function abrirZip(bytes, inflar) {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const u32 = (i) => dv.getUint32(i, true), u16 = (i) => dv.getUint16(i, true);
    let fim = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
      if (u32(i) === 0x06054b50) { fim = i; break; }
    }
    if (fim < 0) throw new Error('o arquivo não é uma planilha .xlsx');
    const total = u16(fim + 10);
    let p = u32(fim + 16);
    const arquivos = {};
    for (let k = 0; k < total; k++) {
      if (u32(p) !== 0x02014b50) throw new Error('planilha .xlsx corrompida');
      const metodo = u16(p + 10), tamanho = u32(p + 20);
      const nLen = u16(p + 28), xLen = u16(p + 30), cLen = u16(p + 32);
      const local = u32(p + 42);
      const nome = utf8(bytes.subarray(p + 46, p + 46 + nLen));
      p += 46 + nLen + xLen + cLen;
      if (!/^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|styles\.xml|worksheets\/[^/]+\.xml)$/.test(nome)) continue;
      const ini = local + 30 + u16(local + 26) + u16(local + 28);
      const dados = bytes.subarray(ini, ini + tamanho);
      if (metodo === 0) arquivos[nome] = dados;
      else if (metodo === 8) arquivos[nome] = await inflar(dados);
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

  /** Abas na ordem da planilha: [{ nome, linhas }], cada célula { v: número | texto | booleano, pct: formato percentual }. */
  async function lerXlsx(bytes, inflar) {
    const z = await abrirZip(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), inflar || inflarNavegador);
    const ler = (n) => (z[n] ? utf8(z[n]) : '');
    const compart = (ler('xl/sharedStrings.xml').match(/<si\b[\s\S]*?<\/si>/g) || []).map(textoRico);
    const pct = estilosPercentuais(ler('xl/styles.xml'));
    const rels = {};
    (ler('xl/_rels/workbook.xml.rels').match(/<Relationship\b[^>]*>/g) || []).forEach((t) => { const a = atributos(t); rels[a.Id] = a.Target; });
    return (ler('xl/workbook.xml').match(/<sheet\b[^>]*>/g) || []).map((t) => {
      const a = atributos(t);
      const alvo = rels[a['r:id']] || '';
      const arq = alvo.startsWith('/') ? alvo.slice(1) : 'xl/' + alvo.replace(/^\.\//, '');
      const linhas = [];
      (ler(arq).match(/<row\b[^>]*>[\s\S]*?<\/row>|<row\b[^>]*\/>/g) || []).forEach((row, i) => {
        const rAttr = Number(atributos(row.match(/<row\b[^>]*/)[0]).r);
        const r = rAttr ? rAttr - 1 : i;
        const cel = [];
        const re = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
        let m;
        while ((m = re.exec(row))) {
          const at = atributos(m[1]);
          const corpo = m[2] || '';
          const v = (corpo.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
          let valor = null;
          if (at.t === 's') valor = v === undefined ? null : compart[Number(v)];
          else if (at.t === 'inlineStr') valor = textoRico((corpo.match(/<is>[\s\S]*?<\/is>/) || [''])[0]);
          else if (at.t === 'str' || at.t === 'e') valor = v === undefined ? null : texto(v);
          else if (at.t === 'b') valor = v === '1';
          else if (v !== undefined) valor = Number(v);
          const col = at.r ? letrasParaIndice(at.r.replace(/\d+/g, '')) : cel.length;
          cel[col] = { v: valor, pct: !!pct[Number(at.s || 0)] };
        }
        linhas[r] = cel;
      });
      return { nome: a.name || '', linhas };
    });
  }

  // ---------------------------------------------------------------------------
  // Planilha → planos do simulador
  // ---------------------------------------------------------------------------

  const chave = (t) => String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9%]+/g, ' ').trim();

  // Colunas reconhecidas pelo início do título (sem acentos, pontuação e o * de obrigatório); vale a primeira que casar
  const COLUNAS = [
    ['administradora', /^(administradora|adm)\b/],
    ['nome', /^(nome do plano|plano|produto|nome)\b/],
    ['categoria', /^(categoria|tipo|segmento|bem)\b/],
    ['prazo', /^prazo/],
    ['creditoMinimo', /^(credito|carta|valor)( de credito| do credito| da carta)? min/],
    ['creditoMaximo', /^(credito|carta|valor)( de credito| do credito| da carta)? max/],
    ['credito', /^(credito|carta de credito|valor do credito|valor da carta)( r)?$/],
    ['taxaAdm', /^(taxa de administracao|taxa administrativa|taxa de adm\b|taxa adm|tx adm|tx de adm|ta)\b/],
    ['fundoReserva', /^(fundo de reserva|fundo reserva|f reserva|fr)\b/],
    ['adesaoMeses', /^(adesao diluida|diluicao)/],
    ['adesaoPct', /^(taxa de adesao|adesao)\b/],
    ['seguroPct', /^seguro/],
    ['redutorOutro', /^outro redutor/],
    ['modalidade', /^modalidade/],
    ['redutorPct', /^(redutor|parcela reduzida)\b/],
    ['embutidoPct', /^(lance )?embutido/],
    ['fixoPct', /^(lance )?fixo/],
    ['abatimento', /^abatimento/],
    ['indiceTaxa', /^taxa estimada/],
    ['indice', /^(indice|reajuste|indexador|correcao)/],
    ['ativo', /^ativo/],
    ['id', /^(codigo|id)\b/],
    ['observacoes', /^(observa|obs)\b/]
  ];
  const TEXTOS = ['administradora', 'nome', 'categoria', 'modalidade', 'abatimento', 'indice', 'ativo', 'id', 'observacoes'];
  const OBRIGATORIAS = { administradora: 'Administradora', nome: 'Plano', categoria: 'Tipo', prazo: 'Prazo (meses)', creditoMinimo: 'Crédito mínimo (R$)', taxaAdm: 'Taxa de administração (%)', fundoReserva: 'Fundo de reserva (%)' };
  const ROTULOS = Object.assign({ creditoMaximo: 'Crédito máximo (R$)', adesaoPct: 'Taxa de adesão (%)', adesaoMeses: 'Adesão diluída em (meses)', seguroPct: 'Seguro prestamista (% a.m.)', redutorOutro: 'Outro redutor (%)', redutorPct: 'Redutor (%)', embutidoPct: 'Lance embutido (%)', fixoPct: 'Lance fixo (%)', indiceTaxa: 'Taxa estimada do índice (% a.a.)' }, OBRIGATORIAS);
  const PERCENTUAIS = ['taxaAdm', 'fundoReserva', 'adesaoPct', 'seguroPct', 'redutorOutro', 'redutorPct', 'embutidoPct', 'fixoPct', 'indiceTaxa'];
  const MODALIDADES = { 'parcela integral': 0, integral: 0, 'redutor de 50%': 50, 'redutor 50%': 50, 'redutor de 25%': 25, 'redutor 25%': 25 };
  const INDICES = { incc: 'incc', ipca: 'ipca', inpc: 'inpc', 'pre fixado 5%': 'pre5', 'pre fixado 6%': 'pre6', 'pre 5%': 'pre5', 'pre 6%': 'pre6', outro: 'outro' };
  const INDICE_PADRAO = { imovel: 'incc', veiculo: 'ipca' };
  const ABA_GENERICA = /^(planos?|planilha\s*\d*|sheet\s*\d*|plan\s*\d*|dados|base|tabela\s*\d*|cadastro.*|produtos?)$/;
  const ABA_IGNORADA = /^(instruc|como preencher|listas?$|legenda)/;
  const MESES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const mesDaAba = (nome) => { const k = chave(nome); const i = MESES.findIndex((m) => k.startsWith(m) || k.startsWith(m.slice(0, 3) + ' ') || k === m.slice(0, 3)); return i; };
  const min1 = (t) => t.charAt(0).toLowerCase() + t.slice(1);

  /** Imóvel ou veículo pelo texto (coluna Tipo, nome do plano ou nome da aba). */
  function categoriaDoTexto(t) {
    const k = chave(t);
    if (/\b(imove|imovei|imobil|casa|apart|terreno|constru|reforma)/.test(k) || /^im/.test(k)) return 'imovel';
    if (/\b(veic|auto|carro|moto|caminh|pesado|leve|trator|maquina|onibus)/.test(k) || /^ve/.test(k)) return 'veiculo';
    return null;
  }

  /** Número de uma célula: aceita número, "20,5", "R$ 200.000,00" e "20%" (o percentual é tratado pela coluna). */
  function numero(c, percentual) {
    if (!c || c.v === null || c.v === undefined || c.v === '') return null;
    if (typeof c.v === 'number') return percentual && c.pct ? Math.round(c.v * 100 * 1e9) / 1e9 : c.v;
    let t = String(c.v).replace(/R\$|%|\s|a\.?\s?[ma]\.?$/gi, '');
    if (!t) return null;
    if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
    const n = Number(t);
    return Number.isFinite(n) ? n : NaN;
  }
  const textoCel = (c) => (c && c.v !== null && c.v !== undefined ? String(c.v).trim() : '');
  const codigoAuto = (adm, nome) => (chave(adm) + '-' + chave(nome)).toUpperCase().replace(/%/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 40);

  /** Linha do cabeçalho: a primeira (entre as 20 primeiras) com o nome do plano e ao menos mais duas colunas conhecidas. */
  function acharCabecalho(linhas) {
    for (let r = 0; r < Math.min(linhas.length, 20); r++) {
      const l = linhas[r];
      if (!l) continue;
      const mapa = {};
      l.forEach((c, i) => {
        const k = chave(c && c.v);
        if (!k) return;
        const achada = COLUNAS.find(([, re]) => re.test(k));
        if (achada && mapa[achada[0]] === undefined) mapa[achada[0]] = i;
      });
      if (mapa.credito !== undefined && mapa.creditoMinimo === undefined) mapa.creditoMinimo = mapa.credito;
      delete mapa.credito;
      if (mapa.nome !== undefined && Object.keys(mapa).length >= 3) return { r, mapa };
    }
    return null;
  }

  /**
   * Converte as abas da planilha em planos do simulador.
   * opcoes.administradoras: grafia oficial (ex.: "porto seguro" → "Porto Seguro").
   * Devolve { planos, erros, avisos, inativos, abas }; erros e avisos citam a linha (e a aba, quando há mais de uma).
   */
  function planosDoLivro(abas, opcoes) {
    const o = opcoes || {};
    const erros = [], avisos = [], planos = [];
    const ids = new Map(), nomes = new Map();
    // Grafia da administradora: a da lista do simulador ou a da primeira linha em que aparece
    const grafias = new Map((o.administradoras || []).map((a) => [chave(a), a]));
    if (o.administradoras && o.administradoras.length) grafias.set('porto', grafias.get('porto seguro') || 'Porto Seguro');
    let inativos = 0;
    let lidas = abas.filter((a) => !ABA_IGNORADA.test(chave(a.nome))).map((a) => Object.assign({ cab: acharCabecalho(a.linhas) }, a)).filter((a) => a.cab);
    if (!lidas.length) return { planos, erros: ['Cabeçalho não encontrado: a planilha precisa das colunas Administradora, Plano, Tipo, Prazo, Crédito mínimo, Taxa de administração e Fundo de reserva.'], avisos, inativos, abas: [], linhasComErro: 0 };
    // Uma aba por mês (Outubro, Novembro...): vale a do mês atual ou, sem ela, a última
    const mensais = lidas.filter((a) => mesDaAba(a.nome) >= 0);
    if (mensais.length > 1) {
      const mes = (o.hoje || new Date()).getMonth();
      const aba = mensais.find((a) => mesDaAba(a.nome) === mes) || mensais[mensais.length - 1];
      avisos.push('Planilha com uma aba por mês: lida a aba "' + aba.nome + '".');
      lidas = lidas.filter((a) => mesDaAba(a.nome) < 0 || a === aba);
    }
    const varias = lidas.length > 1;
    const linhasComErro = new Set();

    lidas.forEach((aba) => {
      const { r: iCab, mapa } = aba.cab;
      const onde = (n) => (varias ? 'Aba "' + aba.nome + '", linha ' + n : 'Linha ' + n);
      const admDaAba = mapa.administradora === undefined && !ABA_GENERICA.test(chave(aba.nome)) && mesDaAba(aba.nome) < 0 ? aba.nome.trim() : '';
      const faltam = Object.entries(OBRIGATORIAS).filter(([k]) => mapa[k] === undefined && !(k === 'administradora' && admDaAba) && k !== 'categoria');
      if (faltam.length) {
        faltam.forEach(([, rot]) => erros.push((varias ? 'Aba "' + aba.nome + '": c' : 'C') + 'oluna "' + rot + '" não encontrada no cabeçalho.'));
        return;
      }
      const tem = (k) => mapa[k] !== undefined;
      for (let r = iCab + 1; r < aba.linhas.length; r++) {
        const l = aba.linhas[r] || [];
        const cel = (k) => (mapa[k] === undefined ? null : l[mapa[k]]);
        // Linha vazia (observações sozinhas não contam)
        if (!Object.keys(mapa).some((k) => k !== 'observacoes' && textoCel(cel(k)))) continue;
        const n = r + 1;
        const erro = (m) => { erros.push(onde(n) + ': ' + m); linhasComErro.add(onde(n)); };
        const ativo = chave(textoCel(cel('ativo')));
        if (ativo && /^(nao|n|false|0|inativo)$/.test(ativo)) { inativos++; continue; }

        const v = {};
        Object.keys(mapa).forEach((k) => { v[k] = TEXTOS.includes(k) ? textoCel(cel(k)) : numero(cel(k), PERCENTUAIS.includes(k)); });
        if (!v.administradora) v.administradora = admDaAba;
        Object.entries(OBRIGATORIAS).forEach(([k, rot]) => { if (k !== 'categoria' && (v[k] === '' || v[k] === null || v[k] === undefined)) erro('falta ' + rot + '.'); });
        Object.keys(v).forEach((k) => { if (Number.isNaN(v[k])) erro('valor inválido em ' + (ROTULOS[k] || k) + '.'); });
        // "(exemplo)" no nome ou código EX-...: plano de exemplo (o simulador mostra "(exemplo)" na lista)
        const exemplo = /\(\s*exemplo\s*\)/i.test(v.nome) || /^ex-/i.test(v.id || '');
        const nome = v.nome.replace(/\s*\(\s*exemplo\s*\)\s*/gi, ' ').trim();
        const adm = v.administradora ? grafias.get(chave(v.administradora)) || v.administradora : '';
        if (adm && !grafias.has(chave(adm))) grafias.set(chave(adm), adm);
        const pl = { id: v.id || codigoAuto(adm, nome), administradora: adm, nome };
        if (exemplo) pl.exemplo = true;
        if (v.categoria) {
          pl.categoria = categoriaDoTexto(v.categoria);
          if (!pl.categoria) erro('tipo "' + v.categoria + '" inválido (use Imóvel ou Veículo).');
        } else {
          pl.categoria = categoriaDoTexto(nome) || categoriaDoTexto(aba.nome);
          if (!pl.categoria) erro('falta Tipo (Imóvel ou Veículo).');
        }
        if (!pl.categoria) delete pl.categoria;
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
          const ki = chave(v.indice);
          const ind = INDICES[ki] || (/^pr/.test(ki) && /6/.test(ki) ? 'pre6' : /^pr/.test(ki) ? 'pre5' : ['incc', 'ipca', 'inpc'].find((x) => ki.includes(x)) || null);
          if (ind) pl.indice = ind;
          else erro('índice "' + v.indice + '" inválido (use INCC, IPCA, INPC, Pré-fixado 5% ou Pré-fixado 6%).');
        } else if (pl.categoria) pl.indice = INDICE_PADRAO[pl.categoria];

        // Colunas opcionais: só valem quando a coluna existe
        if (tem('adesaoPct')) {
          faixa('adesaoPct', 'Taxa de adesão', 0, 100);
          if (pl.adesaoPct === undefined) pl.adesaoPct = 0;
          faixa('adesaoMeses', 'Adesão diluída em (meses)', 1, 420, true);
          if (pl.adesaoPct > 0 && tem('adesaoMeses') && v.adesaoMeses == null) erro('informe em quantos meses a adesão é diluída.');
          if (pl.adesaoPct > 0 && !tem('adesaoMeses')) pl.adesaoMeses = 1;
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
        } else if (tem('redutorPct')) {
          if (v.redutorPct == null) pl.redutorPct = 0;
          else faixa('redutorPct', 'Redutor', 0, 99.99);
        }
        if (tem('abatimento')) {
          const abat = chave(v.abatimento);
          if (!abat || /^parc/.test(abat)) pl.abatimento = 'parcela';
          else if (/^praz/.test(abat)) pl.abatimento = 'prazo';
          else erro('abatimento "' + v.abatimento + '" inválido (use Parcela ou Prazo).');
        }
        faixa('indiceTaxa', 'Taxa estimada do índice', -50, 100);
        if (pl.indice && /^pre/.test(pl.indice)) delete pl.indiceTaxa;

        const kNome = chave(pl.administradora) + '|' + chave(pl.nome) + '|' + (pl.categoria || '');
        if (nomes.has(kNome)) erro('plano "' + pl.nome + '" repetido na administradora ' + pl.administradora + ' (' + min1(nomes.get(kNome)) + ').');
        else nomes.set(kNome, onde(n));
        // Código automático repetido (mesmo nome em Imóvel e Veículo): ganha a categoria no fim
        let kId = pl.id.toLowerCase();
        if (ids.has(kId) && !v.id) { pl.id = (pl.id + '-' + (pl.categoria || n)).toUpperCase(); kId = pl.id.toLowerCase(); }
        if (ids.has(kId)) { if (v.id) erro('código "' + pl.id + '" repetido (' + min1(ids.get(kId)) + ').'); }
        else ids.set(kId, onde(n));
        if (pl.exemplo) avisos.push(onde(n) + ': plano de exemplo (' + pl.nome + '). Apague a linha quando cadastrar os planos reais.');
        if (!linhasComErro.has(onde(n))) planos.push(pl);
      }
    });
    if (!planos.length && !erros.length) erros.push('Nenhum plano ativo na planilha.');
    // Linhas com erro ficam de fora: o simulador carrega as demais; o "npm run planos" exige a planilha toda certa
    return { planos, erros, avisos, inativos, abas: lidas.map((a) => a.nome), linhasComErro: linhasComErro.size };
  }

  /** Compatível com uma aba só (linhas). */
  const planosDaPlanilha = (linhas, opcoes) => planosDoLivro([{ nome: 'Planos', linhas }], opcoes);

  /** Lê o arquivo .xlsx e devolve os planos (ver planosDoLivro). */
  async function lerPlanos(bytes, inflar, opcoes) {
    return planosDoLivro(await lerXlsx(bytes, inflar), opcoes);
  }

  return { lerXlsx, lerPlanos, planosDoLivro, planosDaPlanilha, numero, categoriaDoTexto, inflarNavegador };
});

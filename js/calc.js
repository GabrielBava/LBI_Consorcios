/*
 * Motor de cálculo do Simulador de Cartas de Consórcio Primárias.
 *
 * Funções puras, sem dependência de interface (DOM). Pode ser usado no
 * navegador (window.Calc) e no Node.js (require('./calc')) para testes.
 *
 * Convenções:
 * - Valores apresentados são objetos "Valor": { v, tipo, formula, origem, nota, pend }
 *     tipo: 'informado' | 'calculado' | 'estimado' | 'pendente' | 'na'
 *     v === null significa "Não calculado" e pend lista os motivos.
 * - Meses são numerados de 1 até o prazo.
 * - O núcleo numérico (nucleo) não formata textos, para poder ser chamado
 *   muitas vezes (tabelas de alavancagem por mês de contemplação).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Calc = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Catálogos e regras fixas
  // ---------------------------------------------------------------------------

  const INDICES = {
    pre5: { nome: 'Pré-fixado (5%)', taxaFixa: 5 },
    pre6: { nome: 'Pré-fixado (6%)', taxaFixa: 6 },
    ipca: { nome: 'IPCA' },
    incc: { nome: 'INCC' },
    inpc: { nome: 'INPC' },
    outro: { nome: 'Outro índice' }
  };

  // Ao selecionar a categoria, estes valores são aplicados ao plano (e podem ser editados depois).
  const CATEGORIAS = {
    imovel: { nome: 'Imóvel', indice: 'incc', credito: 200000, prazo: 240, taxaAdm: 20, fundoReserva: 2 },
    veiculo: { nome: 'Veículo', indice: 'ipca', credito: 80000, prazo: 100, taxaAdm: 13, fundoReserva: 2 }
  };

  /** Aplica ao plano os valores fixos da categoria. */
  function aplicarCategoria(plano, categoria) {
    const c = CATEGORIAS[categoria];
    if (!c) return plano;
    Object.assign(plano, { categoria, indice: c.indice, credito: c.credito, prazo: c.prazo, taxaAdm: c.taxaAdm, fundoReserva: c.fundoReserva });
    return plano;
  }

  // ---------------------------------------------------------------------------
  // Planos cadastrados (CRM): cada plano traz administradora, crédito mínimo, prazo,
  // taxas, percentuais de lance e índice. Aceita nomes de campos usuais do CRM.
  // ---------------------------------------------------------------------------

  function normalizarIndice(v) {
    const t = String(v == null ? '' : v).trim().toLowerCase();
    if (!t) return null;
    if (INDICES[t]) return t;
    for (const k of ['incc', 'ipca', 'inpc']) if (t.includes(k)) return k;
    if (/pr[eé]/.test(t) && /6/.test(t)) return 'pre6';
    if (/pr[eé]/.test(t)) return 'pre5';
    return 'outro';
  }

  function normalizarPlano(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const pega = (...ks) => { for (const k of ks) if (raw[k] !== undefined && raw[k] !== null && raw[k] !== '') return raw[k]; return null; };
    const n = (...ks) => num(pega(...ks));
    const id = pega('id', 'codigo', 'planoId');
    const administradora = pega('administradora', 'adm');
    if (id === null || !administradora) return null;
    const cat = String(pega('categoria', 'tipo') || '').toLowerCase();
    return {
      id: String(id),
      nome: String(pega('nome', 'descricao', 'plano') || 'Plano ' + id),
      administradora: String(administradora).trim(),
      categoria: /ve[ií]c|auto|moto/.test(cat) ? 'veiculo' : /im[oó]v/.test(cat) ? 'imovel' : null,
      creditoMinimo: n('creditoMinimo', 'credito_minimo', 'credito'),
      prazo: n('prazo', 'prazoGrupo', 'prazo_grupo'),
      taxaAdm: n('taxaAdm', 'taxaAdministrativa', 'taxa_adm', 'taxaAdministracao'),
      fundoReserva: n('fundoReserva', 'fundo_reserva'),
      embutidoPct: n('embutidoPct', 'lanceEmbutido', 'lance_embutido'),
      fixoPct: n('fixoPct', 'lanceFixo', 'lance_fixo'),
      indice: normalizarIndice(pega('indice', 'indiceReajuste', 'indice_reajuste')),
      indiceTaxa: n('indiceTaxa', 'taxaIndice', 'taxa_indice'),
      exemplo: !!raw.exemplo
    };
  }

  /** Aplica o plano cadastrado ao estado: dados do plano, percentuais de lance e índice. */
  function aplicarPlanoCadastrado(s, pl) {
    const p = s.plano;
    p.planoId = pl.id;
    p.administradora = pl.administradora;
    if (pl.categoria) p.categoria = pl.categoria;
    if (isNum(pl.prazo)) p.prazo = pl.prazo;
    if (isNum(pl.taxaAdm)) p.taxaAdm = pl.taxaAdm;
    if (isNum(pl.fundoReserva)) p.fundoReserva = pl.fundoReserva;
    if (pl.indice) p.indice = pl.indice;
    if (isNum(pl.indiceTaxa)) p.indiceTaxa = pl.indiceTaxa;
    p.creditoMinimo = isNum(pl.creditoMinimo) ? pl.creditoMinimo : null;
    // Crédito: parte do crédito mínimo do plano (pode ser aumentado depois)
    if (isNum(pl.creditoMinimo)) p.credito = pl.creditoMinimo;
    if (isNum(num(p.prazo)) && isNum(num(p.mesContemplacao)) && num(p.mesContemplacao) > num(p.prazo)) p.mesContemplacao = num(p.prazo);
    if (isNum(pl.embutidoPct)) { s.lances.embutidoPct = pl.embutidoPct; s.lances.retidoEmbutidoPct = pl.embutidoPct; }
    if (isNum(pl.fixoPct)) s.lances.fixoPct = pl.fixoPct;
    return s;
  }

  const ADMINISTRADORAS = ['HS', 'Embracon', 'CNP', 'Itaú', 'Porto Seguro', 'Servopa', 'Banco do Brasil', 'Santander', 'Klubi'];

  const MODALIDADES_PARCELA = {
    integral: { nome: 'Parcela integral', pct: 0 },
    r50: { nome: 'Redutor de 50%', pct: 50 },
    r25: { nome: 'Redutor de 25%', pct: 25 },
    outro: { nome: 'Redutor com outro percentual', pct: null }
  };

  const REGRAS = {
    periodicidadeReajuste: 12, // reajuste a cada 12 meses (mês 13, 25, ...) até o fim do plano
    vendaPct: 20, // venda da carta contemplada: 20% sobre o crédito líquido disponível
    locacaoPct: 1.6, // retorno mensal de locação: 1,6% ao mês sobre o crédito disponível
    cartasMax: 20, // estratégia de cartas: até 20 cartas
    seguroPctPadrao: 0.038, // seguro prestamista: % ao mês sobre o valor total do plano (crédito + taxa adm. + fundo de reserva, atualizados, + adesão)
    embutidoPctPadrao: 25,
    fixoPctPadrao: 50
  };

  const MSG = {
    estimado: 'Resultado estimado: depende das premissas informadas.',
    mesHipotetico: 'Mês de contemplação projetado, sem garantia de ocorrência.',
    taxaEstimada: 'A projeção usa uma taxa estimada para o índice selecionado.'
  };

  // ---------------------------------------------------------------------------
  // Estado padrão
  // ---------------------------------------------------------------------------

  function estadoPadrao() {
    return {
      plano: {
        lead: '',
        tipoPessoa: 'fisica', // 'fisica' | 'juridica'
        categoria: 'imovel',
        administradora: '',
        planoId: '', // plano cadastrado (CRM) aplicado aos campos
        creditoMinimo: null, // crédito mínimo do plano cadastrado
        credito: CATEGORIAS.imovel.credito,
        prazo: CATEGORIAS.imovel.prazo,
        mesContemplacao: 12,
        taxaAdm: CATEGORIAS.imovel.taxaAdm,
        fundoReserva: CATEGORIAS.imovel.fundoReserva,
        adesaoAtiva: false,
        adesaoPct: null,
        adesaoMeses: null,
        seguroAtivo: false,
        seguroPct: REGRAS.seguroPctPadrao,
        abatimento: 'parcela', // 'parcela' | 'prazo'
        indice: CATEGORIAS.imovel.indice,
        indiceTaxa: null,
        indiceNome: ''
      },
      parcela: { modalidade: 'integral', redutorOutro: null },
      lances: {
        // Recursos do cliente para o lance: dinheiro (aplicações, imóvel ou veículo quitado) e FGTS (só imóvel)
        recursosAtivo: false,
        recursosValor: null,
        fgtsValor: null,
        embutidoAtivo: true,
        embutidoPct: REGRAS.embutidoPctPadrao,
        fixoAtivo: true,
        fixoPct: REGRAS.fixoPctPadrao,
        fixoUsarEmbutido: true,
        fixoUsarRecursos: false,
        livreAtivo: false,
        livrePct: null,
        livreUsarEmbutido: false,
        livreUsarRecursos: false,
        // Lance Retido: soma de recursos próprios (valor do bem do cliente: FIPE do veículo, avaliação do imóvel)
        // e de lance embutido (% do crédito); cada parte é habilitada no próprio bloco
        retidoAtivo: false,
        retidoUsarRecursos: false,
        retidoRecursosValor: null,
        retidoUsarEmbutido: false,
        retidoEmbutidoPct: REGRAS.embutidoPctPadrao
      },
      projecoes: { parcelas: false, credito: false },
      // Lance Fidelidade: desabilitado ao iniciar; cada opção tem parcela inicial e % de embutido
      fidelidade: { ativo: false, p1Parcela: 6, p1Pct: 30, p2Parcela: 12, p2Pct: 27, p3Parcela: 18, p3Pct: 25 },
      // Mecanismo de Alavancagem: reaplica a venda (ou o lucro) da carta em novas cartas do mesmo plano
      mecanismo: { ativo: false, base: 'venda', origem: 'sorteio', q1: 1, q2: 2, q3: null, q4: null, mesNovas: 12 },
      // Estratégia de cartas: split (o crédito simulado dividido em N cartas) ou multiplicar (N cartas iguais à simulada)
      estrategiaCartas: { ativo: false, tipo: 'split', qtd: 2 },
      contato: { cliente: '' } // WhatsApp do cliente que recebe a proposta
    };
  }

  // ---------------------------------------------------------------------------
  // Utilitários
  // ---------------------------------------------------------------------------

  const num = (x) => (x === null || x === undefined || x === '' || Number.isNaN(Number(x)) ? null : Number(x));
  const isNum = (x) => typeof x === 'number' && Number.isFinite(x);

  function V(v, tipo, formula, origem, extra) {
    const o = { v: isNum(v) || typeof v === 'string' ? v : null, tipo, formula: formula || '', origem: origem || '', nota: '', pend: [] };
    if (o.v === null && tipo !== 'na') o.tipo = 'pendente';
    return Object.assign(o, extra || {});
  }
  function P(motivos, formula) {
    const lista = (Array.isArray(motivos) ? motivos : [motivos]).filter(Boolean);
    return { v: null, tipo: 'pendente', formula: formula || '', origem: '', nota: '', pend: Array.from(new Set(lista)) };
  }

  const fmtBRL = (x) =>
    isNum(x) ? x.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
  const fmtPct = (x, d) => (isNum(x) ? x.toLocaleString('pt-BR', { minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 4 : d }) + '%' : '—');
  const fmtNum = (x, d) => (isNum(x) ? x.toLocaleString('pt-BR', { minimumFractionDigits: d || 0, maximumFractionDigits: d == null ? 6 : d }) : '—');

  // ---------------------------------------------------------------------------
  // Regras de reajuste e redutor
  // ---------------------------------------------------------------------------

  function taxaIndice(p) {
    const def = INDICES[p.indice];
    if (!def) return null;
    if (isNum(def.taxaFixa)) return def.taxaFixa;
    return num(p.indiceTaxa);
  }

  function nomeIndice(p) {
    if (p.indice === 'outro') return 'Outro índice' + (p.indiceNome ? ' (' + p.indiceNome + ')' : '');
    return (INDICES[p.indice] || { nome: 'Não selecionado' }).nome;
  }

  const indiceEstimado = (p) => ['ipca', 'incc', 'inpc', 'outro'].includes(p.indice);

  /** Reajustes aplicados até o mês m: um a cada 12 meses (mês 13 = 1º reajuste). */
  const qtdReajustes = (m) => Math.floor((m - 1) / REGRAS.periodicidadeReajuste);

  /** Fator de reajuste no mês m (null quando a taxa do índice não foi informada). */
  function fator(p, m) {
    const k = qtdReajustes(m);
    if (k === 0) return 1;
    const t = taxaIndice(p);
    return isNum(t) ? Math.pow(1 + t / 100, k) : null;
  }

  function redutorPct(pr) {
    const mod = MODALIDADES_PARCELA[pr.modalidade] || MODALIDADES_PARCELA.integral;
    return mod.pct === null ? num(pr.redutorOutro) : mod.pct;
  }

  function motivoIndice(p) {
    return 'Índice de reajuste ' + nomeIndice(p) + ' sem taxa estimada informada (necessária a partir do mês 13)';
  }

  // ---------------------------------------------------------------------------
  // Dados básicos
  // ---------------------------------------------------------------------------

  /** HS e Porto Seguro aplicam o redutor sobre a parcela inteira (FC + taxa adm. + fundo de reserva); as demais, só no fundo comum. */
  const REDUTOR_PARCELA_TODA = ['hs', 'porto seguro', 'porto'];
  function redutorNaParcelaToda(p) {
    const k = String(p.administradora || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    return REDUTOR_PARCELA_TODA.includes(k);
  }

  function basicos(s) {
    const p = s.plano;
    const C = num(p.credito), N = num(p.prazo), ta = num(p.taxaAdm), fr = num(p.fundoReserva);
    const pend = [];
    if (!isNum(C) || C <= 0) pend.push('Valor do crédito não informado');
    if (!isNum(N) || N < 1 || !Number.isInteger(N)) pend.push('Prazo inválido');
    if (!isNum(ta)) pend.push('Taxa de administração não informada');
    if (!isNum(fr)) pend.push('Fundo de reserva não informado');
    const r = redutorPct(s.parcela);
    if (!isNum(r) || r < 0 || r >= 100) pend.push('Percentual do redutor inválido');
    return { ok: pend.length === 0, pend, C, N, ta, fr, r: isNum(r) ? r : 0 };
  }

  /** O FGTS só pode ser usado por pessoa física, no consórcio de imóvel. */
  const fgtsPermitido = (s) => s.plano.categoria !== 'veiculo' && s.plano.tipoPessoa !== 'juridica';
  /** Motivo de o FGTS não valer na proposta (ou '' quando vale). */
  const motivoSemFgts = (s) => (s.plano.tipoPessoa === 'juridica' ? 'Pessoa jurídica: o FGTS é só de pessoa física' : s.plano.categoria === 'veiculo' ? 'Veículo: o FGTS só pode ser usado em imóveis' : '');

  /**
   * Valores do lance de uma modalidade sobre uma base de crédito.
   * 'embutido': o lance é composto só pelo lance embutido (sem recursos próprios).
   * 'fixo' | 'livre': percentual da modalidade; 'retido': recursos próprios (R$) + embutido (% do crédito), o percentual é calculado.
   * Com "Usar embutido", o embutido é descontado do total. Com "Usar recursos próprios", o restante sai dos
   * recursos informados pelo cliente: primeiro o FGTS (só imóvel), depois o dinheiro; o que faltar fica em out.falta.
   */
  /** Lance Retido: recursos próprios (valor do bem, em R$) + embutido (% do crédito); o total define o percentual. */
  function lanceRetido(s, base) {
    const l = s.lances;
    const usaRecursos = !!l.retidoUsarRecursos, usaEmbutido = !!l.retidoUsarEmbutido;
    const rv = usaRecursos ? num(l.retidoRecursosValor) : 0;
    const pe = usaEmbutido ? num(l.retidoEmbutidoPct) : 0;
    const out = { pct: null, pctEmbutido: usaEmbutido ? pe : 0, usaEmbutido, usaRecursos, usaFgts: false, total: null, embutido: null, fgts: 0, proprios: null, dinheiro: null, falta: 0, limitado: false };
    if ((!usaRecursos && !usaEmbutido) || !isNum(rv) || !isNum(pe) || !isNum(base) || base <= 0) return out;
    out.embutido = (pe / 100) * base;
    out.proprios = Math.max(0, rv);
    out.dinheiro = out.proprios;
    out.total = out.embutido + out.proprios;
    out.pct = (out.total / base) * 100;
    return out;
  }

  function lanceSobre(s, mod, base, pctFidelidade) {
    if (mod === 'retido') return lanceRetido(s, base);
    const l = s.lances;
    const soEmbutido = mod === 'embutido' || mod === 'fidelidade';
    // Lance Fidelidade: todo o lance é embutido, com o percentual da opção escolhida
    const pctE = mod === 'fidelidade' ? num(pctFidelidade) : num(l.embutidoPct);
    let pct = soEmbutido ? pctE : num(mod === 'fixo' ? l.fixoPct : l.livrePct);
    const flag = (k) => !!l[mod + k];
    const usar = soEmbutido || (flag('UsarEmbutido') && l.embutidoAtivo);
    const usaRecursos = !soEmbutido && !!l.recursosAtivo && flag('UsarRecursos');
    const out = { pct, pctEmbutido: usar ? pctE : 0, usaEmbutido: usar, usaRecursos, usaFgts: false, total: null, embutido: null, fgts: null, proprios: null, dinheiro: null, falta: 0, limitado: false };
    if (!isNum(pct) || !isNum(base)) return out;
    out.total = (pct / 100) * base;
    let e = usar && isNum(pctE) ? (pctE / 100) * base : 0;
    if (e > out.total) { e = out.total; out.limitado = true; }
    out.embutido = e;
    // Recursos próprios = lance − embutido. O FGTS, quando usado, faz parte dos recursos próprios
    // (limitado a eles); fica registrado à parte (out.fgts / out.dinheiro).
    out.proprios = out.total - e;
    const fv = fgtsPermitido(s) ? num(l.fgtsValor) : null;
    out.usaFgts = usaRecursos && isNum(fv) && fv > 0;
    out.fgts = out.usaFgts ? Math.min(Math.max(0, fv), out.proprios) : 0;
    out.dinheiro = out.proprios - out.fgts;
    const rv = num(l.recursosValor);
    if (usaRecursos) out.falta = Math.max(0, out.dinheiro - (isNum(rv) ? Math.max(0, rv) : 0));
    return out;
  }

  /** Valores travados do bloco Lance Retido (mostrados enquanto o consultor preenche, mesmo com uma parte em branco). */
  function valoresRetido(l, base) {
    const ok = isNum(base) && base > 0;
    const rv = num(l.retidoRecursosValor), pe = num(l.retidoEmbutidoPct);
    const recursos = l.retidoUsarRecursos && isNum(rv) ? Math.max(0, rv) : null;
    const embutido = l.retidoUsarEmbutido && isNum(pe) && ok ? (pe / 100) * base : null;
    // Total só quando todas as partes marcadas têm valor (como no cenário do lance)
    const completo = (l.retidoUsarRecursos || l.retidoUsarEmbutido) && (!l.retidoUsarRecursos || recursos !== null) && (!l.retidoUsarEmbutido || embutido !== null);
    const total = completo ? (recursos || 0) + (embutido || 0) : null;
    return {
      retidoRecursosPct: recursos !== null && ok ? (recursos / base) * 100 : null,
      retidoEmbutido: embutido,
      retidoTotal: total,
      retidoTotalPct: total !== null && ok ? (total / base) * 100 : null
    };
  }

  // ---------------------------------------------------------------------------
  // Núcleo numérico de um cenário
  // ---------------------------------------------------------------------------

  /**
   * Calcula o cronograma e os totais de um cenário.
   * @param {object} s estado
   * @param {'sorteio'|'fixo'|'livre'} mod modalidade de contemplação
   * @param {number} [mesCOverride] mês de contemplação (padrão: projeção do plano)
   */
  function nucleo(s, mod, mesCOverride, pctFidelidade) {
    const b = basicos(s);
    const p = s.plano;
    const mesC = num(mesCOverride != null ? mesCOverride : p.mesContemplacao);
    const res = { ok: false, mod, mesC, pend: b.pend.slice(), linhas: [] };
    if (!b.ok) return res;
    const { C, N, ta, fr, r } = b;
    if (!isNum(mesC) || mesC < 1 || mesC > N || !Number.isInteger(mesC)) { res.pend.push('Projeção de contemplação inválida'); return res; }

    const pendIdx = motivoIndice(p);
    const F = [null];
    for (let m = 1; m <= N; m++) F.push(fator(p, m));

    // Adesão: % do crédito contratado, diluída em parcelas iguais (sem reajuste)
    let adesaoMes = 0, adesaoMeses = 0, adesaoTotal = 0;
    if (p.adesaoAtiva) {
      const ap = num(p.adesaoPct), am = num(p.adesaoMeses);
      if (!isNum(ap) || !isNum(am) || am < 1) res.pend.push('Adesão: percentual ou meses de diluição não informados');
      else { adesaoMeses = Math.min(Math.round(am), N); adesaoTotal = (ap / 100) * C; adesaoMes = adesaoTotal / adesaoMeses; }
    }
    const seguroPct = p.seguroAtivo ? num(p.seguroPct) : 0;
    if (p.seguroAtivo && !isNum(seguroPct)) res.pend.push('Seguro prestamista: percentual não informado');
    // Base do seguro prestamista: o valor total do plano — crédito (fundo comum) + taxa de administração + fundo de reserva
    // (atualizados pelo reajuste) + adesão, quando houver
    const baseSeguro = 1 + (isNum(ta) ? ta / 100 : 0) + (isNum(fr) ? fr / 100 : 0);

    // Recomposição do redutor: o percentual não pago até a contemplação é diluído nas parcelas restantes
    const nRest = N - mesC;
    const extraFC = r > 0 && nRest > 0 ? (r / 100) * mesC / (N * nRest) : 0;
    const redutorTodo = redutorNaParcelaToda(p);

    const linhas = [];
    for (let m = 1; m <= N; m++) {
      const f = F[m];
      const l = { m, f, reduzido: r > 0 && m <= mesC, posContemplacao: m > mesC, encerrado: false };
      if (f === null) {
        Object.assign(l, { credAtual: null, fundoComum: null, taxa: null, fundo: null, plano: null, adesao: null, seguro: null, total: null, pend: [pendIdx] });
      } else {
        const cref = C * f;
        // Fundo comum = (100% ÷ prazo) × crédito; Taxa adm. = (TA% ÷ prazo) × crédito; Fundo de reserva = (FR% ÷ prazo) × crédito
        // Com redutor: até a contemplação multiplica por (1 − r); depois recompõe a diferença (extraFC). Na HS e na Porto vale para os três componentes.
        const fator1 = m <= mesC ? 1 - r / 100 : 1 + extraFC * N;
        const fatorTaxas = redutorTodo ? fator1 : 1;
        l.credAtual = cref;
        l.fundoComum = (1 / N) * cref * fator1;
        l.taxa = ((ta / 100) / N) * cref * fatorTaxas;
        l.fundo = ((fr / 100) / N) * cref * fatorTaxas;
        l.plano = l.fundoComum + l.taxa + l.fundo;
        l.adesao = m <= adesaoMeses ? adesaoMes : 0;
        l.seguro = isNum(seguroPct) ? (seguroPct / 100) * (cref * baseSeguro + adesaoTotal) : null;
        l.pend = l.seguro === null ? ['Seguro prestamista: percentual não informado'] : [];
      }
      linhas.push(l);
    }

    // Saldo devedor na contemplação: parcelas restantes (fundo comum, taxa e fundo de reserva) a valores do mês da contemplação
    const credBruto = F[mesC] === null ? null : C * F[mesC];
    const fC = F[mesC];
    const posLinhas = linhas.slice(mesC);
    const saldoAntes = posLinhas.every((l) => isNum(l.plano)) && isNum(fC) ? posLinhas.reduce((a, l) => a + l.plano * fC / l.f, 0) : null;

    // Lance e abatimento
    let lance = null;
    if (mod !== 'sorteio') {
      lance = lanceSobre(s, mod, credBruto, pctFidelidade);
      if (!isNum(lance.pct)) {
        const l = s.lances;
        res.pend.push(mod !== 'retido' ? 'Percentual do ' + NOMES_MOD[mod].toLowerCase() + ' não informado'
          : !l.retidoUsarRecursos && !l.retidoUsarEmbutido ? 'Lance retido: habilite recursos próprios e/ou lance embutido'
            : l.retidoUsarRecursos && !isNum(num(l.retidoRecursosValor)) ? 'Lance retido: valor dos recursos próprios não informado'
              : l.retidoUsarEmbutido && !isNum(num(l.retidoEmbutidoPct)) ? 'Lance retido: percentual do embutido não informado'
                : 'Lance retido: crédito na contemplação não calculado (confira crédito e reajuste)');
      }
      if (lance.usaEmbutido && !isNum(lance.pctEmbutido)) res.pend.push('Percentual do lance embutido não informado');
      const pos = linhas.slice(mesC);
      if (isNum(lance.total) && lance.total > 0 && pos.length && pos.every((l) => isNum(l.plano))) {
        const bases = pos.map((l) => l.plano * fC / l.f); // saldo a valores do mês da contemplação
        const saldo = bases.reduce((a, x) => a + x, 0);
        if (p.abatimento === 'prazo') {
          let resto = lance.total;
          for (let i = pos.length - 1; i >= 0 && resto > 1e-9; i--) {
            const l = pos[i];
            if (resto >= bases[i] - 1e-9) { resto -= bases[i]; escalar(l, 0); l.encerrado = true; l.seguro = 0; l.adesao = 0; }
            else { escalar(l, 1 - resto / bases[i]); resto = 0; }
          }
        } else {
          const k = Math.max(0, 1 - lance.total / saldo);
          pos.forEach((l) => escalar(l, k));
          if (k === 0) pos.forEach((l) => { l.encerrado = true; l.seguro = 0; l.adesao = 0; });
        }
        res.saldoNaContemplacao = saldo;
      }
    }
    linhas.forEach((l) => { l.total = [l.plano, l.adesao, l.seguro].every(isNum) ? l.plano + l.adesao + l.seguro : null; });

    // Totais
    const soma = (de, ate, campo) => {
      let v = 0;
      for (let m = de; m <= ate; m++) { const x = linhas[m - 1][campo]; if (!isNum(x)) return null; v += x; }
      return v;
    };
    res.linhas = linhas;
    res.C = C; res.N = N;
    res.credBruto = credBruto;
    res.lance = lance;
    res.embutido = lance && isNum(lance.embutido) ? lance.embutido : lance ? null : 0;
    res.credLiquido = isNum(credBruto) && isNum(res.embutido) ? credBruto - res.embutido : null;
    res.parcelaMes = linhas[mesC - 1].total;
    res.pagoPlano = soma(1, mesC, 'plano');
    res.pagoSeguro = soma(1, mesC, 'seguro');
    res.pagoAdesao = soma(1, mesC, 'adesao');
    res.totalParcelas = soma(1, mesC, 'total');
    res.proprios = lance ? lance.proprios : 0;
    res.fgts = lance && isNum(lance.fgts) ? lance.fgts : 0;
    res.lanceTotal = lance ? lance.total : 0;
    res.totalAportado = isNum(res.totalParcelas) && isNum(res.proprios) ? res.totalParcelas + res.proprios : null;
    res.venda = isNum(res.credLiquido) ? (REGRAS.vendaPct / 100) * res.credLiquido : null;
    res.resultado = isNum(res.venda) && isNum(res.totalAportado) ? res.venda - res.totalAportado : null;
    res.rentabilidade = isNum(res.resultado) && res.totalAportado > 0 ? (res.resultado / res.totalAportado) * 100 : null;
    const posAtivas = linhas.slice(mesC).filter((l) => !l.encerrado);
    res.parcelaPos = mesC < N ? (posAtivas.length ? posAtivas[0].total : 0) : null;
    res.prazoRestante = linhas.slice(mesC).filter((l) => !l.encerrado).length;
    res.obrigacoes = mesC < N ? soma(mesC + 1, N, 'total') : 0;
    // Valores pós-contemplação a preços do mês da contemplação (sem reajustes futuros)
    res.saldoDevedor = isNum(saldoAntes) ? Math.max(0, saldoAntes - (isNum(res.lanceTotal) ? res.lanceTotal : 0)) : null;
    const pa = posAtivas[0];
    // Seguro a preços da contemplação: só a parte do crédito, taxa e fundo é reajustada (a adesão, não)
    const seguroPos = pa && pa.seguro ? (seguroPct / 100) * (C * fC * baseSeguro + adesaoTotal) : 0;
    res.parcelaPosAtual = mesC >= N ? null : !pa ? 0 : [pa.plano, pa.adesao, pa.seguro].every(isNum) && isNum(fC) ? pa.plano * fC / pa.f + pa.adesao + seguroPos : null;
    res.totalPlano = soma(1, N, 'total');
    linhas.forEach((l) => l.pend.forEach((x) => res.pend.push(x)));
    res.pend = Array.from(new Set(res.pend));
    res.ok = true;
    return res;
  }

  function escalar(l, k) {
    ['fundoComum', 'taxa', 'fundo', 'plano'].forEach((c) => { if (isNum(l[c])) l[c] *= k; });
  }

  // ---------------------------------------------------------------------------
  // Cenário com memória de cálculo (tabelas de cenários)
  // ---------------------------------------------------------------------------

  const NOMES_MOD = { sorteio: 'Sorteio', embutido: 'Lance Embutido', fixo: 'Lance Fixo', livre: 'Lance Livre', retido: 'Lance Retido', fidelidade: 'Lance Fidelidade' };
  const TITULOS = {
    sorteio: 'Contemplação por sorteio',
    embutido: 'Contemplação por lance embutido',
    fixo: 'Contemplação por lance fixo',
    livre: 'Contemplação por lance livre',
    retido: 'Contemplação por lance retido'
  };

  function cenario(s, mod) {
    const n = nucleo(s, mod);
    const res = { mod, nome: NOMES_MOD[mod], titulo: TITULOS[mod], ok: n.ok, nucleo: n, linhas: {}, alertas: [] };
    if (!n.ok) { res.motivo = 'Não calculado: ' + n.pend.join('; ') + '.'; return res; }
    const L = res.linhas;
    const p = s.plano;
    const mesC = n.mesC;
    const lm = n.linhas[mesC - 1];
    const val = (v, tipo, formula, origem, extra) => (isNum(v) ? V(v, tipo, formula, origem, extra) : P(n.pend.length ? n.pend : ['Dado não informado'], formula));

    L.mes = V('Mês ' + mesC, 'estimado', 'Projeção de contemplação informada no plano', 'Dados do plano', { nota: MSG.mesHipotetico });
    L.credito = V(n.C, 'informado', 'Crédito contratado', 'Informado pelo consultor');
    L.credBruto = isNum(n.credBruto)
      ? V(n.credBruto, lm.f === 1 ? 'calculado' : 'estimado', 'Crédito na contemplação = ' + fmtBRL(n.C) + ' × fator de reajuste ' + fmtNum(lm.f, 6) + ' (' + qtdReajustes(mesC) + ' reajuste(s) anual(is))', 'Índice: ' + nomeIndice(p), { nota: lm.f === 1 ? '' : MSG.taxaEstimada })
      : P([motivoIndice(p)], 'Crédito × fator de reajuste');

    if (mod === 'sorteio') {
      L.lance = V(0, 'na', 'Sem lance no cenário de sorteio', '');
      L.embutido = V(0, 'na', 'Sem lance embutido no cenário de sorteio', '');
      L.proprios = V(0, 'na', 'Sem recursos próprios de lance no cenário de sorteio', '');
    } else {
      const lc = n.lance;
      const base = fmtBRL(n.credBruto);
      L.lance = mod === 'retido'
        ? val(lc.total, 'estimado', 'Lance retido = recursos próprios ' + fmtBRL(lc.proprios) + ' + embutido ' + fmtBRL(lc.embutido) + ' (' + fmtPct(lc.pctEmbutido) + ') = ' + fmtPct(lc.pct) + ' do crédito na contemplação ' + base, 'Valor do bem do cliente e percentual de embutido informados')
        : val(lc.total, 'estimado', 'Lance = ' + fmtPct(lc.pct) + ' × crédito na contemplação ' + base, mod === 'fixo' ? 'Percentual do lance fixo (administradora)' : mod === 'embutido' ? 'Lance composto só pelo embutido' : 'Percentual ofertado no lance livre');
      L.embutido = lc.usaEmbutido
        ? val(lc.embutido, 'estimado', 'Lance embutido = ' + fmtPct(lc.pctEmbutido) + ' × ' + base + (lc.limitado ? ' (limitado ao valor total do lance)' : ''), 'Percentual do lance embutido (administradora)')
        : V(0, 'calculado', '"Usar embutido" desmarcado para esta modalidade', 'Configuração');
      L.proprios = val(lc.proprios, 'estimado', 'Recursos próprios = Lance ' + fmtBRL(lc.total) + ' − Embutido ' + fmtBRL(lc.embutido), 'Cálculo');
      if (lc.limitado) res.alertas.push({ nivel: 'alerta', msg: res.nome + ': o lance embutido é maior que o lance total; foi limitado ao valor do lance.' });
      if (lc.falta > 0.005) res.alertas.push({ nivel: 'alerta', msg: res.nome + ': recursos próprios insuficientes; faltam ' + fmtBRL(lc.falta) + ' em dinheiro para completar o lance.' });
      if (isNum(lc.total) && isNum(n.saldoNaContemplacao) && lc.total > n.saldoNaContemplacao + 0.005) res.alertas.push({ nivel: 'alerta', msg: res.nome + ': o lance (' + fmtBRL(lc.total) + ') passa do saldo devedor na contemplação (' + fmtBRL(n.saldoNaContemplacao) + '); o excedente não é aproveitado.' });
      else if (mod === 'retido' && isNum(lc.total) && isNum(n.credBruto) && lc.total > n.credBruto + 0.005) res.alertas.push({ nivel: 'alerta', msg: res.nome + ': o valor ofertado passa do crédito na contemplação (' + fmtBRL(n.credBruto) + ').' });
    }
    L.credLiquido = val(n.credLiquido, n.embutido > 0 ? 'estimado' : L.credBruto.tipo, n.embutido > 0 ? 'Crédito líquido = ' + fmtBRL(n.credBruto) + ' − embutido ' + fmtBRL(n.embutido) : 'Crédito líquido = crédito na contemplação (sem embutido)', 'Cálculo');

    L.parcelaMes = isNum(lm.total)
      ? V(lm.total, 'estimado', 'Parcela do mês ' + mesC + ' = Fundo comum ' + fmtBRL(lm.fundoComum) + ' + Taxa adm. ' + fmtBRL(lm.taxa) + ' + Fundo de reserva ' + fmtBRL(lm.fundo) + ' + Adesão ' + fmtBRL(lm.adesao) + ' + Seguro ' + fmtBRL(lm.seguro), lm.reduzido ? 'Com redutor de ' + fmtPct(redutorPct(s.parcela), 0) : 'Parcela integral')
      : P(lm.pend.length ? lm.pend : n.pend, 'Parcela do mês');
    L.qtdParcelas = V(mesC, 'estimado', 'Parcelas pagas do mês 1 ao mês ' + mesC + ' (inclui a do mês da contemplação)', 'Projeção de contemplação');
    L.totalParcelas = val(n.totalParcelas, 'estimado', 'Σ parcelas meses 1–' + mesC + ' = Plano ' + fmtBRL(n.pagoPlano) + ' + Adesão ' + fmtBRL(n.pagoAdesao) + ' + Seguro ' + fmtBRL(n.pagoSeguro), 'Demonstrativo mensal');
    L.totalAportado = val(n.totalAportado, 'estimado', 'Total aportado = Parcelas pagas ' + fmtBRL(n.totalParcelas) + ' + Recursos próprios do lance ' + fmtBRL(n.proprios), 'O lance embutido não é somado: ele sai do crédito, não do cliente.');
    L.venda = val(n.venda, 'estimado', 'Venda = ' + REGRAS.vendaPct + '% × crédito líquido ' + fmtBRL(n.credLiquido), 'Premissa fixa do simulador (hipótese, sem garantia de venda)');
    L.resultado = val(n.resultado, 'estimado', 'Resultado = Venda ' + fmtBRL(n.venda) + ' − Total aportado ' + fmtBRL(n.totalAportado), 'Cálculo', { nota: MSG.estimado });
    L.rentabilidade = isNum(n.rentabilidade) ? V(n.rentabilidade, 'estimado', 'Rentabilidade = Resultado ÷ Total aportado = ' + fmtBRL(n.resultado) + ' ÷ ' + fmtBRL(n.totalAportado), 'Cálculo', { nota: MSG.estimado }) : P(n.pend.length ? n.pend : ['Total aportado não calculado'], 'Resultado ÷ Total aportado');

    const abat = p.abatimento === 'prazo' ? 'redução do prazo (parcelas quitadas a partir do fim do plano)' : 'redução proporcional do valor das parcelas restantes';
    if (mesC >= n.N) {
      L.parcelaPos = V(null, 'na', 'Contemplação no último mês: não há parcelas posteriores', '');
      L.prazoRestante = V(0, 'calculado', 'Sem parcelas após a contemplação', '');
    } else {
      const notaAbat = mod === 'sorteio' ? '' : 'Lance abatido por ' + abat + '.';
      L.parcelaPos = val(n.parcelaPos, 'estimado', 'Parcela do mês ' + (mesC + 1) + (s.parcela.modalidade !== 'integral' ? ', com a diferença do redutor diluída nas parcelas restantes' : '') + (mod !== 'sorteio' ? ', após o abatimento do lance' : ''), 'Demonstrativo mensal', { nota: notaAbat });
      L.prazoRestante = V(n.prazoRestante, 'estimado', 'Parcelas restantes após a contemplação' + (mod !== 'sorteio' && p.abatimento === 'prazo' ? ' (prazo reduzido pelo lance)' : ''), 'Demonstrativo mensal');
    }
    L.saldoDevedor = val(n.saldoDevedor, 'estimado', 'Saldo devedor = saldo das parcelas restantes a valores do mês da contemplação ' + fmtBRL(n.saldoDevedor + (n.lanceTotal || 0)) + ' − lance ' + fmtBRL(n.lanceTotal || 0), 'Sem reajustes futuros; exclui seguro');
    L.obrigacoes = val(n.obrigacoes, 'estimado', 'Σ parcelas projetadas após a contemplação', 'Demonstrativo mensal', { nota: 'Em caso de venda, as parcelas restantes passam ao comprador, conforme as regras da administradora.' });
    return res;
  }

  // ---------------------------------------------------------------------------
  // Validações
  // ---------------------------------------------------------------------------

  function validar(s) {
    const a = [];
    const add = (nivel, campo, msg) => a.push({ nivel, campo, msg });
    const p = s.plano;
    const C = num(p.credito), N = num(p.prazo);
    if (!String(p.lead || '').trim()) add('erro', 'plano.lead', 'Campo obrigatório: nome completo.');
    if (isNum(num(p.creditoMinimo)) && isNum(C) && C < num(p.creditoMinimo)) add('erro', 'plano.credito', 'Crédito abaixo do mínimo do plano selecionado (' + fmtBRL(num(p.creditoMinimo)) + ').');
    if (!p.administradora) add('info', 'plano.administradora', 'Administradora não selecionada.');
    if (!isNum(C)) add('erro', 'plano.credito', 'Campo obrigatório: valor do crédito.');
    else if (C <= 0) add('erro', 'plano.credito', 'O valor do crédito deve ser maior que zero.');
    if (!isNum(N)) add('erro', 'plano.prazo', 'Campo obrigatório: prazo total.');
    else if (N < 1 || !Number.isInteger(N)) add('erro', 'plano.prazo', 'Prazo inválido: informe um número inteiro de meses.');
    else if (N > 420) add('alerta', 'plano.prazo', 'Prazo acima de 420 meses: confirme com a administradora.');
    const mc = num(p.mesContemplacao);
    if (!isNum(mc)) add('erro', 'plano.mesContemplacao', 'Campo obrigatório: projeção de contemplação (mês).');
    else if (mc < 1 || !Number.isInteger(mc) || (isNum(N) && mc > N)) add('erro', 'plano.mesContemplacao', 'Projeção de contemplação deve ser um mês entre 1 e o prazo.');
    for (const [k, rot] of [['taxaAdm', 'taxa de administração'], ['fundoReserva', 'fundo de reserva']]) {
      const v = num(p[k]);
      if (!isNum(v)) add('erro', 'plano.' + k, 'Campo obrigatório: ' + rot + ' (%). Informe 0 se não houver.');
      else if (v < 0 || v > 100) add('erro', 'plano.' + k, 'Percentual inválido em ' + rot + ' (0 a 100%).');
    }
    if (p.adesaoAtiva) {
      const ap = num(p.adesaoPct), am = num(p.adesaoMeses);
      if (!isNum(ap)) add('erro', 'plano.adesaoPct', 'Adesão ativada: informe o percentual.');
      else if (ap < 0 || ap > 100) add('erro', 'plano.adesaoPct', 'Percentual de adesão inválido.');
      if (!isNum(am)) add('erro', 'plano.adesaoMeses', 'Adesão ativada: informe os meses de diluição.');
      else if (am < 1 || !Number.isInteger(am) || (isNum(N) && am > N)) add('erro', 'plano.adesaoMeses', 'Meses de diluição da adesão devem estar entre 1 e o prazo.');
    }
    if (p.seguroAtivo) {
      const sp = num(p.seguroPct);
      if (!isNum(sp)) add('erro', 'plano.seguroPct', 'Seguro prestamista ativado: informe o percentual.');
      else if (sp < 0 || sp > 100) add('erro', 'plano.seguroPct', 'Percentual do seguro prestamista inválido.');
    }
    if (!INDICES[p.indice]) add('erro', 'plano.indice', 'Selecione o índice de reajuste.');
    else if (!isNum(taxaIndice(p))) {
      if (!isNum(N) || N > 12) add('erro', 'plano.indiceTaxa', 'Índice ' + nomeIndice(p) + ' sem premissa de projeção: informe a taxa estimada ao ano.');
    } else if (indiceEstimado(p)) add('info', 'plano.indiceTaxa', MSG.taxaEstimada);

    if (s.parcela.modalidade === 'outro') {
      const r = num(s.parcela.redutorOutro);
      if (!isNum(r) || r <= 0 || r >= 100) add('erro', 'parcela.redutorOutro', 'Percentual de redução inválido (maior que 0% e menor que 100%).');
    }

    const l = s.lances;
    const pctOk = (campo, rot) => {
      const v = num(l[campo]);
      if (!isNum(v)) add('erro', 'lances.' + campo, rot + ': informe o percentual.');
      else if (v < 0 || v > 100) add('erro', 'lances.' + campo, rot + ': percentual inválido (0 a 100%).');
    };
    const fid = s.fidelidade;
    if (fid && fid.ativo) {
      [1, 2, 3].forEach((i) => {
        const pa = num(fid['p' + i + 'Parcela']), pc = num(fid['p' + i + 'Pct']);
        if (!isNum(pa) || pa < 1 || !Number.isInteger(pa) || (isNum(N) && pa > N)) add('erro', 'fidelidade.p' + i + 'Parcela', 'Lance Fidelidade ' + i + ': parcela inicial deve estar entre 1 e o prazo.');
        if (!isNum(pc) || pc < 0 || pc > 100) add('erro', 'fidelidade.p' + i + 'Pct', 'Lance Fidelidade ' + i + ': percentual inválido (0 a 100%).');
      });
    }
    const mec = s.mecanismo;
    // Mecanismo de Alavancagem só no imóvel (no veículo o módulo fica oculto e não é validado)
    if (mec && mec.ativo && p.categoria !== 'veiculo') {
      const m2 = num(mec.mesNovas);
      if (!isNum(m2) || m2 < 1 || !Number.isInteger(m2) || (isNum(N) && m2 > N)) add('erro', 'mecanismo.mesNovas', 'Mecanismo de Alavancagem: mês de contemplação das novas cartas deve estar entre 1 e o prazo.');
      [1, 2, 3, 4].forEach((i) => {
        const q = mec['q' + i];
        if (q !== null && q !== '' && q !== undefined && (!isNum(num(q)) || num(q) < 1 || !Number.isInteger(num(q)))) add('erro', 'mecanismo.q' + i, 'Mecanismo de Alavancagem: quantidade de cartas do cenário ' + i + ' deve ser um número inteiro (1 ou mais).');
      });
      if (!mec.q1 && !mec.q2 && !mec.q3 && !mec.q4) add('aviso', 'mecanismo.q1', 'Mecanismo de Alavancagem: informe a quantidade de cartas em pelo menos um cenário.');
      if (mec.origem === 'embutido' && !l.embutidoAtivo) add('aviso', 'mecanismo.origem', 'Mecanismo de Alavancagem: lance embutido desativado; a origem usada é o sorteio.');
    }
    if (l.recursosAtivo) {
      const rv = num(l.recursosValor), fv = num(l.fgtsValor);
      if (!isNum(rv) && !(fgtsPermitido(s) && isNum(fv))) add('erro', 'lances.recursosValor', 'Recursos próprios ativados: informe o valor disponível' + (fgtsPermitido(s) ? ' (recursos próprios e/ou FGTS).' : '.'));
      if (isNum(rv) && rv < 0) add('erro', 'lances.recursosValor', 'Recursos próprios não podem ser negativos.');
      if (isNum(fv) && fv < 0) add('erro', 'lances.fgtsValor', 'O FGTS não pode ser negativo.');
      if (!fgtsPermitido(s) && isNum(fv) && fv > 0) add('info', 'lances.fgtsValor', motivoSemFgts(s) + ' e não entra no lance.');
    }
    if (l.embutidoAtivo) pctOk('embutidoPct', 'Lance embutido');
    if (l.fixoAtivo) pctOk('fixoPct', 'Lance fixo');
    if (l.livreAtivo) pctOk('livrePct', 'Lance livre');
    if (l.retidoAtivo) {
      if (!l.retidoUsarRecursos && !l.retidoUsarEmbutido) add('erro', 'lances.retidoUsarRecursos', 'Lance retido: marque "Usar recursos próprios" e/ou "Usar lance embutido".');
      const rv = num(l.retidoRecursosValor), pe = num(l.retidoEmbutidoPct);
      if (l.retidoUsarRecursos && (!isNum(rv) || rv <= 0)) add('erro', 'lances.retidoRecursosValor', 'Lance retido: informe o valor dos recursos próprios (R$).');
      if (l.retidoUsarEmbutido && (!isNum(pe) || pe <= 0 || pe >= 100)) add('erro', 'lances.retidoEmbutidoPct', 'Lance retido: percentual do embutido entre 0% e 100%.');
      const total = (l.retidoUsarRecursos && isNum(rv) ? rv : 0) + (l.retidoUsarEmbutido && isNum(pe) && isNum(C) ? (pe / 100) * C : 0);
      if (isNum(C) && total > C) add('alerta', 'lances.retidoRecursosValor', 'Lance retido acima do crédito contratado: confira os valores.');
    }
    const ec = s.estrategiaCartas;
    if (ec && ec.ativo) {
      const q = num(ec.qtd), min = ec.tipo === 'multiplicar' ? 1 : 2;
      if (!isNum(q) || !Number.isInteger(q) || q < min || q > REGRAS.cartasMax) add('erro', 'estrategiaCartas.qtd', 'Estratégia de cartas: quantidade de ' + min + ' a ' + REGRAS.cartasMax + ' cartas.');
    }
    if ((l.fixoAtivo && l.fixoUsarEmbutido) || (l.livreAtivo && l.livreUsarEmbutido)) {
      if (!l.embutidoAtivo) add('alerta', 'lances.embutidoAtivo', '"Usar embutido" marcado, mas o lance embutido está desativado: o embutido não será considerado.');
    }
    return a;
  }

  // ---------------------------------------------------------------------------
  // Premissas e pontos a confirmar
  // ---------------------------------------------------------------------------

  function premissas(s) {
    const p = s.plano;
    const t = taxaIndice(p);
    const l = [];
    l.push('Parcela = [(Crédito ÷ Prazo) × (1 − Redutor)] + (Taxa de administração ÷ Prazo) + (Fundo de reserva ÷ Prazo), com taxa de administração e fundo de reserva em % do crédito.');
    l.push('Reajuste anual pelo índice ' + nomeIndice(p) + (isNum(t) ? ' (' + fmtPct(t) + ' ao ano' + (indiceEstimado(p) ? ', taxa estimada' : '') + ')' : ' (taxa não informada)') + ', a cada 12 meses (meses 13, 25, 37...) até o fim do plano. O reajuste incide sobre o crédito e as parcelas são recalculadas sobre o crédito reajustado.');
    if (s.parcela.modalidade !== 'integral') l.push('Redutor de ' + fmtPct(redutorPct(s.parcela), 0) + ' aplicado da 1ª parcela até a contemplação. Depois, a diferença não paga é diluída nas parcelas restantes.');
    if (p.adesaoAtiva) l.push('Adesão de ' + fmtPct(num(p.adesaoPct)) + ' do crédito contratado, diluída em ' + (p.adesaoMeses || '—') + ' parcela(s) iguais, sem reajuste.');
    if (p.seguroAtivo) l.push('Seguro prestamista de ' + fmtPct(num(p.seguroPct), 3) + ' ao mês sobre o valor total do plano (crédito atualizado + taxa de administração + fundo de reserva' + (p.adesaoAtiva ? ' + adesão' : '') + '), somado à parcela.');
    l.push('Lance abatido por ' + (p.abatimento === 'prazo' ? 'redução do prazo (quita parcelas a partir do fim do plano)' : 'redução proporcional do valor das parcelas restantes') + ', a valores do mês da contemplação.');
    l.push('Percentuais de lance calculados sobre o crédito atualizado no mês da contemplação. Recursos próprios = lance total − lance embutido.');
    l.push('Contemplação projetada no mês ' + (p.mesContemplacao || '—') + '. A parcela desse mês é considerada paga.');
    l.push('Venda da carta contemplada: ' + REGRAS.vendaPct + '% sobre o crédito líquido disponível (hipótese fixa, sem garantia de venda). Resultado = valor de venda − total aportado (parcelas pagas + recursos próprios do lance).');
    return l;
  }

  function pontosConfirmar(s) {
    const p = s.plano;
    const l = [];
    if (indiceEstimado(p)) l.push('Taxa projetada do índice ' + nomeIndice(p) + ' (estimativa informada pelo consultor)');
    l.push('Percentuais de taxa de administração, fundo de reserva, adesão e seguro praticados pela administradora' + (p.administradora ? ' ' + p.administradora : ''));
    l.push('Percentual máximo de lance embutido e percentual do lance fixo do grupo');
    l.push('Forma de recomposição do redutor e de amortização do lance adotada pela administradora');
    l.push('Transferência da carta e das parcelas restantes em caso de venda');
    return l;
  }

  // ---------------------------------------------------------------------------
  // Resumo
  // ---------------------------------------------------------------------------

  function parcelaDataBase(s, redutor) {
    const b = basicos(s);
    if (!isNum(b.C) || !isNum(b.N) || !isNum(b.ta) || !isNum(b.fr) || b.N < 1) return null;
    const k = 1 - redutor / 100;
    const kTaxas = redutorNaParcelaToda(s.plano) ? k : 1;
    return (1 / b.N) * b.C * k + ((b.ta / 100) / b.N) * b.C * kTaxas + ((b.fr / 100) / b.N) * b.C * kTaxas;
  }

  function resumo(s, nSorteio) {
    const p = s.plano;
    const b = basicos(s);
    const R = {};
    const C = b.C, N = b.N;
    R.credito = isNum(C) ? V(C, 'informado', 'Valor do crédito', 'Informado pelo consultor') : P('Crédito não informado');
    R.prazo = isNum(N) ? V(N, 'informado', 'Prazo total em meses', 'Informado pelo consultor') : P('Prazo não informado');
    R.taxaAdm = isNum(b.ta) && isNum(C) ? V((b.ta / 100) * C, 'calculado', 'Taxa adm. total = ' + fmtPct(b.ta) + ' × ' + fmtBRL(C), 'Percentual informado', { pct: b.ta }) : P('Taxa de administração ou crédito não informados');
    R.taxaAno = isNum(b.ta) && isNum(b.fr) && isNum(N) && N > 0 ? V((b.ta + b.fr) / (N / 12), 'calculado', 'Total de taxas ao ano = (taxa de administração ' + fmtPct(b.ta) + ' + fundo de reserva ' + fmtPct(b.fr) + ') ÷ (' + N + ' meses ÷ 12)', 'Taxas diluídas pelos anos do plano') : P('Taxa de administração, fundo de reserva ou prazo não informados');
    R.fundoReserva = isNum(b.fr) && isNum(C) ? V((b.fr / 100) * C, 'calculado', 'Fundo de reserva total = ' + fmtPct(b.fr) + ' × ' + fmtBRL(C), 'Percentual informado', { pct: b.fr }) : P('Fundo de reserva ou crédito não informados');
    if (p.adesaoAtiva) {
      const ap = num(p.adesaoPct), am = num(p.adesaoMeses);
      R.adesao = isNum(ap) && isNum(am) && isNum(C) && am >= 1 ? V((ap / 100) * C, 'calculado', 'Adesão = ' + fmtPct(ap) + ' × ' + fmtBRL(C) + ', em ' + am + ' parcela(s) de ' + fmtBRL((ap / 100) * C / am), 'Percentual informado', { mensal: (ap / 100) * C / am }) : P('Adesão: percentual ou meses não informados');
    } else R.adesao = V(null, 'na', 'Sem taxa de adesão', '', { nota: 'Sem adesão' });

    const r = redutorPct(s.parcela);
    const pInt = parcelaDataBase(s, 0);
    R.parcelaIntegral = isNum(pInt)
      ? V(pInt, 'calculado', 'Parcela integral = (' + fmtBRL(C) + ' ÷ ' + N + ') + (' + fmtBRL(R.taxaAdm.v) + ' ÷ ' + N + ') + (' + fmtBRL(R.fundoReserva.v) + ' ÷ ' + N + ')', 'Fórmula da parcela; sem adesão, seguro e reajuste')
      : P(b.pend, 'Parcela integral');
    if (s.parcela.modalidade !== 'integral') {
      const pr = isNum(r) ? parcelaDataBase(s, r) : null;
      R.parcelaRedutor = isNum(pr)
        ? V(pr, 'calculado', redutorNaParcelaToda(p)
          ? 'Parcela com redutor (' + p.administradora + ') = [(' + fmtBRL(C) + ' ÷ ' + N + ') + (' + fmtBRL(R.taxaAdm.v) + ' ÷ ' + N + ') + (' + fmtBRL(R.fundoReserva.v) + ' ÷ ' + N + ')] × (1 − ' + fmtPct(r, 0) + ')'
          : 'Parcela com redutor = (' + fmtBRL(C) + ' ÷ ' + N + ') × (1 − ' + fmtPct(r, 0) + ') + (' + fmtBRL(R.taxaAdm.v) + ' ÷ ' + N + ') + (' + fmtBRL(R.fundoReserva.v) + ' ÷ ' + N + ')', 'Fórmula da parcela; sem adesão, seguro e reajuste')
        : P(b.pend, 'Parcela com redutor');
    }
    const l1 = nSorteio.ok ? nSorteio.linhas[0] : null;
    R.parcelaInicial = l1 && isNum(l1.total)
      ? V(l1.total, 'calculado', 'Parcela do mês 1 = Fundo comum ' + fmtBRL(l1.fundoComum) + ' + Taxa adm. ' + fmtBRL(l1.taxa) + ' + Fundo de reserva ' + fmtBRL(l1.fundo) + ' + Adesão ' + fmtBRL(l1.adesao) + ' + Seguro ' + fmtBRL(l1.seguro), 'Demonstrativo mensal')
      : P(nSorteio.pend, 'Parcela do mês 1');
    R.seguro = !p.seguroAtivo ? V(null, 'na', 'Seguro prestamista não contratado', '', { nota: 'Não contratado' })
      : l1 && isNum(l1.seguro) ? V(l1.seguro, 'calculado', 'Seguro = ' + fmtPct(num(p.seguroPct), 3) + ' × valor total do plano ' + fmtBRL(l1.seguro / (num(p.seguroPct) / 100)) + ' (crédito ' + fmtBRL(l1.credAtual) + ' + taxa adm. ' + fmtPct(b.ta, 2) + ' + fundo de reserva ' + fmtPct(b.fr, 2) + (p.adesaoAtiva ? ' + adesão' : '') + ')', 'Percentual informado') : P('Seguro prestamista: percentual não informado');
    R.totalPago = nSorteio.ok && isNum(nSorteio.totalPlano)
      ? V(nSorteio.totalPlano, 'estimado', 'Σ parcelas dos meses 1 a ' + N + ' (cenário sem lance, contemplação no mês ' + nSorteio.mesC + ')', 'Demonstrativo mensal', { nota: MSG.estimado })
      : P(nSorteio.pend, 'Σ parcelas do plano');
    return R;
  }

  // ---------------------------------------------------------------------------
  // Projeções (dados dos gráficos)
  // ---------------------------------------------------------------------------

  function modsAtivas(s) {
    const l = ['sorteio'];
    if (s.lances.embutidoAtivo) l.push('embutido');
    if (s.lances.fixoAtivo) l.push('fixo');
    if (s.lances.livreAtivo) l.push('livre');
    if (s.lances.retidoAtivo) l.push('retido');
    return l;
  }

  function projecoes(s, nucleos) {
    const out = {};
    const b = basicos(s);
    if (!b.ok) return out;
    const pr = s.projecoes;
    const mods = modsAtivas(s);
    if (pr.parcelas) {
      out.parcelas = mods.map((mod) => ({ mod, nome: NOMES_MOD[mod], pontos: nucleos[mod].ok ? nucleos[mod].linhas.map((l) => ({ x: l.m, y: l.encerrado ? null : l.total })) : [] }));
    }
    if (pr.credito) {
      const pts = [];
      for (let ano = 1; ano <= Math.ceil(b.N / 12); ano++) {
        const m = (ano - 1) * 12 + 1;
        const f = fator(s.plano, m);
        pts.push({ x: ano, rotulo: 'Ano ' + ano, y: isNum(f) ? b.C * f : null });
      }
      out.credito = pts;
    }
    return out;
  }

  // ---------------------------------------------------------------------------
  // Simulação de aquisição: CET do uso da carta para comprar o bem
  // ---------------------------------------------------------------------------

  /** Valor presente dos fluxos (índice 1 = mês 1) a uma taxa mensal. */
  function vpl(fluxos, i) {
    let v = 0;
    for (let t = 1; t < fluxos.length; t++) v += fluxos[t] / Math.pow(1 + i, t);
    return v;
  }

  /**
   * Taxa interna de retorno mensal do ponto de vista do cliente que usa o crédito.
   * Procura a menor taxa positiva em que o VPL muda de sinal e refina por bissecção.
   */
  function tirMensal(fluxos) {
    let a = 0, fa = vpl(fluxos, 0);
    if (Math.abs(fa) < 1e-6) return 0;
    for (let i = 0.0005; i <= 0.2 + 1e-12; i += 0.0005) {
      const fi = vpl(fluxos, i);
      if ((fa < 0 && fi >= 0) || (fa > 0 && fi <= 0)) {
        let lo = a, hi = i, flo = fa;
        for (let k = 0; k < 80; k++) {
          const mid = (lo + hi) / 2, fm = vpl(fluxos, mid);
          if ((flo < 0 && fm < 0) || (flo > 0 && fm > 0)) { lo = mid; flo = fm; } else hi = mid;
        }
        return (lo + hi) / 2;
      }
      a = i; fa = fi;
    }
    return null;
  }

  /**
   * Aquisição do bem com a carta: o cliente paga todas as parcelas (com reajustes até o fim do plano)
   * e os recursos próprios do lance, e recebe o crédito disponível no mês da contemplação.
   */
  function aquisicao(s, mod) {
    const n = nucleo(s, mod);
    const out = { mod, nome: NOMES_MOD[mod], ok: false, pend: n.pend };
    if (!n.ok || !isNum(n.totalPlano) || !isNum(n.credLiquido) || !isNum(n.proprios)) return out;
    const fluxos = [0];
    n.linhas.forEach((l) => fluxos.push(-(l.total || 0)));
    fluxos[n.mesC] += n.credLiquido - n.proprios;
    const i = tirMensal(fluxos);
    out.ok = true;
    out.mesC = n.mesC;
    out.credito = n.credLiquido;
    out.proprios = n.proprios;
    out.fgts = n.fgts;
    out.totalParcelas = n.totalPlano;
    out.prazoEfetivo = n.mesC + n.prazoRestante;
    out.desembolso = n.totalPlano + n.proprios;
    out.custo = out.desembolso - n.credLiquido;
    out.custoPct = n.credLiquido > 0 ? (out.custo / n.credLiquido) * 100 : null;
    out.parcelaPos = n.parcelaPosAtual;
    out.locacao = (REGRAS.locacaoPct / 100) * n.credLiquido;
    out.cetMes = isNum(i) ? i * 100 : null;
    out.cetAno = isNum(i) ? (Math.pow(1 + i, 12) - 1) * 100 : null;
    return out;
  }

  // ---------------------------------------------------------------------------
  // Lance Fidelidade: contemplação a partir da parcela da opção, lance 100% embutido
  // ---------------------------------------------------------------------------

  function fidelidade(s) {
    const f = s.fidelidade;
    if (!f || !f.ativo) return [];
    return [1, 2, 3].map((i) => {
      const parcela = num(f['p' + i + 'Parcela']);
      const pct = num(f['p' + i + 'Pct']);
      return { i, nome: 'Fidelidade ' + i, parcela, pct, nucleo: nucleo(s, 'fidelidade', parcela, pct) };
    });
  }

  // ---------------------------------------------------------------------------
  // Mecanismo de Alavancagem: a venda (ou o lucro) da carta no mês da projeção de contemplação
  // é reaplicada em novas cartas com as mesmas características do plano; cada nova carta é
  // contemplada e vendida no mês informado.
  // ---------------------------------------------------------------------------

  function mecanismo(s) {
    const m = s.mecanismo;
    if (!m || !m.ativo || s.plano.categoria === 'veiculo') return null;
    const origem = m.origem === 'embutido' && s.lances.embutidoAtivo ? 'embutido' : 'sorteio';
    const base = m.base === 'lucro' ? 'lucro' : 'venda';
    const out = { ok: false, base, origem, nomeOrigem: NOMES_MOD[origem], pend: [], cenarios: [] };
    const n0 = nucleo(s, origem);
    if (!n0.ok) { out.pend = n0.pend; return out; }
    out.mesOrigem = n0.mesC;
    out.vendaOrigem = n0.venda;
    out.lucroOrigem = n0.resultado;
    const bruto = base === 'lucro' ? n0.resultado : n0.venda;
    out.capital = isNum(bruto) ? Math.max(0, bruto) : null;
    const b = basicos(s);
    const m2 = num(m.mesNovas);
    if (!isNum(m2) || !Number.isInteger(m2) || m2 < 1 || m2 > b.N) { out.pend.push('Mês de contemplação das novas cartas inválido'); return out; }
    const nova = nucleo(s, 'sorteio', m2);
    if (!nova.ok || !isNum(out.capital)) { out.pend = out.pend.concat(nova.pend); return out; }
    out.ok = true;
    out.mesNovas = m2;
    out.carta = { credito: nova.credBruto, credLiquido: nova.credLiquido, parcela: nova.linhas[0].total, aporte: nova.totalAportado, venda: nova.venda };
    [1, 2, 3, 4].forEach((i) => {
      const q = num(m['q' + i]);
      if (!isNum(q) || q < 1 || !Number.isInteger(q)) return;
      const aporte = q * nova.totalAportado;
      const coberto = Math.min(out.capital, aporte);
      // Meses de parcelas pagos só com o capital
      let acum = 0, meses = 0;
      for (let k = 0; k < m2; k++) { const p = q * (nova.linhas[k].total || 0); if (acum + p > out.capital + 1e-6) break; acum += p; meses++; }
      const venda = q * nova.venda;
      out.cenarios.push({
        i, q,
        credito: q * nova.credBruto,
        parcelaInicial: q * nova.linhas[0].total,
        aporte,
        coberto,
        adicional: aporte - coberto,
        sobra: out.capital - coberto,
        mesesCobertos: meses,
        venda,
        lucro: venda - aporte,
        // patrimônio ao fim: venda das novas cartas + capital que sobrou
        patrimonio: venda + (out.capital - coberto)
      });
    });
    return out;
  }

  // ---------------------------------------------------------------------------
  // Simulação de alavancagem: contemplação e venda em meses sucessivos
  // ---------------------------------------------------------------------------

  // Meses 1 a 12 um a um; depois de 6 em 6 até o mês 48
  const MESES_ALAVANCAGEM = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24, 30, 36, 42, 48];

  function alavancagem(s) {
    const b = basicos(s);
    if (!b.ok) return [];
    const mods = ['sorteio'];
    if (s.lances.embutidoAtivo) mods.push('embutido');
    const meses = MESES_ALAVANCAGEM.filter((m) => m <= b.N);
    return mods.map((mod) => ({
      mod,
      nome: NOMES_MOD[mod],
      linhas: meses.map((m) => {
        const n = nucleo(s, mod, m);
        // Rentabilidade ao mês: taxa mensal equivalente do resultado no prazo da linha
        const rentMes = isNum(n.venda) && isNum(n.totalAportado) && n.totalAportado > 0 && n.venda > 0 ? (Math.pow(n.venda / n.totalAportado, 1 / m) - 1) * 100 : null;
        return { m, credito: n.credLiquido, parcela: n.parcelaMes, aporte: n.totalAportado, venda: n.venda, lucro: n.resultado, rentabilidade: rentMes, rentabilidadeTotal: n.rentabilidade };
      })
    }));
  }

  // ---------------------------------------------------------------------------
  // Função principal
  // ---------------------------------------------------------------------------

  /**
   * Estratégia de cartas sobre a simulação em tela. Split: o crédito simulado é dividido em N cartas iguais;
   * multiplicar: N cartas iguais à simulada. Parcelas, lances, créditos e saldos são proporcionais ao crédito,
   * então cada carta = simulação × fator da carta e o total = simulação × fator do total.
   */
  function estrategiaCartas(s, cenarios) {
    const e = s.estrategiaCartas || {};
    if (!e.ativo) return null;
    const tipo = e.tipo === 'multiplicar' ? 'multiplicar' : 'split';
    const n = num(e.qtd);
    const out = { tipo, n, ok: false, pend: [] };
    const min = tipo === 'split' ? 2 : 1;
    if (!isNum(n) || !Number.isInteger(n) || n < min || n > REGRAS.cartasMax) { out.pend.push('Quantidade de cartas entre ' + min + ' e ' + REGRAS.cartasMax); return out; }
    const sorteio = cenarios.find((c) => c.mod === 'sorteio');
    const C = num(s.plano.credito);
    if (!sorteio || !sorteio.nucleo.ok || !isNum(C)) { out.pend.push('Complete os dados do plano'); return out; }
    const fCarta = tipo === 'split' ? 1 / n : 1;
    const fTotal = tipo === 'split' ? 1 : n;
    const par = (v) => (isNum(v) ? { carta: v * fCarta, total: v * fTotal } : { carta: null, total: null });
    Object.assign(out, {
      ok: true,
      credito: par(C),
      parcelaInicial: par(sorteio.nucleo.linhas[0] && sorteio.nucleo.linhas[0].total),
      formas: cenarios.filter((c) => c.nucleo.ok).map((c) => {
        const k = c.nucleo;
        return {
          mod: c.mod, nome: c.nome,
          lance: par(k.lance ? k.lance.total : 0),
          proprios: par(isNum(k.proprios) ? k.proprios : 0),
          credLiquido: par(k.credLiquido),
          parcelaPos: par(k.parcelaPosAtual),
          saldoDevedor: par(k.saldoDevedor)
        };
      })
    });
    const minimo = num(s.plano.creditoMinimo);
    if (isNum(minimo) && out.credito.carta < minimo - 0.005) out.alerta = 'Cada carta (' + fmtBRL(out.credito.carta) + ') fica abaixo do crédito mínimo do plano (' + fmtBRL(minimo) + ').';
    return out;
  }

  function simular(s) {
    const validacoes = validar(s);
    const mods = modsAtivas(s);
    const cenarios = mods.map((m) => cenario(s, m));
    const nucleos = {};
    cenarios.forEach((c) => { nucleos[c.mod] = c.nucleo; });
    cenarios.forEach((c) => c.alertas.forEach((x) => validacoes.push(Object.assign({ campo: 'lances' }, x))));
    const b = basicos(s);
    const baseLance = nucleos.sorteio && nucleos.sorteio.ok ? nucleos.sorteio.credBruto : null;
    const fid = fidelidade(s);
    const mec = mecanismo(s);
    const valor = (pct) => (isNum(baseLance) && isNum(num(pct)) ? (num(pct) / 100) * baseLance : null);
    return {
      validacoes,
      resumo: resumo(s, nucleos.sorteio),
      cenarios,
      valoresLance: Object.assign({
        embutido: valor(s.lances.embutidoPct), fixo: valor(s.lances.fixoPct), livre: valor(s.lances.livrePct), mecCapital: mec ? mec.capital : null,
        // Lance Retido: recursos próprios (R$ → %), embutido (% → R$) e o total somado, sobre o crédito na contemplação
        ...valoresRetido(s.lances, baseLance)
      },
        ...fid.map((f) => ({ ['fid' + f.i]: f.nucleo.ok ? f.nucleo.embutido : null }))),
      baseLance,
      projecoes: projecoes(s, nucleos),
      alavancagem: alavancagem(s),
      fidelidade: fid,
      mecanismo: mec,
      cartas: estrategiaCartas(s, cenarios),
      aquisicao: ['sorteio'].concat(s.lances.embutidoAtivo ? ['embutido'] : []).map((m) => aquisicao(s, m)),
      premissas: premissas(s),
      pontosConfirmar: pontosConfirmar(s),
      redutorPct: redutorPct(s.parcela),
      prazo: b.N
    };
  }

  return {
    normalizarPlano, aplicarPlanoCadastrado, normalizarIndice, mecanismo, redutorNaParcelaToda, INDICES, CATEGORIAS, ADMINISTRADORAS, MODALIDADES_PARCELA, REGRAS, MSG, NOMES_MOD,
    estadoPadrao, aplicarCategoria, simular, nucleo, aquisicao, estrategiaCartas, tirMensal, vpl, cenario, validar, fator, qtdReajustes, parcelaDataBase, redutorPct,
    nomeIndice, taxaIndice, indiceEstimado, lanceSobre, fgtsPermitido, motivoSemFgts,
    fmtBRL, fmtPct, fmtNum, num, isNum
  };
});

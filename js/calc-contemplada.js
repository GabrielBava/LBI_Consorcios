/*
 * Motor de cálculo do Simulador de Cartas Contempladas.
 *
 * Funções puras, sem dependência de interface (DOM). Pode ser usado no
 * navegador (window.CalcCont) e no Node.js (require('./calc-contemplada')) para testes.
 *
 * Convenções:
 * - Cada carta tem crédito disponível, entrada (ágio) paga, parcela atual e prazo restante.
 * - Meses são numerados de 1 até o maior prazo das cartas (junção).
 * - Saldo devedor de um mês = parcela vigente × parcelas restantes (valores do mês, sem
 *   antecipar reajustes futuros), como nas administradoras.
 * - O CET segue o simulador de cartas contempladas: aproximação linear, sem juros compostos.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CalcCont = factory();
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

  const SEGMENTOS = {
    imovel: { nome: 'Imóvel', indice: 'incc' },
    veiculo: { nome: 'Veículo', indice: 'ipca' },
    servico: { nome: 'Serviço', indice: 'ipca' }
  };

  const REGRAS = {
    transferenciaPct: 1, // estimativa de transferência: 1% sobre o crédito total
    prazoCartaMax: 600, // prazo restante máximo aceito por carta (meses)
    periodicidadeReajuste: 12, // reajuste anual
    reajusteMesPadrao: 13, // 1º reajuste na 13ª parcela da simulação
    comprometimentoRenda: 30, // financiamento: a parcela não pode passar de 30% da renda
    idadeLimite: 65, // financiamento: idade máxima ao fim do contrato
    prazoFinanciamentoMax: 420,
    prazosFinanciamento: [360, 420]
  };

  // Calculadora de rendimentos: parâmetros de referência (editáveis). Selic, CDI, IPCA e poupança
  // são atualizados pelo Banco Central quando há conexão; os demais seguem a calculadora de renda fixa.
  const PARAMS_RENDIMENTOS = {
    selic: 15, // Selic efetiva (% a.a.)
    cdi: 14.9, // CDI (% a.a.)
    ipca: 4.5, // IPCA projetado 12 meses (% a.a.)
    poupanca: 0.67, // rentabilidade da poupança (% a.m.)
    tesouroPre: 14, // juro nominal do Tesouro Prefixado (% a.a.)
    custodia: 0.2, // taxa de custódia da B3 no Tesouro Direto (% a.a.)
    tesouroIpca: 6.5, // juro real do Tesouro IPCA+ (% a.a.)
    admFundoDi: 0.25, // taxa de administração do Fundo DI (% a.a.)
    cdbPct: 100, cdbTipo: 'cdi', // rentabilidade do CDB: % do CDI | prefixado (% a.a.) | ipca (IPCA + % a.a.)
    fundoDiPct: 98.17, // rentabilidade do Fundo DI (% do CDI)
    lciPct: 85, lciTipo: 'cdi' // rentabilidade da LCI/LCA
  };

  const PRODUTOS = {
    poupanca: 'Poupança',
    cdb: 'CDB',
    lci: 'LCI e LCA',
    tesouroSelic: 'Tesouro Selic',
    fundoDi: 'Fundo DI',
    tesouroIpca: 'Tesouro IPCA+',
    tesouroPre: 'Tesouro Prefixado'
  };

  // ---------------------------------------------------------------------------
  // Estado padrão
  // ---------------------------------------------------------------------------

  const cartaVazia = () => ({ credito: null, entrada: null, parcela: null, prazo: null });

  function estadoPadrao() {
    return {
      segmento: 'imovel',
      administradora: '',
      cartas: [cartaVazia()],
      indice: 'incc',
      indiceTaxa: null,
      indiceNome: '',
      reajusteMes: REGRAS.reajusteMesPadrao,
      // Fluxo de parcelas: sempre exibido; o reajuste pelo indexador começa desabilitado
      fluxo: { reajuste: false },
      // Guias opcionais: todas começam desabilitadas
      amortizacao: { ativo: false, valor: null, mes: 12 },
      evolucao: { ativo: false },
      // ref: taxas de referência de onde vieram os parâmetros (o que difere delas foi editado pelo usuário)
      rendimentos: { ativo: false, mensal: 0, meses: null, params: Object.assign({}, PARAMS_RENDIMENTOS), ref: Object.assign({}, PARAMS_RENDIMENTOS) },
      // Financiamento: TR (% a.a.) corrige o saldo; MIP (% a.m. do saldo), DFI/DFC (% a.m. do valor do bem),
      // outros seguros e taxa de administração (R$/mês) são os custos além dos juros
      financiamento: { ativo: false, sistema: 'price', prazo: 420, entradaPct: 20, credito: null, juros: 11.5, tr: 2, mip: 0.03, dfi: 0.008, seguros: 0, ta: 25 }
    };
  }

  // ---------------------------------------------------------------------------
  // Utilitários
  // ---------------------------------------------------------------------------

  const num = (x) => (x === null || x === undefined || x === '' || Number.isNaN(Number(x)) ? null : Number(x));
  const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
  const inteiro = (x) => isNum(x) && Number.isInteger(x);

  const fmtBRL = (x) =>
    isNum(x) ? x.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
  const fmtPct = (x, d) => (isNum(x) ? x.toLocaleString('pt-BR', { minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d }) + '%' : '—');
  const fmtNum = (x, d) => (isNum(x) ? x.toLocaleString('pt-BR', { minimumFractionDigits: d || 0, maximumFractionDigits: d == null ? 6 : d }) : '—');

  function taxaIndice(s) {
    const def = INDICES[s.indice];
    if (!def) return null;
    if (isNum(def.taxaFixa)) return def.taxaFixa;
    return num(s.indiceTaxa);
  }

  function nomeIndice(s) {
    if (s.indice === 'outro') return s.indiceNome ? String(s.indiceNome) : 'Outro índice';
    return (INDICES[s.indice] || { nome: 'Não selecionado' }).nome;
  }

  const indiceEstimado = (s) => ['ipca', 'incc', 'inpc', 'outro'].includes(s.indice);

  /** Mês do 1º reajuste (padrão 13). */
  function mesReajuste(s) {
    const m = num(s.reajusteMes);
    return inteiro(m) && m >= 1 ? m : REGRAS.reajusteMesPadrao;
  }

  /** Reajustes aplicados até o mês t: o 1º no mês informado e depois a cada 12 meses. */
  function qtdReajustes(t, m1) {
    return t < m1 ? 0 : 1 + Math.floor((t - m1) / REGRAS.periodicidadeReajuste);
  }

  // ---------------------------------------------------------------------------
  // Cartas e resumo da proposta
  // ---------------------------------------------------------------------------

  /** Lê as cartas válidas (crédito, parcela e prazo informados). */
  function lerCartas(s) {
    return (s.cartas || []).map((c, i) => {
      const credito = num(c.credito), entrada = num(c.entrada), parcela = num(c.parcela), prazo = num(c.prazo);
      const ok = isNum(credito) && credito > 0 && isNum(parcela) && parcela > 0 && inteiro(prazo) && prazo >= 1 && prazo <= REGRAS.prazoCartaMax;
      return { i, ok, credito, entrada: isNum(entrada) && entrada > 0 ? entrada : 0, parcela, prazo, saldo: ok ? parcela * prazo : null };
    });
  }

  /**
   * Resultado total da operação (mesmas fórmulas do simulador de cartas contempladas):
   * saldo devedor = parcela × prazo; custo da operação = saldo devedor + entrada (ágio);
   * custo da operação (%) = custo ÷ crédito − 100%.
   * CET (mesmo do simulador original): custo efetivo = entrada + saldo − crédito, sobre o crédito líquido;
   * CET mensal = custo efetivo % ÷ prazo ponderado pelo saldo; CET anual = CET mensal × 12 (+ indexador).
   */
  function resumo(s) {
    const cartas = lerCartas(s);
    const validas = cartas.filter((c) => c.ok);
    const out = { ok: validas.length > 0 && validas.length === cartas.length, cartas, qtd: cartas.length };
    if (!out.ok) return out;
    const soma = (k) => validas.reduce((a, c) => a + c[k], 0);
    out.credito = soma('credito');
    out.entrada = soma('entrada');
    out.saldoDevedor = soma('saldo');
    out.parcelaAtual = soma('parcela');
    out.creditoLiquido = out.credito - out.entrada;
    out.custo = out.saldoDevedor + out.entrada;
    out.custoPct = out.credito > 0 ? (out.custo / out.credito) * 100 - 100 : null;
    out.custoEfetivo = out.custo - out.credito;
    out.custoEfetivoPct = out.creditoLiquido > 0 ? (out.custoEfetivo / out.creditoLiquido) * 100 : null;
    out.prazoPonderado = out.saldoDevedor > 0 ? validas.reduce((a, c) => a + c.prazo * c.saldo, 0) / out.saldoDevedor : null;
    out.cetMes = isNum(out.custoEfetivoPct) && out.prazoPonderado ? out.custoEfetivoPct / out.prazoPonderado : null;
    out.cetAno = isNum(out.cetMes) ? out.cetMes * 12 : null;
    out.entradaPct = out.credito > 0 ? (out.entrada / out.credito) * 100 : null;
    out.transferencia = (REGRAS.transferenciaPct / 100) * out.credito;
    out.prazoMax = Math.max(...validas.map((c) => c.prazo));
    out.totalPago = out.entrada + out.saldoDevedor;
    return out;
  }

  // ---------------------------------------------------------------------------
  // Fluxo mensal das parcelas (com ou sem reajuste pelo indexador)
  // ---------------------------------------------------------------------------

  /**
   * Parcelas de todas as cartas mês a mês.
   * Com reajuste: parcela do mês t = parcela atual × (1 + taxa)^reajustes(t).
   * Retorna, por mês, a parcela total, o total pago até o mês e o saldo devedor após o pagamento.
   */
  function fluxoMensal(s, comReajuste) {
    const R = resumo(s);
    const out = { ok: false, comReajuste: !!comReajuste, pend: [], meses: [] };
    if (!R.ok) { out.pend.push('preencha crédito, parcela e prazo de todas as cartas'); return out; }
    const N = R.prazoMax;
    const m1 = mesReajuste(s);
    const taxa = comReajuste ? taxaIndice(s) : 0;
    if (comReajuste && !isNum(taxa) && N >= m1) {
      out.pend.push('Índice ' + nomeIndice(s) + ' sem taxa estimada (% a.a.) para projetar o reajuste');
      return out;
    }
    const cartas = R.cartas;
    let pago = 0;
    for (let t = 1; t <= N; t++) {
      const f = comReajuste ? Math.pow(1 + (taxa || 0) / 100, qtdReajustes(t, m1)) : 1;
      let total = 0, saldo = 0;
      cartas.forEach((c) => {
        if (t <= c.prazo) total += c.parcela * f;
        saldo += c.parcela * f * Math.max(0, c.prazo - t);
      });
      pago += total;
      out.meses.push({ t, f, total, pago, saldo });
    }
    out.ok = true;
    out.N = N;
    out.taxa = taxa;
    out.m1 = m1;
    out.total = pago;
    return out;
  }

  /** Agrupa meses consecutivos com o mesmo valor de parcela. */
  function agrupar(meses, campo) {
    const k = campo || 'total';
    const grupos = [];
    let i = 0;
    while (i < meses.length) {
      const ini = i;
      const valor = meses[i][k];
      i++; // cada faixa tem ao menos um mês, mesmo com valor não finito
      while (i < meses.length && Math.abs(meses[i][k] - valor) < 0.005) i++;
      const qtd = i - ini;
      grupos.push({ de: meses[ini].t, ate: meses[i - 1].t, qtd, valor, subtotal: valor * qtd });
    }
    return grupos;
  }

  const rotuloPeriodo = (g) => (g.de === g.ate ? 'Mês ' + g.de : 'Mês ' + g.de + ' a ' + g.ate);

  /** Guia Fluxo de Parcelas (sempre exibida): agrupamento por faixa de meses. */
  function fluxo(s) {
    const comReajuste = !!(s.fluxo && s.fluxo.reajuste);
    const F = fluxoMensal(s, comReajuste);
    return Object.assign(F, { grupos: F.ok ? agrupar(F.meses) : [] });
  }

  /** Meses exibidos nas tabelas anuais: 12, 24, 36... e o último mês. */
  function mesesAnuais(N, extras) {
    const set = new Set();
    for (let t = 12; t <= N; t += 12) set.add(t);
    set.add(N);
    (extras || []).forEach((t) => { if (inteiro(t) && t >= 1 && t <= N) set.add(t); });
    return Array.from(set).sort((a, b) => a - b);
  }

  /**
   * Guia Evolução de Parcelas: a cada 12 meses, parcela com reajuste pelo indexador,
   * aporte acumulado (parcelas já pagas) e saldo devedor, sempre por último.
   */
  function evolucao(s) {
    if (!s.evolucao || !s.evolucao.ativo) return null;
    const F = fluxoMensal(s, true);
    if (!F.ok) return { ok: false, pend: F.pend, linhas: [] };
    return {
      ok: true, taxa: F.taxa, m1: F.m1, N: F.N, total: F.total,
      linhas: mesesAnuais(F.N).map((t) => { const l = F.meses[t - 1]; return { t, parcela: l.total, pago: l.pago, saldo: l.saldo }; })
    };
  }

  // ---------------------------------------------------------------------------
  // Estudo de amortização: aporte extraordinário no mês informado
  // ---------------------------------------------------------------------------

  /**
   * No mês do aporte (depois de paga a parcela do mês), o valor abate o saldo devedor da junção.
   * As parcelas seguintes são recalculadas mantendo o prazo de cada carta: todas caem na mesma
   * proporção k = 1 − aporte ÷ saldo, e continuam com os reajustes pelo indexador.
   */
  function amortizacao(s) {
    const a = s.amortizacao;
    if (!a || !a.ativo) return null;
    const out = { ok: false, pend: [], linhas: [] };
    const valor = num(a.valor), mes = num(a.mes);
    const F = fluxoMensal(s, true);
    if (!F.ok) { out.pend = F.pend; return out; }
    if (!isNum(valor) || valor <= 0) out.pend.push('Informe o valor do aporte');
    if (!inteiro(mes) || mes < 1 || mes >= F.N) out.pend.push('O mês do aporte deve estar entre 1 e ' + (F.N - 1));
    if (out.pend.length) return out;
    const base = F.meses;
    const saldoAntes = base[mes - 1].saldo;
    const aporte = Math.min(valor, saldoAntes);
    const k = saldoAntes > 0 ? 1 - aporte / saldoAntes : 0;
    const fator = (t) => (t > mes ? k : 1);
    const somaBase = base.slice(mes).reduce((x, l) => x + l.total, 0);
    out.ok = true;
    out.mes = mes;
    out.valor = valor;
    out.aporte = aporte;
    out.limitado = valor > saldoAntes + 0.005;
    out.k = k;
    out.taxa = F.taxa;
    out.m1 = F.m1;
    out.N = F.N;
    out.saldoAntes = saldoAntes;
    out.saldoDepois = saldoAntes - aporte;
    out.parcelaAntes = base[mes].total;
    out.parcelaDepois = base[mes].total * k;
    out.reducaoParcelaPct = (1 - k) * 100;
    out.parcelasRestantesSem = somaBase;
    out.parcelasRestantesCom = somaBase * k;
    // Economia: parcelas que deixam de ser pagas (com reajuste) menos o próprio aporte = reajustes evitados
    const economia = somaBase - somaBase * k - aporte;
    out.economia = Math.abs(economia) < 0.005 ? 0 : economia;
    out.totalSem = F.total;
    out.totalCom = F.total - somaBase + somaBase * k + aporte;
    out.linhas = mesesAnuais(F.N, [mes]).map((t) => {
      const l = base[t - 1];
      return { t, aporte: t === mes, parcelaSem: l.total, parcela: l.total * fator(t), saldo: t >= mes ? l.saldo * k : l.saldo };
    });
    return out;
  }

  // ---------------------------------------------------------------------------
  // Calculadora de rendimentos (mesmo mecanismo da calculadora de renda fixa)
  // ---------------------------------------------------------------------------

  /** IR regressivo pelo prazo da aplicação em meses. */
  const aliquotaIR = (meses) => (meses <= 6 ? 22.5 : meses <= 11 ? 20 : meses <= 23 ? 17.5 : 15);
  /** Fator mensal equivalente a uma taxa anual. */
  const fatorMensal = (aa) => Math.pow(1 + aa / 100, 1 / 12);
  /** Valor futuro de aportes mensais iguais (fim de cada mês). */
  const fvMensal = (pmt, f, n) => (Math.abs(f - 1) < 1e-12 ? pmt * n : pmt * (Math.pow(f, n) - 1) / (f - 1));
  /** Custo acumulado de uma taxa anual (custódia, administração) em n meses, em fração. */
  const custoPeriodo = (aa, n) => Math.pow(1 + aa / 100, n / 12) - 1;

  /** Taxa anual de CDB ou LCI/LCA conforme o tipo: % do CDI, prefixado ou IPCA+. */
  function taxaTipo(p, pct, tipo) {
    if (tipo === 'prefixado') return pct;
    if (tipo === 'ipca') return p.ipca + pct;
    return (p.cdi * pct) / 100;
  }

  /**
   * Valores de um produto. Parcelas da aplicação:
   *   inicial no mês 0, aportes mensais do mês 1 ao fim e um aporte único no mês informado.
   * O aporte único só começa a render no próprio mês (nunca antes).
   */
  function produto(id, f, cfg, ap) {
    const n = ap.meses;
    const custoAa = cfg.custoAa || 0;
    const comIR = cfg.ir !== false;
    // Inicial + mensais: como na calculadora (IR e custos pelo prazo total)
    const brutoBase = ap.inicial * Math.pow(f, n) + fvMensal(ap.mensal, f, n);
    const investidoBase = ap.inicial + ap.mensal * n;
    const ganhoBase = brutoBase - investidoBase;
    let custos = brutoBase * custoPeriodo(custoAa, n);
    let ir = comIR ? ganhoBase * (aliquotaIR(n) / 100) : 0;
    let bruto = brutoBase;
    // Aporte único (valor da amortização) pelo prazo restante a partir do mês do aporte
    let extra = null;
    if (ap.extra) {
      const m = n - ap.extra.mes;
      const b = ap.extra.valor * Math.pow(f, m);
      const c = b * custoPeriodo(custoAa, m);
      const g = b - ap.extra.valor;
      const i = comIR ? g * (aliquotaIR(m) / 100) : 0;
      extra = { meses: m, bruto: b, custos: c, ir: i, liquido: b - c - i, ganho: b - c - i - ap.extra.valor };
      bruto += b; custos += c; ir += i;
    }
    const liquido = bruto - custos - ir;
    const inv = ap.investido;
    return {
      id, nome: PRODUTOS[id], taxaAa: cfg.taxaAa,
      bruto, rentBruta: inv > 0 ? (bruto / inv) * 100 - 100 : null,
      custos, ir, liquido, rentLiquida: inv > 0 ? (liquido / inv) * 100 - 100 : null,
      ganho: liquido - inv, extra
    };
  }

  /**
   * Cenário de investimento.
   * @param {object} ap { inicial, mensal, meses, extra?: { valor, mes } }
   * @param {object} p  parâmetros (PARAMS_RENDIMENTOS)
   */
  function calcularRendimentos(ap, p) {
    const P = Object.assign({}, PARAMS_RENDIMENTOS, p || {});
    ['selic', 'cdi', 'ipca', 'poupanca', 'tesouroPre', 'custodia', 'tesouroIpca', 'admFundoDi', 'cdbPct', 'fundoDiPct', 'lciPct'].forEach((k) => { P[k] = num(P[k]) || 0; });
    const n = ap.meses;
    const extra = ap.extra && isNum(ap.extra.valor) && ap.extra.valor > 0 && inteiro(ap.extra.mes) && ap.extra.mes >= 0 && ap.extra.mes < n ? ap.extra : null;
    const base = { inicial: ap.inicial || 0, mensal: ap.mensal || 0, meses: n, extra };
    base.investido = base.inicial + base.mensal * n + (extra ? extra.valor : 0);
    const tCdb = taxaTipo(P, P.cdbPct, P.cdbTipo);
    const tLci = taxaTipo(P, P.lciPct, P.lciTipo);
    const tFundo = (P.cdi * P.fundoDiPct) / 100;
    const lista = [
      produto('poupanca', 1 + P.poupanca / 100, { ir: false, taxaAa: (Math.pow(1 + P.poupanca / 100, 12) - 1) * 100 }, base),
      produto('cdb', fatorMensal(tCdb), { taxaAa: tCdb }, base),
      produto('lci', fatorMensal(tLci), { ir: false, taxaAa: tLci }, base),
      produto('tesouroSelic', fatorMensal(P.selic), { custoAa: P.custodia, taxaAa: P.selic }, base),
      produto('fundoDi', fatorMensal(tFundo), { custoAa: P.admFundoDi, taxaAa: tFundo }, base),
      produto('tesouroIpca', fatorMensal(P.ipca + P.tesouroIpca), { custoAa: P.custodia, taxaAa: P.ipca + P.tesouroIpca }, base),
      produto('tesouroPre', fatorMensal(P.tesouroPre), { custoAa: P.custodia, taxaAa: P.tesouroPre }, base)
    ].sort((a, b) => b.liquido - a.liquido);
    // Referência: o mesmo capital apenas corrigido pelo IPCA
    const fI = fatorMensal(P.ipca);
    let correcao = base.inicial * Math.pow(fI, n) + fvMensal(base.mensal, fI, n);
    if (extra) correcao += extra.valor * Math.pow(fI, n - extra.mes);
    return { investido: base.investido, inicial: base.inicial, mensal: base.mensal, meses: n, extra, produtos: lista, correcaoIpca: correcao, aliquotaIR: aliquotaIR(n) };
  }

  /**
   * Guia Calculadora de Rendimentos: aplicação inicial = crédito − entrada das cartas; período = maior prazo
   * da junção (pode ser reduzido). Com o estudo de amortização habilitado, o valor do aporte entra no mês do aporte.
   */
  function rendimentos(s, R, A) {
    const g = s.rendimentos;
    if (!g || !g.ativo) return null;
    const out = { ok: false, pend: [] };
    if (!R.ok) { out.pend.push('preencha crédito, parcela e prazo de todas as cartas'); return out; }
    const inicial = R.creditoLiquido;
    if (!(inicial > 0)) { out.pend.push('O crédito líquido (crédito − entrada) precisa ser maior que zero'); return out; }
    const mensal = num(g.mensal);
    const pedido = num(g.meses);
    const meses = inteiro(pedido) && pedido >= 1 ? Math.min(pedido, R.prazoMax) : R.prazoMax;
    const extra = A && A.ok ? { valor: A.aporte, mes: A.mes } : null;
    const res = calcularRendimentos({ inicial, mensal: isNum(mensal) && mensal > 0 ? mensal : 0, meses, extra }, g.params);
    return Object.assign(res, { ok: true, prazoMax: R.prazoMax, mesesLimitado: inteiro(pedido) && pedido > R.prazoMax, aporteForaDoPeriodo: !!(extra && !res.extra), melhor: res.produtos[0] });
  }

  // ---------------------------------------------------------------------------
  // Consórcio × Financiamento
  // ---------------------------------------------------------------------------

  function diasNoMes(ano, mes) { return new Date(ano, mes + 1, 0).getDate(); }

  /** Soma meses a uma data, sem estourar o fim do mês (31/01 + 1 mês = 28 ou 29/02). */
  function somarMeses(d, n) {
    const alvo = new Date(d.getFullYear(), d.getMonth() + n, 1);
    alvo.setDate(Math.min(d.getDate(), diasNoMes(alvo.getFullYear(), alvo.getMonth())));
    return alvo;
  }

  /** Diferença entre datas em anos, meses e dias (a ≤ b), coerente com somarMeses. */
  function diferencaData(a, b) {
    let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
    if (somarMeses(a, m) > b) m--;
    const dias = Math.round((b - somarMeses(a, m)) / 86400000);
    return { anos: Math.floor(m / 12), meses: m % 12, dias };
  }

  function mesesEntre(a, b) {
    const d = diferencaData(a, b);
    return d.anos * 12 + d.meses;
  }

  function lerData(txt) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(txt || ''));
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const hojeSemHora = (h) => { const d = h ? new Date(h) : new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };

  /** Prestações do financiamento pela Tabela Price ou SAC. */
  function tabelaFinanciamento(pv, jurosAa, n, sistema) {
    const i = Math.pow(1 + jurosAa / 100, 1 / 12) - 1;
    if (sistema === 'sac') {
      const amort = pv / n;
      return { i, primeira: amort + pv * i, ultima: amort * (1 + i), total: pv + i * amort * n * (n + 1) / 2 };
    }
    const pmt = i > 0 ? (pv * i) / (1 - Math.pow(1 + i, -n)) : pv / n;
    return { i, primeira: pmt, ultima: pmt, total: pmt * n };
  }

  /**
   * Financiamento mês a mês. A cada mês o saldo é corrigido pela TR, os juros incidem sobre o saldo corrigido e a
   * prestação é recalculada pelo prazo restante (Price) ou amortiza saldo ÷ meses restantes (SAC). Encargos do mês:
   * MIP (% do saldo corrigido), DFI/DFC (% do valor do bem), outros seguros e taxa de administração (R$).
   */
  function cronogramaFinanciamento(pv, jurosAa, n, sistema, opcoes) {
    const o = opcoes || {};
    const i = Math.pow(1 + jurosAa / 100, 1 / 12) - 1;
    const tr = Math.pow(1 + (num(o.trAa) || 0) / 100, 1 / 12) - 1;
    const mip = (num(o.mipPct) || 0) / 100;
    const dfi = ((num(o.dfiPct) || 0) / 100) * (num(o.valorBem) || 0);
    const seguros = num(o.seguros) || 0, ta = num(o.ta) || 0;
    const meses = [];
    const tot = { prestacoes: 0, juros: 0, correcao: 0, mip: 0, dfi: 0, seguros: 0, ta: 0, total: 0 };
    let saldo = pv;
    for (let t = 1; t <= n; t++) {
      const restantes = n - t + 1;
      const corrigido = saldo * (1 + tr);
      const juros = corrigido * i;
      const amort = sistema === 'sac' ? corrigido / restantes
        : (i > 0 ? (corrigido * i) / (1 - Math.pow(1 + i, -restantes)) : corrigido / restantes) - juros;
      const l = { t, correcao: corrigido - saldo, juros, amort, prestacao: amort + juros, mip: corrigido * mip, dfi, seguros, ta };
      l.total = l.prestacao + l.mip + l.dfi + l.seguros + l.ta;
      saldo = Math.max(0, corrigido - amort);
      l.saldo = saldo;
      meses.push(l);
      tot.prestacoes += l.prestacao; tot.juros += juros; tot.correcao += l.correcao;
      tot.mip += l.mip; tot.dfi += dfi; tot.seguros += seguros; tot.ta += ta; tot.total += l.total;
    }
    return { i, tr, meses, tot };
  }

  /**
   * Comparativo com o financiamento: entrada (padrão 20%), prazo (padrão 420 meses), Price ou SAC, TR e encargos.
   * Renda mínima = 1ª parcela ÷ 30% (a parcela não pode comprometer mais de 30% da renda);
   * idade máxima na assinatura = 65 anos − prazo (a partir de hoje).
   */
  function financiamento(s, R, hoje) {
    const f = s.financiamento;
    if (!f || !f.ativo) return null;
    const out = { ok: false, pend: [], sistema: f.sistema === 'sac' ? 'sac' : 'price' };
    const credito = isNum(num(f.credito)) ? num(f.credito) : R.ok ? R.credito : null;
    const n = num(f.prazo), pct = num(f.entradaPct), juros = num(f.juros);
    if (!isNum(credito) || credito <= 0) out.pend.push('Informe o crédito necessário');
    if (!inteiro(n) || n < 1 || n > REGRAS.prazoFinanciamentoMax) out.pend.push('Prazo do financiamento entre 1 e ' + REGRAS.prazoFinanciamentoMax + ' meses');
    if (!isNum(pct) || pct < 0 || pct >= 100) out.pend.push('Entrada entre 0% e 100%');
    if (!isNum(juros) || juros < 0) out.pend.push('Informe a taxa de juros do financiamento');
    if (out.pend.length) return out;
    const entrada = credito * pct / 100;
    const financiado = credito - entrada;
    const premissas = { trAa: num(f.tr) || 0, mipPct: num(f.mip) || 0, dfiPct: num(f.dfi) || 0, seguros: num(f.seguros) || 0, ta: num(f.ta) || 0 };
    const C = cronogramaFinanciamento(financiado, juros, n, out.sistema, Object.assign({ valorBem: credito }, premissas));
    const m1 = C.meses[0], mN = C.meses[n - 1];
    const custos = { mip: C.tot.mip, dfi: C.tot.dfi, seguros: C.tot.seguros, ta: C.tot.ta };
    custos.total = custos.mip + custos.dfi + custos.seguros + custos.ta;
    Object.assign(out, {
      ok: true, credito, creditoAuto: !isNum(num(f.credito)), prazo: n, entradaPct: pct, entrada, financiado, juros,
      jurosMes: C.i * 100, trAa: premissas.trAa, premissas, meses: C.meses,
      // Prestação = amortização + juros; parcela = prestação + seguros e taxa (o que o cliente paga)
      primeiraPrestacao: m1.prestacao, ultimaPrestacao: mN.prestacao, primeira: m1.total, ultima: mN.total,
      totalPrestacoes: C.tot.prestacoes, totalJuros: C.tot.juros, totalCorrecao: C.tot.correcao, totalParcelas: C.tot.total,
      custos, custosPct: (custos.total / credito) * 100,
      totalPago: entrada + C.tot.total
    });
    out.rendaMinima = m1.total / (REGRAS.comprometimentoRenda / 100);
    // Idade: ao fim do contrato a pessoa não pode passar de 65 anos
    const d0 = hojeSemHora(hoje);
    const fim = somarMeses(d0, n);
    // Primeira data de nascimento cujo 65º aniversário não cai antes do fim do contrato
    let nascMin = somarMeses(fim, -REGRAS.idadeLimite * 12);
    while (somarMeses(nascMin, REGRAS.idadeLimite * 12) < fim) nascMin = new Date(nascMin.getFullYear(), nascMin.getMonth(), nascMin.getDate() + 1);
    out.hoje = d0;
    out.dataFim = fim;
    out.nascimentoMinimo = nascMin;
    out.idadeMaxima = diferencaData(nascMin, d0);
    // Comparação com a carta contemplada: parcelas reajustadas pelo indexador × financiamento com TR e encargos
    if (R.ok) {
      out.consorcio = { credito: R.credito, entrada: R.entrada, parcela: R.parcelaAtual, prazo: R.prazoMax, totalSemReajuste: R.totalPago };
      const Fc = fluxoMensal(s, true);
      out.comparativo = comparativo(s, Fc, out);
      if (Fc.ok) {
        out.consorcio.totalPago = R.entrada + Fc.total;
        out.diferenca = out.totalPago - out.consorcio.totalPago;
      }
    }
    return out;
  }

  /**
   * A cada 12 meses: parcela do consórcio (reajustada pelo indexador) × parcela do financiamento (TR, seguros e taxa),
   * economia de parcela, economia acumulada guardada (orgânico) ou aplicada no CDB da calculadora, e os saldos devedores.
   */
  function comparativo(s, Fc, Fi) {
    if (!Fc.ok) return { ok: false, pend: Fc.pend, linhas: [] };
    const P = Object.assign({}, PARAMS_RENDIMENTOS, (s.rendimentos && s.rendimentos.params) || {});
    ['cdi', 'ipca', 'cdbPct'].forEach((k) => { P[k] = num(P[k]) || 0; });
    const taxa = taxaTipo(P, P.cdbPct, P.cdbTipo);
    const f = fatorMensal(taxa);
    const T = Math.max(Fc.N, Fi.prazo);
    let organico = 0, aplicado = 0;
    const linhas = [];
    for (let t = 1; t <= T; t++) {
      const c = t <= Fc.N ? Fc.meses[t - 1] : null;
      const b = t <= Fi.prazo ? Fi.meses[t - 1] : null;
      const pc = c ? c.total : 0, pf = b ? b.total : 0;
      const economia = pf - pc;
      organico += economia;
      aplicado = aplicado * f + economia;
      if (t % 12 === 0 || t === T) linhas.push({ t, consorcio: pc, financiamento: pf, economia, organico, aplicado, saldoFin: b ? b.saldo : 0, saldoCons: c ? c.saldo : 0 });
    }
    return { ok: true, taxaAplicacao: taxa, T, linhas, organico, aplicado };
  }

  // ---------------------------------------------------------------------------
  // Validações
  // ---------------------------------------------------------------------------

  function validar(s) {
    const a = [];
    const add = (nivel, campo, msg) => a.push({ nivel, campo, msg });
    (s.cartas || []).forEach((c, i) => {
      const rot = 'Carta #' + (i + 1) + ': ';
      const cr = num(c.credito), en = num(c.entrada), pa = num(c.parcela), pz = num(c.prazo);
      if (!isNum(cr) || cr <= 0) add('erro', 'cartas.' + i + '.credito', rot + 'informe o crédito disponível.');
      if (!isNum(pa) || pa <= 0) add('erro', 'cartas.' + i + '.parcela', rot + 'informe a parcela atual.');
      if (!inteiro(pz) || pz < 1) add('erro', 'cartas.' + i + '.prazo', rot + 'informe o prazo restante (meses).');
      else if (pz > REGRAS.prazoCartaMax) add('erro', 'cartas.' + i + '.prazo', rot + 'prazo restante acima de ' + REGRAS.prazoCartaMax + ' meses.');
      else if (pz > 420) add('alerta', 'cartas.' + i + '.prazo', rot + 'prazo acima de 420 meses: confirme com a administradora.');
      if (isNum(en) && en < 0) add('erro', 'cartas.' + i + '.entrada', rot + 'a entrada não pode ser negativa.');
      else if (isNum(en) && isNum(cr) && en >= cr) add('alerta', 'cartas.' + i + '.entrada', rot + 'entrada maior ou igual ao crédito.');
    });
    if (!s.cartas || !s.cartas.length) add('erro', 'cartas', 'Inclua ao menos uma carta.');
    const R = resumo(s);
    const usaReajuste = (s.fluxo && s.fluxo.reajuste) || (s.evolucao && s.evolucao.ativo) || (s.amortizacao && s.amortizacao.ativo) || (s.financiamento && s.financiamento.ativo);
    if (!INDICES[s.indice]) add('erro', 'indice', 'Selecione o índice de reajuste.');
    else if (usaReajuste && !isNum(taxaIndice(s)) && (!R.ok || R.prazoMax >= mesReajuste(s))) add('erro', 'indiceTaxa', 'Índice ' + nomeIndice(s) + ' sem taxa estimada: informe a projeção ao ano para o reajuste.');
    const m1 = num(s.reajusteMes);
    if (usaReajuste && (!inteiro(m1) || m1 < 1)) add('erro', 'reajusteMes', 'Mês do 1º reajuste: informe um mês (1 ou mais).');
    const am = s.amortizacao;
    if (am && am.ativo) {
      const v = num(am.valor), m = num(am.mes);
      if (!isNum(v) || v <= 0) add('erro', 'amortizacao.valor', 'Estudo de amortização: informe o valor do aporte.');
      if (!inteiro(m) || m < 1 || (R.ok && m >= R.prazoMax)) add('erro', 'amortizacao.mes', 'Estudo de amortização: o mês do aporte deve ser anterior ao fim do prazo.');
    }
    const rd = s.rendimentos;
    if (rd && rd.ativo) {
      const ms = num(rd.meses);
      if (ms !== null && (!inteiro(ms) || ms < 1)) add('erro', 'rendimentos.meses', 'Calculadora de rendimentos: período inválido.');
      else if (ms !== null && R.ok && ms > R.prazoMax) add('alerta', 'rendimentos.meses', 'Período limitado ao maior prazo das cartas (' + R.prazoMax + ' meses).');
      const mm = num(rd.mensal);
      if (mm !== null && mm < 0) add('erro', 'rendimentos.mensal', 'Aportes mensais não podem ser negativos.');
    }
    const fi = s.financiamento;
    if (fi && fi.ativo) {
      const n = num(fi.prazo), pct = num(fi.entradaPct), j = num(fi.juros);
      if (!inteiro(n) || n < 1 || n > REGRAS.prazoFinanciamentoMax) add('erro', 'financiamento.prazo', 'Financiamento: prazo entre 1 e ' + REGRAS.prazoFinanciamentoMax + ' meses.');
      if (!isNum(pct) || pct < 0 || pct >= 100) add('erro', 'financiamento.entradaPct', 'Financiamento: entrada entre 0% e 100%.');
      if (!isNum(j) || j < 0) add('erro', 'financiamento.juros', 'Financiamento: informe a taxa de juros ao ano.');
      const c = num(fi.credito);
      if (c !== null && c <= 0) add('erro', 'financiamento.credito', 'Financiamento: crédito necessário deve ser maior que zero.');
      [['tr', 'TR'], ['mip', 'MIP'], ['dfi', 'DFI/DFC'], ['seguros', 'outros seguros'], ['ta', 'taxa de administração']].forEach(([k, rot]) => {
        const x = num(fi[k]);
        if (x !== null && x < 0) add('erro', 'financiamento.' + k, 'Financiamento: ' + rot + ' não pode ser negativo.');
      });
    }
    return a;
  }

  // ---------------------------------------------------------------------------
  // Função principal
  // ---------------------------------------------------------------------------

  function simular(s, opcoes) {
    const o = opcoes || {};
    const R = resumo(s);
    const A = amortizacao(s);
    return {
      validacoes: validar(s),
      resumo: R,
      indice: { nome: nomeIndice(s), taxa: taxaIndice(s), estimado: indiceEstimado(s), m1: mesReajuste(s) },
      segmento: (SEGMENTOS[s.segmento] || SEGMENTOS.imovel).nome,
      fluxo: fluxo(s),
      evolucao: evolucao(s),
      amortizacao: A,
      rendimentos: rendimentos(s, R, A),
      financiamento: financiamento(s, R, o.hoje)
    };
  }

  return {
    INDICES, SEGMENTOS, REGRAS, PARAMS_RENDIMENTOS, PRODUTOS,
    estadoPadrao, cartaVazia, simular, resumo, fluxo, fluxoMensal, agrupar, rotuloPeriodo, evolucao, amortizacao,
    calcularRendimentos, rendimentos, aliquotaIR, financiamento, tabelaFinanciamento, cronogramaFinanciamento, comparativo, validar,
    taxaIndice, nomeIndice, indiceEstimado, qtdReajustes, somarMeses, diferencaData, mesesEntre, lerData,
    fmtBRL, fmtPct, fmtNum, num, isNum
  };
});

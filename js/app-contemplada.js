/* Página 2 do simulador: Carta Contemplada.
 * Desenha a proposta da carta contemplada (resumo, características, fluxo de parcelas e as guias
 * opcionais), os blocos das cartas no menu, os textos para o WhatsApp e a proposta em PDF.
 * É criada pelo app.js (window.TelaContemplada(ui)), que fornece os utilitários compartilhados. */
(function () {
  'use strict';

  window.TelaContemplada = function (ui) {
    const CC = window.CalcCont;
    const esc = ui.esc;
    const isNum = CC.isNum;
    const brl = (x) => (isNum(x) ? CC.fmtBRL(Math.abs(x) < 0.005 ? 0 : x) : '—'); // sem "-R$ 0,00" por resíduo de arredondamento
    const pct = (x, d) => (isNum(x) ? CC.fmtPct(x, d == null ? 2 : d) : '—');
    const nc = '<span class="nc">Não calculado</span>';
    const v = (x) => (isNum(x) ? CC.fmtBRL(x) : nc);
    const meses = (n) => n + (n === 1 ? ' mês' : ' meses');
    const MSG_CARTAS = 'Não calculado: preencha crédito, parcela e prazo de todas as cartas no menu.';

    // Ícones de traço no estilo Lucide (grade 24×24, traço 1,7)
    const ICONES = {
      carta: '<circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/>',
      banco: '<path d="M3 21h18"/><path d="M6 17.5v-7"/><path d="M10 17.5v-7"/><path d="M14 17.5v-7"/><path d="M18 17.5v-7"/><path d="M12 3 20 7.5H4z"/>',
      seta: '<path d="m6 9 6 6 6-6"/>',
      copiar: '<rect x="8" y="8" width="13" height="13" rx="2.5"/><path d="M16 8V5.5A2.5 2.5 0 0 0 13.5 3h-8A2.5 2.5 0 0 0 3 5.5v8A2.5 2.5 0 0 0 5.5 16H8"/>'
    };
    const icone = (k, cls) => '<svg class="' + (cls || 'icone') + '" viewBox="0 0 24 24" aria-hidden="true">' + ICONES[k] + '</svg>';

    const AVISO = 'Esta simulação usa os valores informados das cartas e as premissas inseridas. Os valores são estimativas e não constituem valores contratuais. ' +
      'O CET é aproximado (linear, sem capitalização) e não inclui o reajuste do indexador, exibido à parte. Reajustes, rendimentos e as condições do financiamento ' +
      '(juros, TR, seguros e taxas) são premissas que variam com o mercado e o banco, sem garantia.';

    // Tabelas que o consultor recolheu na tela (a seta mostra ou oculta; o PDF traz todas)
    let recolhidos = new Set();

    // -------------------------------------------------------------------------
    // Textos de apoio
    // -------------------------------------------------------------------------

    function textoIndice(rc) {
      return rc.indice.nome + (rc.indice.estimado && isNum(rc.indice.taxa) ? ' (' + pct(rc.indice.taxa) + ' a.a.)' : '');
    }
    function textoReajuste(rc, m1) {
      return 'reajuste anual pelo ' + textoIndice(rc) + ' a partir do mês ' + (m1 || rc.indice.m1);
    }
    function identificacao(rc, s) {
      return ['Carta Contemplada · ' + rc.segmento, s.administradora].filter(Boolean).map(esc).join(' · ');
    }

    // -------------------------------------------------------------------------
    // Menu: blocos das cartas
    // -------------------------------------------------------------------------

    function htmlCartas(s) {
      const n = s.cartas.length;
      const campo = (i, k, rot, req, moeda) => '<label class="f"><span>' + rot + (req ? ' <em class="req">*</em>' : '') + '</span>' +
        (moeda
          ? '<input type="text" data-k="cont.cartas.' + i + '.' + k + '" data-moeda inputmode="numeric" placeholder="R$ 0,00" autocomplete="off">'
          : '<input type="number" data-k="cont.cartas.' + i + '.' + k + '" min="1" step="1" placeholder="meses">') + '</label>';
      return s.cartas.map((c, i) => '<div class="bloco bloco-carta"><div class="carta-topo"><span class="titulo-fid">Carta #' + (i + 1) + '</span>' +
        (n > 1 ? '<button type="button" class="mini-x" data-remover-carta="' + i + '" aria-label="Remover carta #' + (i + 1) + '">Remover</button>' : '') + '</div>' +
        '<div class="grid2">' + campo(i, 'credito', 'Crédito disponível', true, true) + campo(i, 'entrada', 'Entrada / ágio pago', false, true) +
        campo(i, 'parcela', 'Parcela atual', true, true) + campo(i, 'prazo', 'Prazo restante', true, false) + '</div></div>').join('');
    }

    // -------------------------------------------------------------------------
    // Proposta na tela
    // -------------------------------------------------------------------------

    function cabecalho(rc, s, lead) {
      return '<header class="topo"><div class="topo-texto"><div class="topo-logo">' + ui.logoPar('') + '</div>' +
        '<h1 class="titulo-proposta">Proposta de <span class="acento">Carta Contemplada</span></h1>' +
        '<p class="cliente">' + (lead ? esc(lead) : '<span class="mudo">Nome do cliente</span>') + '</p>' +
        '<p class="sub-topo">' + identificacao(rc, s) + '</p></div></header>';
    }

    function secResumo(rc) {
      const R = rc.resumo;
      const kpi = (rot, val, cls, suf, extra) => '<div class="kpi' + (cls ? ' ' + cls : '') + '"><div class="kpi-rot">' + rot + '</div>' +
        '<div class="kpi-val">' + (val == null ? '<span class="mudo">—</span>' : val + (suf ? '<small class="kpi-suf"> ' + suf + '</small>' : '')) + '</div>' +
        (extra ? '<div class="kpi-extra">' + extra + '</div>' : '') + '</div>';
      const ok = R.ok;
      return '<section class="bloco-res vitrine">' + ui.tituloSecao('Resumo da', 'Proposta', 'Visão geral') + '<div class="kpis kpis-cont">' +
        kpi('Crédito contrato', ok ? brl(R.credito) : null, 'kpi-destaque') +
        kpi('Parcela atual', ok ? brl(R.parcelaAtual) : null, 'kpi-destaque') +
        kpi('CET mensal', ok && isNum(R.cetMes) ? pct(R.cetMes) : null, '', 'a.m.') +
        kpi('CET anual', ok && isNum(R.cetAno) ? pct(R.cetAno) : null, 'kpi-cet', 'a.a.&nbsp;+&nbsp;' + esc(rc.indice.nome)) +
        '</div>' + (ok ? '' : '<p class="nc kpis-msg">' + MSG_CARTAS + '</p>') + '</section>';
    }

    function listaCaracteristicas(R) {
      return [
        ['Crédito total', brl(R.credito)],
        ['Crédito líquido', brl(R.creditoLiquido)],
        ['Entrada (ágio)', brl(R.entrada) + (isNum(R.entradaPct) ? ' (' + pct(R.entradaPct) + ')' : '')],
        ['Custo da operação (saldo devedor + ágio)', brl(R.custo)],
        ['Custo total da operação (%)', isNum(R.custoPct) ? pct(R.custoPct) : 'N/A'],
        ['Saldo devedor (R$)', brl(R.saldoDevedor)]
      ];
    }

    function tabelaCartas(R, pdf) {
      const linhas = R.cartas.map((c) => '<tr><td>Carta #' + (c.i + 1) + '</td><td>' + brl(c.credito) + '</td><td>' + brl(c.entrada) + '</td><td>' + brl(c.parcela) + '</td><td>' + c.prazo + '</td><td>' + brl(c.saldo) + '</td></tr>').join('');
      const tot = '<tr><td>Total</td><td>' + brl(R.credito) + '</td><td>' + brl(R.entrada) + '</td><td>' + brl(R.parcelaAtual) + '</td><td>até ' + R.prazoMax + '</td><td>' + brl(R.saldoDevedor) + '</td></tr>';
      return '<table class="' + (pdf ? 'pdf-tab pdf-tab-dir' : 'tab-alav tab-dir') + '"><thead><tr><th>Carta</th><th>Crédito</th><th>Entrada</th><th>Parcela</th><th>Prazo</th><th>Saldo devedor</th></tr></thead><tbody>' + linhas + '</tbody><tfoot>' + tot + '</tfoot></table>';
    }

    function secCaracteristicas(rc) {
      const R = rc.resumo;
      let h = '<section class="bloco-res vitrine">' + ui.tituloSecao('Características da', 'Proposta', 'Condições');
      if (!R.ok) return h + '<p class="nc">' + MSG_CARTAS + '</p></section>';
      h += '<dl class="lista-info">' + listaCaracteristicas(R).map(([k, x]) => '<div><dt>' + k + '</dt><dd>' + x + '</dd></div>').join('') + '</dl>';
      if (R.cartas.length > 1) h += '<h3 class="sub-titulo">Composição da junção</h3><div class="rolagem-x">' + tabelaCartas(R, false) + '</div>';
      return h + '</section>';
    }

    function subFluxo(rc) {
      const F = rc.fluxo;
      return F.comReajuste
        ? 'Valor mensal projetado em cada período, somando todas as cartas, com ' + textoReajuste(rc, F.m1) + '.'
        : 'Valor mensal em cada período, somando as parcelas de todas as cartas.';
    }

    /** Seta para mostrar ou ocultar uma tabela na tela. */
    function seta(id, rotulo) {
      const aberto = !recolhidos.has(id);
      return '<button type="button" class="seta-tabela" data-recolher="' + id + '" aria-expanded="' + aberto + '" aria-label="' + (aberto ? 'Ocultar ' : 'Mostrar ') + esc(rotulo) + '" title="' + (aberto ? 'Ocultar' : 'Mostrar') + '">' + icone('seta', 'ic') + '</button>';
    }

    /** Tabela com título e seta; recolhida, mostra só o título. */
    function recolhivel(id, titulo, conteudo) {
      return '<div class="tabela-topo"><h3 class="sub-titulo">' + titulo + '</h3>' + seta(id, titulo) + '</div>' + (recolhidos.has(id) ? '' : conteudo);
    }

    function linhasFluxo(F) {
      return F.grupos.map((g) => [CC.rotuloPeriodo(g), g.qtd + 'x', brl(g.valor), brl(g.subtotal)]);
    }

    function botaoCopiar(id, rot) {
      return '<button type="button" class="mini botao-sec" data-copiar="' + id + '" title="Copiar para o WhatsApp">' + icone('copiar', 'ic') + esc(rot) + '</button>';
    }

    function tabela(cab, linhas, opcoes) {
      const o = opcoes || {};
      return '<div class="rolagem-x"><table class="tab-alav tab-dir' + (o.cls ? ' ' + o.cls : '') + '"><thead><tr>' + cab.map((c) => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>' +
        linhas.map((l) => '<tr' + (l.cls ? ' class="' + l.cls + '"' : '') + '>' + (l.cel || l).map((c) => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody>' +
        (o.rodape ? '<tfoot><tr>' + o.rodape.map((c) => '<td>' + c + '</td>').join('') + '</tr></tfoot>' : '') + '</table></div>';
    }

    function secFluxo(rc) {
      const F = rc.fluxo;
      let h = '<section class="bloco-res vitrine">' + (F.ok ? botaoCopiar('fluxo', 'Copiar') : '') +
        ui.tituloSecao('Fluxo de', 'Parcelas', F.comReajuste ? 'Parcelas projetadas' : 'Parcelas a pagar');
      if (!F.ok) return h + '<p class="nc">Não calculado: ' + esc(F.pend.join('; ')) + '.</p></section>';
      h += '<p class="g-sub">' + esc(subFluxo(rc)) + '</p>';
      h += recolhivel('fluxo', 'Parcelas por período', tabela(['Período', 'Parcelas', 'Valor da parcela', 'Subtotal'], linhasFluxo(F), { rodape: ['Total em parcelas', F.N + 'x', '', brl(F.total)] }));
      return h + '</section>';
    }

    function destaques(itens) {
      return '<div class="mec-capital destaques">' + itens.map(([rot, val, nota, cls]) => '<div' + (cls ? ' class="' + cls + '"' : '') + '><span>' + rot + '</span><b>' + val + '</b>' + (nota ? '<small>' + nota + '</small>' : '') + '</div>').join('') + '</div>';
    }

    function itensAmortizacao(A) {
      return [
        ['Saldo devedor após o aporte · mês ' + A.mes, brl(A.saldoDepois), 'Antes do aporte: ' + brl(A.saldoAntes)],
        ['Parcela a partir do mês ' + (A.mes + 1), brl(A.parcelaDepois), 'Sem o aporte: ' + brl(A.parcelaAntes) + ' (−' + pct(A.reducaoParcelaPct, 1) + ')'],
        ['Reajustes evitados', brl(A.economia), 'Total pago com o aporte: ' + brl(A.totalCom) + ' · sem: ' + brl(A.totalSem)]
      ];
    }

    function linhasAmortizacao(A) {
      return A.linhas.map((l) => ({
        cls: l.aporte ? 'linha-aporte' : '',
        cel: [l.t + (l.aporte ? ' <small class="tag">aporte ' + brl(A.aporte) + '</small>' : ''), brl(l.parcelaSem), brl(l.parcela), brl(l.saldo)]
      }));
    }

    function secAmortizacao(rc) {
      const A = rc.amortizacao;
      let h = '<section class="bloco-res vitrine">' + ui.tituloSecao('Estudo de', 'Amortização', 'Aporte extraordinário');
      if (!A.ok) return h + '<p class="nc">Não calculado: ' + esc(A.pend.join('; ')) + '.</p></section>';
      h += '<p class="g-sub">' + subAmortizacao(rc, A) + '</p>';
      if (A.limitado) h += '<p class="aviso">O aporte informado (' + brl(A.valor) + ') é maior que o saldo devedor do mês ' + A.mes + ' e foi limitado a ' + brl(A.aporte) + ': a junção fica quitada.</p>';
      h += destaques(itensAmortizacao(A));
      h += recolhivel('amortizacao', 'Parcelas a cada 12 meses', tabela(['Mês', 'Parcela sem aporte', 'Parcela com aporte', 'Saldo devedor'], linhasAmortizacao(A)));
      const Rd = rc.rendimentos;
      if (Rd && Rd.ok && Rd.extra) h += '<p class="aviso-inline">Na Calculadora de Rendimentos, o mesmo valor aparece aplicado a partir do mês ' + A.mes + ': amortizar ou investir.</p>';
      else if (Rd && Rd.aporteForaDoPeriodo) h += '<p class="aviso-inline">O mês do aporte fica depois do período da Calculadora de Rendimentos, que não o considera.</p>';
      return h + '</section>';
    }

    function subAmortizacao(rc, A) {
      if (A.saldoDepois < 0.005) return 'Com um aporte de ' + brl(A.aporte) + ' no mês ' + A.mes + ' (bônus, causa trabalhista ou outra fonte), o saldo devedor é quitado: não há mais parcelas a pagar a partir do mês ' + (A.mes + 1) + '.';
      return 'Com um aporte de ' + brl(A.aporte) + ' no mês ' + A.mes + ' (bônus, causa trabalhista ou outra fonte), o saldo devedor cai e a parcela diminui, mantendo o prazo. ' +
        'Os reajustes anuais pelo ' + esc(textoIndice(rc)) + ' continuam valendo.';
    }

    function linhasEvolucao(E) {
      return E.linhas.map((l) => [String(l.t), brl(l.parcela), brl(l.pago), brl(l.saldo)]);
    }

    function secEvolucao(rc) {
      const E = rc.evolucao;
      let h = '<section class="bloco-res vitrine">' + ui.tituloSecao('Evolução das', 'Parcelas', 'Projeção a cada 12 meses');
      if (!E.ok) return h + '<p class="nc">Não calculado: ' + esc(E.pend.join('; ')) + '.</p></section>';
      h += '<p class="g-sub">' + subEvolucao(rc, E) + '</p>';
      h += recolhivel('evolucao', 'Parcelas a cada 12 meses', tabela(['Mês', 'Parcela', 'Aporte acumulado', 'Saldo devedor'], linhasEvolucao(E)));
      h += '<p class="aviso-inline">Saldo devedor: parcela vigente × parcelas restantes. Entrada (ágio) paga à parte: ' + brl(rc.resumo.entrada) + '.</p>';
      return h + '</section>';
    }

    function subEvolucao(rc, E) {
      return 'Ano a ano até a última parcela: o valor da parcela com ' + esc(textoReajuste(rc, E.m1)) + ', quanto já foi pago em parcelas e o saldo devedor restante.';
    }

    // Calculadora de rendimentos ------------------------------------------------

    function infosRendimentos(Rd) {
      const itens = [
        ['Valor inicial investido', brl(Rd.inicial), 'Crédito − entrada'],
        ['Aportes mensais', brl(Rd.mensal), Rd.mensal > 0 ? meses(Rd.meses) : 'Sem aportes mensais'],
        ['Período da aplicação', meses(Rd.meses), Rd.meses >= Rd.prazoMax ? 'Prazo máximo da junção' : 'Máximo: ' + meses(Rd.prazoMax)]
      ];
      if (Rd.extra) itens.push(['Aporte da amortização', brl(Rd.extra.valor), 'Aplicado no mês ' + Rd.extra.mes]);
      itens.push(['Soma dos valores investidos', brl(Rd.investido), '', 'realce']);
      return itens;
    }

    function barras(Rd, pdf) {
      const lista = Rd.produtos.map((p) => ({ nome: p.nome, valor: p.liquido })).concat([{ nome: 'Correção pelo IPCA', valor: Rd.correcaoIpca, ref: true }]);
      const max = Math.max(...lista.map((x) => x.valor), 1);
      return '<div class="' + (pdf ? 'pdf-barras' : 'barras') + '" role="list" aria-label="Valor líquido de resgate">' + lista.map((x) =>
        '<div class="barra-linha' + (x.ref ? ' ref' : '') + '" role="listitem" title="' + esc(x.nome + ': ' + brl(x.valor)) + '">' +
        '<span class="barra-rot">' + esc(x.nome) + (x.ref ? ' <small>referência</small>' : '') + '</span>' +
        '<span class="barra-trilho"><span class="barra-fill" style="width:' + Math.max(0.5, (x.valor / max) * 100).toFixed(2) + '%"></span></span>' +
        '<b class="barra-num">' + brl(x.valor) + '</b></div>').join('') + '</div>';
    }

    function tabelaRendimentos(Rd, pdf) {
      const ps = Rd.produtos;
      const cor = (x) => (x >= 0 ? 'positivo' : 'negativo');
      const linhas = [
        ['Valor bruto acumulado', (p) => brl(p.bruto)],
        ['Rentabilidade bruta', (p) => pct(p.rentBruta)],
        ['Custos', (p) => brl(p.custos)],
        ['Valor pago em IR', (p) => brl(p.ir)],
        ['Valor líquido acumulado', (p) => '<b>' + brl(p.liquido) + '</b>'],
        ['Rentabilidade líquida', (p) => pct(p.rentLiquida)],
        ['Ganho líquido', (p) => '<span class="' + cor(p.ganho) + '">' + brl(p.ganho) + '</span>']
      ];
      return '<table class="' + (pdf ? 'pdf-tab pdf-tab-dir pdf-tab-rend' : 'tab-alav tab-dir tab-rend') + '"><thead><tr><th></th>' +
        ps.map((p, i) => '<th' + (i === 0 ? ' class="melhor"' : '') + '>' + esc(p.nome) + '</th>').join('') + '</tr></thead><tbody>' +
        linhas.map(([rot, f]) => '<tr><td>' + rot + '</td>' + ps.map((p, i) => '<td' + (i === 0 ? ' class="melhor"' : '') + '>' + f(p) + '</td>').join('') + '</tr>').join('') +
        '</tbody></table>';
    }

    function itensComparativoRend(rc) {
      const Rd = rc.rendimentos, R = rc.resumo, M = Rd.melhor;
      const itens = [
        ['Custo da operação da carta', brl(R.custo), 'Saldo devedor + ágio de entrada'],
        ['Ganho líquido · ' + esc(M.nome), brl(M.ganho), 'Melhor opção no período de ' + meses(Rd.meses)]
      ];
      if (M.extra) itens.push(['Aporte investido · ' + esc(M.nome), brl(M.extra.liquido), 'Ganho de ' + brl(M.extra.ganho) + ' em ' + meses(M.extra.meses) + ', a partir do mês ' + Rd.extra.mes]);
      return itens;
    }

    const periodoAplicacao = (Rd) => (Rd.meses >= Rd.prazoMax ? 'pelo prazo da junção (' + meses(Rd.meses) + ')' : 'por ' + meses(Rd.meses));

    function subRendimentos(Rd) {
      const somas = [];
      if (Rd.mensal > 0) somas.push(brl(Rd.mensal) + ' por mês');
      if (Rd.extra) somas.push('o aporte de ' + brl(Rd.extra.valor) + ' no mês ' + Rd.extra.mes);
      return 'Quanto o crédito líquido de ' + brl(Rd.inicial) + ' (crédito menos a entrada)' + (somas.length ? ', mais ' + somas.join(' e ') + ',' : '') +
        ' renderia se fosse investido ' + periodoAplicacao(Rd) + '.';
    }

    function notaRendimentos(ctx) {
      const p = ctx.params;
      return 'Premissas: Selic ' + pct(p.selic) + ' a.a., CDI ' + pct(p.cdi) + ' a.a., IPCA ' + pct(p.ipca) + ' a.a. e poupança ' + pct(p.poupanca) + ' a.m.' +
        (ctx.fonteTaxas ? ' (' + ctx.fonteTaxas + ')' : '') + ', constantes no período. Custódia de ' + pct(p.custodia) + ' a.a. no Tesouro e taxa de administração no Fundo DI. ' +
        'IR regressivo: 22,5% até 6 meses, 20% até 11, 17,5% até 23 e 15% a partir de 24 meses (LCI/LCA e poupança isentas).';
    }

    function secRendimentos(rc, s, ctx) {
      const Rd = rc.rendimentos;
      let h = '<section class="bloco-res vitrine">' + ui.tituloSecao('Calculadora de', 'Rendimentos', 'Cenário de investimento');
      if (!Rd.ok) return h + '<p class="nc">Não calculado: ' + esc(Rd.pend.join('; ')) + '.</p></section>';
      h += '<p class="g-sub">' + subRendimentos(Rd) + '</p>';
      if (Rd.aporteForaDoPeriodo) h += '<p class="aviso">O aporte da amortização (mês ' + rc.amortizacao.mes + ') fica fora do período da aplicação e não foi considerado.</p>';
      h += destaques(infosRendimentos(Rd));
      h += '<h3 class="sub-titulo">Valor líquido de resgate</h3>' + barras(Rd, false);
      h += '<h3 class="sub-titulo">Simulação do investimento</h3><div class="rolagem-x">' + tabelaRendimentos(Rd, false) + '</div>';
      h += '<h3 class="sub-titulo">Em relação à carta</h3>' + destaques(itensComparativoRend(rc));
      h += '<p class="aviso-inline">' + esc(notaRendimentos({ params: Object.assign({}, CC.PARAMS_RENDIMENTOS, s.rendimentos.params), fonteTaxas: ctx.fonteTaxas })) + '</p>';
      return h + '</section>';
    }

    // Consórcio × financiamento --------------------------------------------------

    const textoIdade = (d) => d.anos + ' anos, ' + d.meses + (d.meses === 1 ? ' mês' : ' meses') + ' e ' + d.dias + (d.dias === 1 ? ' dia' : ' dias');
    const data = (d) => d.toLocaleDateString('pt-BR');
    const nomeSistema = (Fi) => (Fi.sistema === 'sac' ? 'Tabela SAC' : 'Tabela Price');
    const pctFin = (x) => CC.fmtNum(x, Number.isInteger(x) ? 0 : 2) + '%';
    const nomeTr = (Fi) => 'TR ' + pct(Fi.trAa) + ' a.a.';

    /** "a + b = total a.a.", quebrando a linha só antes do "= total". */
    const formula = (partes, total) => partes.map((x) => pct(x)).join('&nbsp;+&nbsp;') + ' <span class="sem-quebra">=&nbsp;' + pct(total) + '&nbsp;a.a.</span>';

    /**
     * Cartões lado a lado: as mesmas linhas, na mesma ordem, nos dois caminhos.
     * Cada linha: [rótulo, valor, classe, nota].
     */
    function linhasConsorcio(Fi, rc) {
      const K = Fi.consorcio, nome = esc(rc.indice.nome);
      const custo = isNum(K.cetAno) ? (isNum(K.indiceTaxa) ? formula([K.cetAno, K.indiceTaxa], K.custoAa) : pct(K.cetAno) + '&nbsp;+&nbsp;' + nome + '&nbsp;a.a.') : '—';
      const reaj = K.semReajuste ? 'sem reajuste do ' + nome + ' no prazo' : null;
      return [
        ['Crédito contratado', brl(K.credito), 'forte'],
        ['Entrada', brl(K.entrada), '', 'ágio pago na compra da carta'],
        ['Crédito líquido', brl(K.creditoLiquido), '', 'crédito − entrada'],
        ['1ª parcela', brl(isNum(K.primeira) ? K.primeira : K.parcela), 'acento-valor', isNum(K.primeira) && Math.abs(K.primeira - K.parcela) >= 0.005 ? 'parcela atual com o 1º reajuste' : 'parcela atual da carta'],
        ['Última parcela', brl(K.ultima), '', 'mês ' + K.prazo + ', ' + (reaj || 'com reajuste ' + nome)],
        ['Prazo', meses(K.prazo)],
        ['CET + ' + nome, custo, '', reaj ? 'nenhum reajuste do ' + nome + ' cai dentro do prazo' : 'CET da carta + reajuste estimado do ' + nome],
        ['Total pago (entrada + parcelas)', brl(K.totalPago), 'realce', reaj || 'com os reajustes do ' + nome]
      ];
    }

    function linhasFinanciamento(Fi) {
      const custo = isNum(Fi.custoAa) ? formula([Fi.juros, Fi.trAa, Fi.cesh], Fi.custoAa) : '—';
      return [
        ['Crédito contratado', brl(Fi.credito), 'forte'],
        ['Entrada', brl(Fi.entrada), '', pctFin(Fi.entradaPct) + ' do valor do imóvel'],
        ['Crédito financiado', brl(Fi.financiado), '', 'crédito − entrada'],
        ['1ª parcela', brl(Fi.primeira), 'acento-valor', 'prestação ' + brl(Fi.primeiraPrestacao) + ' + Seguro/FGHab ' + brl(Fi.primeiraSeguro) + (Fi.primeiraOutros > 0.005 ? ' + taxas ' + brl(Fi.primeiraOutros) : '')],
        ['Última parcela', brl(Fi.ultima), '', 'mês ' + Fi.prazo + ', corrigida pela TR'],
        ['Prazo', meses(Fi.prazo)],
        ['Juros + TR + CESH', custo, '', 'CESH: custo efetivo dos seguros obrigatórios'],
        ['Total pago (entrada + parcelas)', brl(Fi.totalPago), 'realce', 'com TR, seguros e taxas']
      ];
    }

    /** O veredito só compara totais quando o crédito do financiamento é o mesmo da carta. */
    const mesmoCredito = (Fi) => !!Fi.consorcio && Math.abs(Fi.credito - Fi.consorcio.credito) < 0.005;

    function subFinanciamento(Fi, rc) {
      const banco = 'no financiamento (' + nomeSistema(Fi) + '), juros de ' + pct(Fi.juros) + ' a.a. mais ' + nomeTr(Fi) + ', seguros e taxa do banco';
      if (!Fi.consorcio) return 'Financiamento bancário: ' + banco + '.';
      if (!mesmoCredito(Fi)) return 'Crédito do financiamento (' + brl(Fi.credito) + ') diferente do crédito da carta (' + brl(Fi.consorcio.credito) + '): os totais pagos não são diretamente comparáveis.';
      return 'O mesmo crédito de ' + brl(Fi.credito) + ' nos dois caminhos: no consórcio, parcelas com reajuste pelo ' + esc(textoIndice(rc)) + '; ' + banco + '.';
    }

    function avisosFinanciamento(Fi) {
      return [
        { cls: 'info', html: '<b>Renda mínima a comprovar:</b> ' + brl(Fi.rendaMinima) + ' por mês, para que a 1ª parcela de ' + brl(Fi.primeira) + ' não passe de ' + CC.REGRAS.comprometimentoRenda + '% da renda.' },
        { cls: 'info', html: '<b>Idade máxima na assinatura:</b> ' + textoIdade(Fi.idadeMaxima) + ' (nascidos a partir de ' + data(Fi.nascimentoMinimo) + '), para não passar de ' + CC.REGRAS.idadeLimite + ' anos ao fim de ' + Fi.prazo + ' meses, contando de hoje (' + data(Fi.hoje) + ').' }
      ];
    }

    const CAB_COMPARATIVO = (rc, Fi) => ['Mês', 'Parcela consórcio (reajuste ' + esc(rc.indice.nome) + ')', 'Parcela financiamento (reajuste TR)', 'Economia de parcela',
      'Acumulado orgânico', 'Acumulado aplicado', 'Saldo devedor financiamento', 'Saldo devedor consórcio'];

    function linhasComparativo(K) {
      const cor = (x) => '<span class="' + (x >= -0.005 ? 'positivo' : 'negativo') + '">' + brl(x) + '</span>';
      return K.linhas.map((l) => [String(l.t), brl(l.consorcio), brl(l.financiamento), cor(l.economia), cor(l.organico), cor(l.aplicado), brl(l.saldoFin), brl(l.saldoCons)]);
    }

    function subComparativo(K) {
      return 'Economia de parcela: quanto a parcela do consórcio fica abaixo da do financiamento. Acumulado orgânico: essa economia guardada mês a mês. ' +
        'Acumulado aplicado: a mesma economia investida no CDB a ' + pct(K.taxaAplicacao) + ' a.a. (bruto).';
    }

    function linhasCustos(Fi) {
      const m = Fi.meses[0];
      const rot = (r) => r.map(([nome, m1, total]) => [nome, brl(m1), brl(total), pct((total / Fi.credito) * 100)]);
      return rot([
        ['Seguro de vida (MIP: morte e invalidez)', m.mip, Fi.custos.mip],
        ['Seguro proteção do imóvel (DFI: danos físicos)', m.dfi, Fi.custos.dfi],
        ['Outros seguros', m.seguros, Fi.custos.seguros],
        ['Taxa de administração (TA)', m.ta, Fi.custos.ta]
      ]);
    }
    const rodapeCustos = (Fi) => ['Total', brl(Fi.meses[0].mip + Fi.meses[0].dfi + Fi.meses[0].seguros + Fi.meses[0].ta), brl(Fi.custos.total), pct(Fi.custosPct)];
    const subCustos = (Fi) => 'Encargos que o banco cobra além dos juros, somados nos ' + Fi.prazo + ' meses: ' + brl(Fi.custos.total) + ', ou ' + pct(Fi.custosPct) + ' do crédito de ' + brl(Fi.credito) + '. ' +
      'Só os dois seguros obrigatórios (Seguro/FGHab) somam ' + pct(Fi.cesh) + ' ao ano ao custo do financiamento (CESH).';

    function linhaForma(rot, val, cls, nota) {
      return '<div class="forma-linha' + (cls ? ' ' + cls : '') + '"><span>' + rot + (nota ? '<small class="forma-linha-nota">' + nota + '</small>' : '') + '</span><b>' + val + '</b></div>';
    }

    function secFinanciamento(rc) {
      const Fi = rc.financiamento;
      let h = '<section class="bloco-res vitrine">' + ui.tituloSecao('Consórcio vs', 'Financiamento', 'Comparativo');
      if (!Fi.ok) return h + '<p class="nc">Não calculado: ' + esc(Fi.pend.join('; ')) + '.</p></section>';
      h += '<p class="g-sub">' + subFinanciamento(Fi, rc) + '</p>';
      // Lado a lado: as linhas dos dois cartões ficam alinhadas (mesma grade)
      h += '<div class="formas' + (Fi.consorcio ? ' lado' : '') + '">';
      if (Fi.consorcio) h += '<article class="forma"><header class="forma-topo"><span class="forma-icone">' + icone('carta') + '</span><h3>Carta contemplada<small class="forma-sub">' + esc(rc.segmento) + '</small></h3></header>' + linhasConsorcio(Fi, rc).map((l) => linhaForma(...l)).join('') + '</article>';
      h += '<article class="forma"><header class="forma-topo"><span class="forma-icone">' + icone('banco') + '</span><h3>Financiamento<small class="forma-sub">' + nomeSistema(Fi) + '</small></h3></header>' + linhasFinanciamento(Fi).map((l) => linhaForma(...l)).join('') + '</article>';
      h += '</div><p class="forma-nota">Custo anual pela soma simples das taxas ao ano, para comparar os dois caminhos. Seguro/FGHab: seguro de vida sobre o saldo devedor e seguro proteção do imóvel sobre o valor do imóvel, como a Caixa cobra.</p>';
      if (isNum(Fi.diferenca) && mesmoCredito(Fi)) {
        const favor = Fi.diferenca >= 0;
        h += '<div class="cet comparativo"><span>Diferença no total pago</span><b class="' + (favor ? 'positivo' : 'negativo') + '">' + brl(Math.abs(Fi.diferenca)) + '</b><small>a favor do ' + (favor ? 'consórcio' : 'financiamento') + ', com os reajustes de cada um</small></div>';
      }
      const K = Fi.comparativo;
      if (K) {
        h += K.ok
          ? recolhivel('comparativo', 'Consórcio × financiamento a cada 12 meses', '<p class="g-sub">' + subComparativo(K) + '</p>' + tabela(CAB_COMPARATIVO(rc, Fi), linhasComparativo(K), { cls: 'tab-comp' }))
          : '<h3 class="sub-titulo">Consórcio × financiamento a cada 12 meses</h3><p class="nc">Não calculado: ' + esc(K.pend.join('; ')) + '.</p>';
      }
      h += recolhivel('custos', 'Custos invisíveis do financiamento', '<p class="g-sub">' + subCustos(Fi) + '</p>' + tabela(['Custo', '1º mês', 'Total no contrato', '% do crédito'], linhasCustos(Fi), { rodape: rodapeCustos(Fi) }));
      h += '<div class="avisos-fin">' + avisosFinanciamento(Fi).map((x) => '<p class="aviso-fin ' + x.cls + '">' + x.html + '</p>').join('') + '</div>';
      return h + '</section>';
    }

    // -------------------------------------------------------------------------
    // Gráficos: só na tela (não entram no PDF), com as premissas do Consórcio vs Financiamento
    // -------------------------------------------------------------------------

    function pendGraficos(rc) {
      const Fi = rc.financiamento;
      if (!Fi) return ['habilite os gráficos no menu'];
      if (!rc.resumo.ok) return [MSG_CARTAS.replace(/^Não calculado: /, '').replace(/\.$/, '')];
      if (!Fi.ok) return Fi.pend;
      return Fi.comparativo && Fi.comparativo.ok ? null : (Fi.comparativo ? Fi.comparativo.pend : ['complete os dados do financiamento']);
    }

    function textoEquilibrioParcela(E, nome) {
      // Na junção, o fim de uma carta derruba a parcela do consórcio de uma vez: isso é contado à parte, não como equilíbrio
      const S = E.salto;
      const salto = S ? 'No mês ' + S.t + ', com o fim de uma das cartas, a parcela do consórcio cai para ' + brl(S.consorcio) + ', ' +
        (S.consorcio < S.financiamento ? 'abaixo' : 'acima') + ' da do financiamento (' + brl(S.financiamento) + ').' : '';
      if (E.t && E.inicio === 'consorcio') return (salto ? salto + ' ' : '') + '<b>Mês ' + E.t + ':</b> a parcela do consórcio (' + brl(E.consorcio) + '), com o reajuste do ' + esc(nome) + ', alcança a do financiamento (' + brl(E.financiamento) + '). Até lá, o cliente paga menos todo mês.';
      if (E.t && E.inicio === 'financiamento') return (salto ? salto + ' ' : '') + '<b>Mês ' + E.t + ':</b> a parcela do financiamento (' + brl(E.financiamento) + ') alcança a do consórcio (' + brl(E.consorcio) + '). A partir daí, o consórcio passa a ter a parcela menor.';
      if (E.t) return 'As duas parcelas começam iguais, em ' + brl(E.consorcio) + '.';
      const resto = E.inicio === 'consorcio' ? 'a parcela do consórcio fica abaixo da do financiamento' : 'a parcela do financiamento fica abaixo da do consórcio';
      return salto ? salto + ' A partir daí, ' + resto + ' enquanto os dois estão sendo pagos.' : resto.charAt(0).toUpperCase() + resto.slice(1) + ' enquanto os dois estão sendo pagos.';
    }

    function textoEquilibrioInvestido(I) {
      if (I.t) return '<b>Mês ' + I.t + ':</b> a economia aplicada (' + brl(I.aplicado) + ') já cobre o saldo devedor do consórcio (' + brl(I.saldoCons) + '). A partir daí, o valor investido seria suficiente para quitar a carta.';
      return 'A economia aplicada não alcança o saldo devedor do consórcio antes da última parcela da carta.';
    }

    function secGraficos(rc) {
      let h = '<section class="bloco-res vitrine">' + ui.tituloSecao('Consórcio × financiamento em', 'Gráficos', 'Mês a mês');
      const Fi = rc.financiamento;
      const pend = pendGraficos(rc);
      if (pend) return h + '<p class="nc">Não calculado: ' + esc(pend.join('; ')) + '.</p></section>';
      const K = Fi.comparativo, nome = rc.indice.nome;
      const serie = (mod, rot, campo, ate, janela) => ({ mod, nome: rot, pontos: K.meses.slice(0, janela || K.T).map((l) => ({ x: l.t, y: l.t <= ate ? l[campo] : null })) });
      // 1) Evolução das parcelas, as duas reajustadas
      const E = K.equilibrioParcela;
      const optsParcelas = {
        extraDica: (x) => {
          const l = K.meses[x - 1];
          if (!l || x > K.N || x > K.prazoFin) return '';
          const d = l.economia;
          return '<div class="g-dica-extra">' + (Math.abs(d) < 0.005 ? 'Parcelas iguais' : 'Diferença: ' + esc(brl(Math.abs(d))) + ' a favor do ' + (d > 0 ? 'consórcio' : 'financiamento')) + '</div>';
        }
      };
      if (E && E.t) Object.assign(optsParcelas, { marcaX: E.t, marcaRotulo: 'mês ' + E.t + ': parcelas se igualam', marcaPonto: { x: E.t, y: E.consorcio, mod: 'cons' } });
      h += ui.graficoLinhas('gc-parcelas', 'Evolução das parcelas',
        'Parcela do consórcio com reajuste anual pelo ' + textoIndice(rc) + ' e parcela do financiamento corrigida pela TR, com Seguro/FGHab e taxas. Passe o mouse para ver cada mês.',
        [serie('cons', 'Parcela consórcio (' + nome + ')', 'consorcio', K.N), serie('fin', 'Parcela financiamento (TR)', 'financiamento', K.prazoFin)], optsParcelas, false);
      if (E) h += '<p class="g-equilibrio"><span class="g-equilibrio-rot">Ponto de equilíbrio</span>' + textoEquilibrioParcela(E, nome) + '</p>';
      // 2) Economia acumulada (orgânica e aplicada) e saldos devedores
      const I = K.equilibrioInvestido;
      const optsSaldos = {};
      if (I.t) Object.assign(optsSaldos, { marcaX: I.t, marcaRotulo: 'mês ' + I.t + ': investido cobre o saldo', marcaPonto: { x: I.t, y: I.aplicado, mod: 'aplic' } });
      // Janela: até a última parcela da carta, onde a economia é comparada ao saldo do consórcio (a tabela a cada 12 meses segue até o fim)
      const J = K.N;
      h += ui.graficoLinhas('gc-saldos', 'Economia acumulada e saldos devedores',
        'Até a última parcela da carta (mês ' + J + '): a diferença de parcela guardada mês a mês (orgânico) ou aplicada no CDB a ' + pct(K.taxaAplicacao) + ' a.a. (bruto), frente ao saldo devedor de cada caminho.',
        [serie('cons', 'Saldo devedor consórcio', 'saldoCons', K.N, J), serie('fin', 'Saldo devedor financiamento', 'saldoFin', K.prazoFin, J),
          serie('aplic', 'Acumulado aplicado (investido)', 'aplicado', K.T, J), serie('org', 'Acumulado orgânico', 'organico', K.T, J)], optsSaldos, false);
      h += '<p class="g-equilibrio"><span class="g-equilibrio-rot">Ponto de equilíbrio</span>' + textoEquilibrioInvestido(I) + '</p>';
      return h + '<p class="aviso-inline">Gráficos para apresentar na tela: não entram no PDF. Valores estimados com as premissas do menu.</p></section>';
    }

    function desenhar(rc, s, ctx) {
      recolhidos = ctx.recolhidos || new Set();
      let h = cabecalho(rc, s, ctx.lead);
      h += secResumo(rc);
      h += secCaracteristicas(rc);
      h += secFluxo(rc);
      if (rc.amortizacao) h += secAmortizacao(rc);
      if (rc.evolucao) h += secEvolucao(rc);
      if (rc.rendimentos) h += secRendimentos(rc, s, ctx);
      if (rc.financiamento && s.financiamento.ativo) h += secFinanciamento(rc);
      if (s.graficos && s.graficos.ativo) h += secGraficos(rc);
      return h + '<footer class="rodape"><p>' + esc(AVISO) + '</p></footer>';
    }

    // -------------------------------------------------------------------------
    // Textos para o WhatsApp
    // -------------------------------------------------------------------------

    function linhasFluxoTexto(rc) {
      return rc.fluxo.ok ? rc.fluxo.grupos.map((g) => '→ ' + CC.rotuloPeriodo(g) + ': ' + CC.fmtBRL(g.valor)) : [];
    }

    function textoFluxo(rc) {
      if (!rc.fluxo.ok) return '';
      return ['📆 *Fluxo das parcelas*' + (rc.fluxo.comReajuste ? ' _(' + textoReajuste(rc, rc.fluxo.m1) + ')_' : ''), ''].concat(linhasFluxoTexto(rc)).join('\n');
    }

    function mensagem(rc, s, lead) {
      const R = rc.resumo;
      const primeiro = String(lead || '').trim().split(/\s+/)[0] || '';
      const l = [
        'Olá, *' + primeiro + '*! Tudo bem?',
        '',
        'Conforme conversamos, segue abaixo o PDF da proposta do *' + ui.EMPRESA + '* apresentada em reunião. Os destaques:',
        '',
        '📊 *Carta Contemplada – ' + rc.segmento + '*'
      ];
      if (s.administradora) l.push('🏢 Administradora: *' + s.administradora + '*');
      l.push('📈 Índice de reajuste: *' + rc.indice.nome + '*');
      if (R.ok) {
        l.push('');
        R.cartas.forEach((c) => l.push('Carta #' + (c.i + 1) + ': ' + CC.fmtBRL(c.credito) + ' | entrada ' + CC.fmtBRL(c.entrada) + ' | parcela ' + CC.fmtBRL(c.parcela) + ' x ' + meses(c.prazo)));
        l.push('', '💰 *Resumo financeiro*', '',
          '• *Crédito total:* ' + CC.fmtBRL(R.credito),
          '• *Entrada:* ' + CC.fmtBRL(R.entrada) + (isNum(R.entradaPct) ? ' _(' + pct(R.entradaPct) + ')_' : ''),
          '• *Saldo devedor:* ' + CC.fmtBRL(R.saldoDevedor),
          '• *CET aprox.:* ' + (isNum(R.cetMes) ? pct(R.cetMes) : 'N/A') + ' a.m. | ' + (isNum(R.cetAno) ? pct(R.cetAno) : 'N/A') + ' a.a. + ' + rc.indice.nome,
          '• *Estimativa de transferência:* ' + CC.fmtBRL(R.transferencia) + ' (' + CC.REGRAS.transferenciaPct + '% do crédito)');
      }
      if (rc.fluxo.ok) l.push('', textoFluxo(rc));
      l.push('', 'Qualquer dúvida, estou à disposição! 😉');
      return l.join('\n');
    }

    // -------------------------------------------------------------------------
    // Proposta em PDF: páginas A4 montadas conforme as guias habilitadas
    // -------------------------------------------------------------------------

    const pdfTitulo = (a, b) => '<h2 class="pdf-h2">' + esc(a) + ' <span class="acento">' + esc(b) + '</span></h2>';
    const pdfLinha = ([rot, val, cls, nota]) => '<div class="pdf-linha' + (cls ? ' ' + cls : '') + '"><span>' + rot + (nota ? '<small>' + nota + '</small>' : '') + '</span><b>' + val + '</b></div>';
    const pdfDestaques = (itens) => '<div class="pdf-destaques c' + itens.length + '">' + itens.map(([rot, val, nota, cls]) => '<div' + (cls ? ' class="' + cls + '"' : '') + '><span>' + rot + '</span><b>' + val + '</b>' + (nota ? '<small>' + nota + '</small>' : '') + '</div>').join('') + '</div>';

    function pdfTabela(cab, linhas, rodape, cls) {
      return '<table class="pdf-tab pdf-tab-dir' + (cls ? ' ' + cls : '') + '"><thead><tr>' + cab.map((c) => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>' +
        linhas.map((l) => '<tr' + (l.cls ? ' class="' + l.cls + '"' : '') + '>' + (l.cel || l).map((c) => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody>' +
        (rodape ? '<tfoot><tr>' + rodape.map((c) => '<td>' + c + '</td>').join('') + '</tr></tfoot>' : '') + '</table>';
    }

    /** Bloco de tabela: no PDF, as linhas que não cabem na página continuam na seguinte. */
    const blocoTabela = (titulo, sub, cab, linhas, rodape, antes, cls) => ({ tab: { titulo, sub, cab, linhas, rodape, antes, cls } });

    function htmlTabela(t, linhas, continuacao, ultimo) {
      return '<div class="pdf-bloco">' + pdfTitulo(t.titulo[0], t.titulo[1] + (continuacao ? ' (continuação)' : '')) +
        (continuacao ? '' : (t.sub ? '<p class="pdf-ident pdf-sub-bloco">' + t.sub + '</p>' : '') + (t.antes || '')) +
        pdfTabela(t.cab, linhas, ultimo ? t.rodape : null, t.cls) + '</div>';
    }

    function pdfPagina(n, total, lead, corpo) {
      return '<section class="pdf-pagina"><div class="pdf-corpo">' + corpo + '</div>' +
        '<footer class="pdf-rodape"><span>' + esc(lead) + '</span>' + (ui.LOGO.escuro ? '<img class="pdf-logo-rodape" src="' + ui.LOGO.escuro + '" alt="' + esc(ui.EMPRESA) + '">' : '') + '<span>' + n + ' / ' + total + '</span></footer></section>';
    }

    /**
     * Mede os blocos já no tamanho final e distribui nas páginas A4 sem cortar nenhum.
     * Tabelas longas são divididas por linha: o que não cabe na página continua na seguinte.
     */
    async function paginar(itens) {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const html0 = itens.map((it) => (typeof it === 'string' ? it : htmlTabela(it.tab, it.tab.linhas, false, true)));
      const area = document.createElement('div');
      area.className = 'pdf-render pdf-medida';
      area.innerHTML = '<section class="pdf-pagina"><div class="pdf-corpo">' + html0.map((b, i) => '<div class="pdf-item' + (i === html0.length - 1 ? ' pdf-fim' : '') + '">' + b + '</div>').join('') + '</div></section>';
      document.body.appendChild(area);
      let util, gap, medidas;
      try {
        const pg = area.querySelector('.pdf-pagina');
        const corpo = area.querySelector('.pdf-corpo');
        const cs = getComputedStyle(pg);
        util = (pg.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) * 0.994;
        gap = parseFloat(getComputedStyle(corpo).rowGap) || 0;
        medidas = Array.from(corpo.children).map((el, i) => {
          const h = el.getBoundingClientRect().height;
          const tb = typeof itens[i] === 'string' ? null : el.querySelector('tbody');
          const n = tb ? itens[i].tab.linhas.length : 0;
          // Altura média da linha e o restante do bloco (título, subtítulo, destaques, cabeçalho, total)
          return n ? { h, linha: tb.getBoundingClientRect().height / n, resto: h - tb.getBoundingClientRect().height } : { h };
        });
      } finally {
        area.remove();
      }
      const paginas = [];
      let atual = [], usado = 0;
      const novaPagina = () => { paginas.push(atual); atual = []; usado = 0; };
      const por = (html, h) => { usado += (atual.length ? gap : 0) + h; atual.push(html); };
      itens.forEach((it, i) => {
        const m = medidas[i];
        if (!m.linha) {
          if (atual.length && usado + gap + m.h > util) novaPagina();
          por(html0[i], m.h);
          return;
        }
        let linhas = it.tab.linhas, cont = false;
        while (linhas.length) {
          const livre = util - usado - (atual.length ? gap : 0);
          const cabe = Math.floor((livre - m.resto) / m.linha);
          if (cabe >= linhas.length) { por(htmlTabela(it.tab, linhas, cont, true), m.resto + linhas.length * m.linha); break; }
          if (cabe >= 4 || !atual.length) {
            const n = Math.max(1, cabe); // página vazia: ao menos uma linha, para nunca travar
            por(htmlTabela(it.tab, linhas.slice(0, n), cont, n >= linhas.length), m.resto + n * m.linha);
            linhas = linhas.slice(n);
            cont = true;
          }
          if (linhas.length) novaPagina();
        }
      });
      if (atual.length) paginas.push(atual);
      return paginas.map((p, i) => p.map((b, j) => '<div class="pdf-item' + (i === paginas.length - 1 && j === p.length - 1 ? ' pdf-fim' : '') + '">' + b + '</div>').join(''));
    }

    async function montarProposta(rc, s, lead, ctx) {
      const hoje = new Date().toLocaleDateString('pt-BR');
      const R = rc.resumo;
      const blocos = [];
      // Topo e resumo
      const kpi = (rot, val, cls, suf) => '<div class="pdf-kpi' + (cls ? ' ' + cls : '') + '"><span>' + rot + '</span><b>' + val + (suf ? '<small> ' + suf + '</small>' : '') + '</b></div>';
      blocos.push('<header class="pdf-topo">' + (ui.LOGO.escuro ? '<img class="pdf-logo" src="' + ui.LOGO.escuro + '" alt="' + esc(ui.EMPRESA) + '">' : '') +
        '<p class="eyebrow">Emitida em ' + hoje + '</p><h1>Proposta de <span class="acento">Carta Contemplada</span></h1>' +
        '<p class="pdf-cliente">' + esc(lead) + '</p><p class="pdf-ident">' + identificacao(rc, s) + '</p></header>' +
        '<div class="pdf-kpis pdf-kpis-cont">' + kpi('Crédito contrato', R.ok ? brl(R.credito) : '—', 'destaque') + kpi('Parcela atual', R.ok ? brl(R.parcelaAtual) : '—', 'destaque') +
        kpi('CET mensal', R.ok ? pct(R.cetMes) : '—', '', 'a.m.') + kpi('CET anual', R.ok ? pct(R.cetAno) : '—', 'cet-indice', 'a.a.&nbsp;+&nbsp;' + esc(rc.indice.nome)) + '</div>');
      // Seção habilitada com pendência: aparece como "Não calculado", como diz a prévia
      const pdfNc = (a, b, pend) => '<div class="pdf-bloco">' + pdfTitulo(a, b) + '<p class="pdf-ident pdf-nc">Não calculado: ' + esc(pend.join('; ')) + '.</p></div>';
      if (!R.ok) blocos.push(pdfNc('Características da', 'Proposta', ['preencha crédito, parcela e prazo de todas as cartas']));
      if (R.ok) {
        blocos.push('<div class="pdf-bloco">' + pdfTitulo('Características da', 'Proposta') + '<dl class="pdf-carac">' + listaCaracteristicas(R).map(([k, x]) => '<div><dt>' + k + '</dt><dd>' + x + '</dd></div>').join('') + '</dl></div>');
        if (R.cartas.length > 1) blocos.push('<div class="pdf-bloco">' + pdfTitulo('Composição da', 'Junção') + tabelaCartas(R, true) + '</div>');
      }
      const F = rc.fluxo;
      if (!F.ok) blocos.push(pdfNc('Fluxo de', 'Parcelas', F.pend));
      if (F.ok) blocos.push(blocoTabela(['Fluxo de', 'Parcelas'], esc(subFluxo(rc)), ['Período', 'Parcelas', 'Valor da parcela', 'Subtotal'], linhasFluxo(F), ['Total em parcelas', F.N + 'x', '', brl(F.total)]));
      const A = rc.amortizacao;
      if (A && !A.ok) blocos.push(pdfNc('Estudo de', 'Amortização', A.pend));
      if (A && A.ok) {
        blocos.push(blocoTabela(['Estudo de', 'Amortização'], subAmortizacao(rc, A), ['Mês', 'Parcela sem aporte', 'Parcela com aporte', 'Saldo devedor'], linhasAmortizacao(A), null, pdfDestaques(itensAmortizacao(A))));
      }
      const E = rc.evolucao;
      if (E && !E.ok) blocos.push(pdfNc('Evolução das', 'Parcelas', E.pend));
      if (E && E.ok) blocos.push(blocoTabela(['Evolução das', 'Parcelas'], subEvolucao(rc, E), ['Mês', 'Parcela', 'Aporte acumulado', 'Saldo devedor'], linhasEvolucao(E)));
      const Rd = rc.rendimentos;
      if (Rd && !Rd.ok) blocos.push(pdfNc('Calculadora de', 'Rendimentos', Rd.pend));
      if (Rd && Rd.ok) {
        blocos.push('<div class="pdf-bloco">' + pdfTitulo('Calculadora de', 'Rendimentos') + '<p class="pdf-ident pdf-sub-bloco">' + subRendimentos(Rd) + ' Valor líquido de resgate:</p>' +
          pdfDestaques(infosRendimentos(Rd)) + barras(Rd, true) + '</div>');
        blocos.push('<div class="pdf-bloco">' + pdfTitulo('Simulação do', 'Investimento') + tabelaRendimentos(Rd, true) + pdfDestaques(itensComparativoRend(rc)) +
          '<p class="pdf-nota">' + esc(notaRendimentos({ params: Object.assign({}, CC.PARAMS_RENDIMENTOS, s.rendimentos.params), fonteTaxas: ctx.fonteTaxas })) + '</p></div>');
      }
      // Só a guia Consórcio vs Financiamento vai para o PDF; os gráficos ficam na tela
      const Fi = s.financiamento.ativo ? rc.financiamento : null;
      if (Fi && !Fi.ok) blocos.push(pdfNc('Consórcio vs', 'Financiamento', Fi.pend));
      if (Fi && Fi.ok) {
        let h = '<div class="pdf-bloco">' + pdfTitulo('Consórcio vs', 'Financiamento') + '<p class="pdf-ident pdf-sub-bloco">' + subFinanciamento(Fi, rc) + '</p>';
        // Lado a lado com as linhas alinhadas (as linhas são filhas diretas do cartão, na grade comum)
        h += '<div class="pdf-grade c' + (Fi.consorcio ? '2 lado' : '1') + '">';
        if (Fi.consorcio) h += '<article class="pdf-cartao"><header><span class="forma-icone">' + icone('carta') + '</span><h3>Carta contemplada<small class="pdf-sub">' + esc(rc.segmento) + '</small></h3></header>' + linhasConsorcio(Fi, rc).map(pdfLinha).join('') + '</article>';
        h += '<article class="pdf-cartao"><header><span class="forma-icone">' + icone('banco') + '</span><h3>Financiamento<small class="pdf-sub">' + nomeSistema(Fi) + '</small></h3></header>' + linhasFinanciamento(Fi).map(pdfLinha).join('') + '</article></div>';
        if (isNum(Fi.diferenca) && mesmoCredito(Fi)) h += '<div class="pdf-cet"><span>Diferença no total pago</span><b>' + brl(Math.abs(Fi.diferenca)) + '</b><em>a favor do ' + (Fi.diferenca >= 0 ? 'consórcio' : 'financiamento') + ', com os reajustes de cada um</em></div>';
        h += avisosFinanciamento(Fi).map((x) => '<p class="pdf-aviso ' + x.cls + '">' + x.html + '</p>').join('');
        blocos.push(h + '</div>');
        const K = Fi.comparativo;
        if (K && !K.ok) blocos.push(pdfNc('Consórcio × financiamento', 'a cada 12 meses', K.pend));
        if (K && K.ok) blocos.push(blocoTabela(['Consórcio × financiamento', 'a cada 12 meses'], subComparativo(K), CAB_COMPARATIVO(rc, Fi), linhasComparativo(K), null, null, 'pdf-tab-comp'));
        blocos.push(blocoTabela(['Custos invisíveis do', 'financiamento'], subCustos(Fi), ['Custo', '1º mês', 'Total no contrato', '% do crédito'], linhasCustos(Fi), rodapeCustos(Fi)));
      }
      // Chamada para o especialista e avisos
      const wa = ui.numeroWhatsapp((window.CONFIG_SIMULADOR || {}).whatsappEspecialista);
      const msg = encodeURIComponent('Olá! Recebi a proposta de carta contemplada' + (lead ? ' de ' + lead : '') + ' e gostaria de conversar.');
      blocos.push('<div class="pdf-cta"><div><h3>Vamos dar o próximo passo?</h3><p>Fale com o especialista para tirar dúvidas e seguir com a proposta.</p></div>' +
        (wa ? '<a class="pdf-botao" href="https://wa.me/' + wa + '?text=' + msg + '">Falar no WhatsApp</a>' : '<span class="pdf-botao inativo">Falar no WhatsApp</span>') + '</div>' +
        '<div class="pdf-disclaimer"><b>Importante</b><p>' + esc(AVISO) + '</p></div>');
      const paginas = await paginar(blocos);
      return { html: paginas.map((c, i) => pdfPagina(i + 1, paginas.length, lead, c)).join(''), data: hoje, semWhatsapp: !wa, paginas: paginas.length };
    }

    return { desenhar, htmlCartas, textoFluxo, mensagem, montarProposta };
  };
})();

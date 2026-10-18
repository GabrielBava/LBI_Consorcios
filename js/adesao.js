/* Transmitir proposta: formulário do termo de adesão (uso interno, backoffice).
 * O consultor preenche os dados mínimos do cliente; ao finalizar, o simulador gera um PDF
 * com os dados e um e-mail pronto para o time de pós-venda subir o termo e gerar o contrato.
 * Os campos ficam em CAMPOS_ADESAO, para trocar facilmente quando a lista definitiva chegar.
 * Criado pelo app.js (window.Adesao(ui)), que fornece os utilitários compartilhados. */
(function () {
  'use strict';

  const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

  /**
   * Campos do termo de adesão, por grupo. Tipos: texto, cpf, data, email, tel, cep, moeda, lista, area.
   * obrigatorio: precisa ser preenchido; largura 'meia' ocupa meia linha; mostrar: condição (outro campo = valores).
   */
  const CAMPOS_ADESAO = [
    { grupo: 'Dados do consorciado', campos: [
      { id: 'nome', rotulo: 'Nome completo', tipo: 'texto', obrigatorio: true },
      { id: 'cpf', rotulo: 'CPF', tipo: 'cpf', obrigatorio: true, largura: 'meia' },
      { id: 'nascimento', rotulo: 'Data de nascimento', tipo: 'data', obrigatorio: true, largura: 'meia' },
      { id: 'rg', rotulo: 'RG', tipo: 'texto', largura: 'meia' },
      { id: 'orgaoEmissor', rotulo: 'Órgão emissor / UF', tipo: 'texto', largura: 'meia' },
      { id: 'estadoCivil', rotulo: 'Estado civil', tipo: 'lista', opcoes: ['Solteiro(a)', 'Casado(a)', 'União estável', 'Divorciado(a)', 'Viúvo(a)'], largura: 'meia' },
      { id: 'profissao', rotulo: 'Profissão', tipo: 'texto', largura: 'meia' },
      { id: 'conjugeNome', rotulo: 'Nome do cônjuge', tipo: 'texto', largura: 'meia', mostrar: { campo: 'estadoCivil', valores: ['Casado(a)', 'União estável'] } },
      { id: 'conjugeCpf', rotulo: 'CPF do cônjuge', tipo: 'cpf', largura: 'meia', mostrar: { campo: 'estadoCivil', valores: ['Casado(a)', 'União estável'] } },
      { id: 'renda', rotulo: 'Renda mensal (R$)', tipo: 'moeda', largura: 'meia' },
      { id: 'telefone', rotulo: 'Celular (WhatsApp)', tipo: 'tel', obrigatorio: true, largura: 'meia' },
      { id: 'email', rotulo: 'E-mail', tipo: 'email', obrigatorio: true }
    ] },
    { grupo: 'Endereço', campos: [
      { id: 'cep', rotulo: 'CEP', tipo: 'cep', obrigatorio: true, largura: 'meia' },
      { id: 'uf', rotulo: 'UF', tipo: 'lista', opcoes: UFS, obrigatorio: true, largura: 'meia' },
      { id: 'logradouro', rotulo: 'Logradouro', tipo: 'texto', obrigatorio: true },
      { id: 'numero', rotulo: 'Número', tipo: 'texto', obrigatorio: true, largura: 'meia' },
      { id: 'complemento', rotulo: 'Complemento', tipo: 'texto', largura: 'meia' },
      { id: 'bairro', rotulo: 'Bairro', tipo: 'texto', obrigatorio: true, largura: 'meia' },
      { id: 'cidade', rotulo: 'Cidade', tipo: 'texto', obrigatorio: true, largura: 'meia' }
    ] },
    { grupo: 'Dados da cota', campos: [
      { id: 'grupoCota', rotulo: 'Grupo', tipo: 'texto', largura: 'meia' },
      { id: 'numeroCota', rotulo: 'Cota', tipo: 'texto', largura: 'meia' },
      { id: 'vencimento', rotulo: 'Dia de vencimento', tipo: 'lista', opcoes: ['5', '10', '15', '20', '25'], largura: 'meia' },
      { id: 'pagamento', rotulo: 'Pagamento da 1ª parcela', tipo: 'lista', opcoes: ['Boleto', 'PIX', 'Cartão de crédito', 'Débito em conta'], largura: 'meia' }
    ] },
    { grupo: 'Consultor responsável', campos: [
      { id: 'consultorNome', rotulo: 'Nome do consultor', tipo: 'texto', obrigatorio: true, largura: 'meia', lembrar: true },
      { id: 'consultorEmail', rotulo: 'E-mail do consultor', tipo: 'email', obrigatorio: true, largura: 'meia', lembrar: true },
      { id: 'observacoes', rotulo: 'Observações para o pós-venda', tipo: 'area' }
    ] }
  ];

  // ---------------------------------------------------------------------------
  // Validações e máscaras
  // ---------------------------------------------------------------------------

  const digitos = (t) => String(t || '').replace(/\D/g, '');

  /** CPF com dígitos verificadores válidos. */
  function cpfValido(t) {
    const d = digitos(t);
    if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
    const dv = (n) => {
      let soma = 0;
      for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
      const r = (soma * 10) % 11;
      return r === 10 ? 0 : r;
    };
    return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
  }
  const emailValido = (t) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(t || '').trim());

  function mascara(tipo, t) {
    const d = digitos(t);
    if (tipo === 'cpf') {
      const x = d.slice(0, 11);
      return x.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1-$2');
    }
    if (tipo === 'cep') return d.slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2');
    if (tipo === 'tel') {
      const x = d.slice(0, 11);
      if (x.length <= 2) return x ? '(' + x : '';
      if (x.length <= 6) return '(' + x.slice(0, 2) + ') ' + x.slice(2);
      if (x.length <= 10) return '(' + x.slice(0, 2) + ') ' + x.slice(2, 6) + '-' + x.slice(6);
      return '(' + x.slice(0, 2) + ') ' + x.slice(2, 7) + '-' + x.slice(7);
    }
    if (tipo === 'moeda') return d ? (Number(d) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';
    return t;
  }

  /** Mensagem de erro do campo (ou '' quando está certo). */
  function erroCampo(c, v) {
    const vazio = !String(v == null ? '' : v).trim();
    if (vazio) return c.obrigatorio ? 'Campo obrigatório.' : '';
    if (c.tipo === 'cpf' && !cpfValido(v)) return 'CPF inválido.';
    if (c.tipo === 'email' && !emailValido(v)) return 'E-mail inválido.';
    if (c.tipo === 'cep' && digitos(v).length !== 8) return 'CEP com 8 dígitos.';
    if (c.tipo === 'tel' && digitos(v).length < 10) return 'Telefone com DDD.';
    if (c.tipo === 'data') {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
      const dt = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
      if (!dt || dt > new Date() || Number(m[1]) < 1900) return 'Data inválida.';
      const hoje = new Date();
      const idade = hoje.getFullYear() - dt.getFullYear() - (hoje < new Date(hoje.getFullYear(), dt.getMonth(), dt.getDate()) ? 1 : 0);
      if (idade < 18) return 'O consorciado precisa ter 18 anos ou mais.';
    }
    return '';
  }

  const visivel = (c, dados) => !c.mostrar || c.mostrar.valores.includes(dados[c.mostrar.campo]);
  const dataBr = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] : iso || ''; };
  const valorTexto = (c, v) => (c.tipo === 'data' ? dataBr(v) : String(v == null ? '' : v).trim());

  function Adesao(ui) {
    const esc = ui.esc;
    const CHAVE_CONSULTOR = 'simconsorcio.consultor';
    // Dados digitados ficam só na memória desta aba (não são gravados no navegador: são dados pessoais do cliente)
    let rascunho = {};

    function lembrados() {
      try { return JSON.parse(localStorage.getItem(CHAVE_CONSULTOR) || '{}') || {}; } catch (e) { return {}; }
    }
    function lembrar(dados) {
      const l = {};
      CAMPOS_ADESAO.forEach((g) => g.campos.forEach((c) => { if (c.lembrar) l[c.id] = dados[c.id] || ''; }));
      try { localStorage.setItem(CHAVE_CONSULTOR, JSON.stringify(l)); } catch (e) { /* sem armazenamento */ }
    }

    function campoHtml(c, v) {
      const id = 'ad-' + c.id;
      const req = c.obrigatorio ? ' <em class="req">*</em>' : '';
      const comum = ' id="' + id + '" data-ad="' + c.id + '"' + (c.obrigatorio ? ' required aria-required="true"' : '');
      let input;
      if (c.tipo === 'lista') input = '<select' + comum + '><option value="">Selecione</option>' + c.opcoes.map((o) => '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select>';
      else if (c.tipo === 'area') input = '<textarea' + comum + ' rows="3" maxlength="600">' + esc(v || '') + '</textarea>';
      else {
        const tipoHtml = { data: 'date', email: 'email', tel: 'tel' }[c.tipo] || 'text';
        const modo = { cpf: 'numeric', cep: 'numeric', moeda: 'numeric', tel: 'tel' }[c.tipo];
        input = '<input type="' + tipoHtml + '"' + comum + (modo ? ' inputmode="' + modo + '"' : '') + ' value="' + esc(v || '') + '" autocomplete="off"' + (c.tipo === 'data' ? ' max="' + new Date().toISOString().slice(0, 10) + '"' : '') + '>';
      }
      return '<label class="f ad-campo' + (c.largura === 'meia' ? ' meia' : '') + '"' + (c.mostrar ? ' data-ad-mostrar="' + c.id + '"' : '') + '><span>' + esc(c.rotulo) + req + '</span>' + input + '<small class="ad-erro" aria-live="polite"></small></label>';
    }

    function formularioHtml(dados, resumo) {
      let h = '<h2>Transmitir proposta</h2><p class="nota">Dados mínimos para o termo de adesão. Uso interno: ao finalizar, o PDF e o e-mail vão para o time de pós-venda gerar o contrato. O cliente não recebe este documento.</p>';
      h += '<div class="ad-resumo"><b>Proposta</b><dl>' + resumo.map(([k, v]) => '<div><dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd></div>').join('') + '</dl></div>';
      h += '<form class="ad-form" novalidate>' + CAMPOS_ADESAO.map((g) => '<fieldset class="ad-grupo"><legend>' + esc(g.grupo) + '</legend><div class="ad-grade">' +
        g.campos.map((c) => campoHtml(c, dados[c.id])).join('') + '</div></fieldset>').join('') + '</form>';
      return h;
    }

    function lerFormulario(raiz) {
      const dados = {};
      raiz.querySelectorAll('[data-ad]').forEach((el) => { dados[el.dataset.ad] = el.value; });
      return dados;
    }

    function atualizarCondicionais(raiz) {
      const dados = lerFormulario(raiz);
      CAMPOS_ADESAO.forEach((g) => g.campos.forEach((c) => {
        if (!c.mostrar) return;
        const el = raiz.querySelector('[data-ad-mostrar="' + c.id + '"]');
        if (el) el.hidden = !visivel(c, dados);
      }));
    }

    /** Valida o formulário, marca os campos com erro e devolve se está tudo certo. */
    function validarFormulario(raiz) {
      const dados = lerFormulario(raiz);
      let primeiro = null;
      CAMPOS_ADESAO.forEach((g) => g.campos.forEach((c) => {
        const el = raiz.querySelector('#ad-' + c.id);
        if (!el) return;
        const msg = visivel(c, dados) ? erroCampo(c, dados[c.id]) : '';
        el.classList.toggle('campo-erro', !!msg);
        el.setAttribute('aria-invalid', msg ? 'true' : 'false');
        el.closest('.ad-campo').querySelector('.ad-erro').textContent = msg;
        if (msg && !primeiro) primeiro = el;
      }));
      if (primeiro) primeiro.focus();
      return !primeiro;
    }

    // -------------------------------------------------------------------------
    // Saídas: PDF interno e e-mail para o pós-venda
    // -------------------------------------------------------------------------

    function linhasGrupo(g, dados) {
      return g.campos.filter((c) => visivel(c, dados) && String(dados[c.id] || '').trim()).map((c) => [c.rotulo, valorTexto(c, dados[c.id])]);
    }

    function pdfHtml(dados, resumo, data) {
      const dl = (pares) => '<dl class="pdf-carac">' + pares.map(([k, v]) => '<div><dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd></div>').join('') + '</dl>';
      let corpo = '<header class="pdf-topo">' + (ui.LOGO.claro ? '<img class="pdf-logo" src="' + ui.LOGO.claro + '" alt="' + esc(ui.EMPRESA) + '">' : '') +
        '<p class="eyebrow">Uso interno · gerado em ' + data + '</p><h1>Termo de <span class="acento">Adesão</span></h1>' +
        '<p class="pdf-cliente">' + esc(dados.nome) + '</p><p class="pdf-ident">Dados para o pós-venda subir o termo de adesão e gerar o contrato.</p></header>';
      corpo += '<div class="pdf-bloco">' + '<h2 class="pdf-h2">Dados da <span class="acento">Proposta</span></h2>' + dl(resumo) + '</div>';
      CAMPOS_ADESAO.forEach((g) => {
        const pares = linhasGrupo(g, dados).filter(([k]) => k !== 'Observações para o pós-venda');
        if (pares.length) corpo += '<div class="pdf-bloco"><h2 class="pdf-h2">' + esc(g.grupo) + '</h2>' + dl(pares) + '</div>';
      });
      if (String(dados.observacoes || '').trim()) corpo += '<div class="pdf-bloco"><h2 class="pdf-h2">Observações</h2><p class="pdf-ident">' + esc(dados.observacoes) + '</p></div>';
      return '<section class="pdf-pagina"><div class="pdf-corpo">' + corpo + '</div>' +
        '<footer class="pdf-rodape"><span>' + esc(dados.consultorNome || '') + '</span>' + (ui.LOGO.claro ? '<img class="pdf-logo-rodape" src="' + ui.LOGO.claro + '" alt="' + esc(ui.EMPRESA) + '">' : '') + '<span>Uso interno</span></footer></section>';
    }

    function emailTexto(dados, resumo, nomePdf) {
      const l = ['Olá, time de pós-venda!', '', 'Segue o termo de adesão para subir e gerar o contrato do cliente.', '', 'PROPOSTA'];
      resumo.forEach(([k, v]) => l.push('• ' + k + ': ' + v));
      CAMPOS_ADESAO.forEach((g) => {
        const pares = linhasGrupo(g, dados);
        if (!pares.length) return;
        l.push('', g.grupo.toUpperCase());
        pares.forEach(([k, v]) => l.push('• ' + k + ': ' + v));
      });
      l.push('', 'Anexo: ' + nomePdf, '', 'Obrigado!', dados.consultorNome || '');
      return l.join('\n');
    }

    function janelaEnvio(dados, resumo, blob, nomePdf) {
      const para = String((window.CONFIG_SIMULADOR || {}).emailPosVenda || '').trim();
      const adm = (resumo.find(([k]) => k === 'Administradora') || [])[1];
      const assunto = 'Termo de adesão · ' + dados.nome + (adm && adm !== '—' ? ' · ' + adm : '');
      const corpo = emailTexto(dados, resumo, nomePdf);
      const mailto = 'mailto:' + encodeURIComponent(para) + '?subject=' + encodeURIComponent(assunto) + '&body=' + encodeURIComponent(corpo);
      const html = '<h2>Enviar ao pós-venda</h2>' +
        '<p class="nota">O PDF <b>' + esc(nomePdf) + '</b> foi gerado. Abra o e-mail, anexe o arquivo e envie ao time de pós-venda.</p>' +
        (para ? '' : '<p class="aviso">Sem e-mail do pós-venda configurado: informe <b>emailPosVenda</b> em js/config.js (ou preencha o destinatário no e-mail).</p>') +
        '<div class="mensagem-envio"><div class="mensagem-topo"><b>' + esc(assunto) + '</b><button type="button" class="botao-copiar" data-copiar-email>Copiar e-mail</button></div>' +
        '<textarea readonly rows="12" aria-label="Texto do e-mail para o pós-venda">' + esc(corpo) + '</textarea></div>';
      const fundo = ui.janela(html, [
        { texto: 'Baixar PDF de novo', acao: () => { ui.baixarArquivo(blob, nomePdf).catch(() => ui.avisar('Não foi possível baixar o PDF.')); return false; } },
        { texto: 'Abrir e-mail', primario: true, acao: () => { window.location.href = mailto; return false; } },
        { texto: 'Concluir' }
      ], true);
      fundo.querySelector('[data-copiar-email]').addEventListener('click', () => ui.copiarTexto(corpo, 'E-mail copiado. Cole no seu e-mail e anexe o PDF.'));
    }

    async function finalizar(dados, resumo) {
      const data = new Date().toLocaleDateString('pt-BR');
      const nomePdf = 'Termo_Adesao_' + ui.nomeArquivo(dados.nome) + '_' + data.replace(/\//g, '-') + '.pdf';
      const blob = await ui.gerarPdfArquivo(pdfHtml(dados, resumo, data));
      await ui.baixarArquivo(blob, nomePdf);
      janelaEnvio(dados, resumo, blob, nomePdf);
    }

    /** Abre o formulário. cliente: { nome, telefone }; resumo: pares [rótulo, valor] da proposta em tela. */
    function abrir(cliente, resumo) {
      const dados = Object.assign({}, lembrados(), rascunho);
      if (!dados.nome) dados.nome = cliente.nome || '';
      if (!dados.telefone) dados.telefone = cliente.telefone || '';
      let ocupado = false;
      const fundo = ui.janela(formularioHtml(dados, resumo), [
        { texto: 'Cancelar', acao: (f) => { rascunho = lerFormulario(f); } },
        { texto: 'Finalizar e gerar termo', primario: true, acao: (f) => {
          if (ocupado) return false;
          rascunho = lerFormulario(f);
          if (!validarFormulario(f)) { ui.avisar('Confira os campos destacados.'); return false; }
          const lidos = lerFormulario(f);
          lembrar(lidos);
          ocupado = true;
          finalizar(lidos, resumo).then(() => {
            rascunho = {};
            f.remove();
          }).catch((e) => {
            ocupado = false;
            ui.avisar(e && e.code === 'declined' ? 'Download cancelado.' : 'Não foi possível gerar o PDF do termo. Tente de novo.');
          });
          return false;
        } }
      ], true);
      fundo.classList.add('sobreposicao-adesao');
      const form = fundo.querySelector('.ad-form');
      form.addEventListener('input', (ev) => {
        const el = ev.target;
        const c = CAMPOS_ADESAO.flatMap((g) => g.campos).find((x) => x.id === el.dataset.ad);
        if (c && ['cpf', 'cep', 'tel', 'moeda'].includes(c.tipo)) el.value = mascara(c.tipo, el.value);
        if (el.classList.contains('campo-erro')) { el.classList.remove('campo-erro'); el.closest('.ad-campo').querySelector('.ad-erro').textContent = ''; }
      });
      form.addEventListener('change', () => atualizarCondicionais(fundo));
      atualizarCondicionais(fundo);
      const primeiro = fundo.querySelector('[data-ad]');
      if (primeiro) primeiro.focus({ preventScroll: true });
    }

    return { abrir, CAMPOS_ADESAO, cpfValido, emailValido, erroCampo };
  }

  if (typeof window !== 'undefined') window.Adesao = Adesao;
  // Exposto para testes (Node)
  if (typeof module !== 'undefined' && module.exports) module.exports = { cpfValido, emailValido, erroCampo, mascara, CAMPOS_ADESAO };
})();

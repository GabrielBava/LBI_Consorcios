/* Finalizar venda: ficha de cadastro para o termo de adesão (uso interno, backoffice).
 * O consultor confere os dados do fechamento (vindos da simulação) e preenche os dados do cliente;
 * ao concluir, o simulador baixa o PDF "Termo de cadastro de consórcio" (com data e hora da emissão),
 * que o consultor encaminha ao pós-venda, e mostra a tela de agradecimento antes de abrir o site.
 * Os campos ficam em CAMPOS_ADESAO. Criado pelo app.js (window.Adesao(ui)). */
(function () {
  'use strict';

  const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
  // Sugestões do campo Banco (código Febraban · nome); outro banco pode ser digitado
  const BANCOS = ['001 · Banco do Brasil', '104 · Caixa Econômica Federal', '237 · Bradesco', '341 · Itaú Unibanco', '033 · Santander',
    '260 · Nubank', '077 · Banco Inter', '336 · C6 Bank', '756 · Sicoob', '748 · Sicredi', '041 · Banrisul', '070 · BRB', '212 · Banco Original', '655 · Banco Votorantim'];
  const CASADO = { campo: 'estadoCivil', valores: ['Casado(a)', 'União estável'] };
  const PJ = { campo: 'tipoPessoa', valores: ['Jurídica'] };

  /**
   * Campos da ficha, por grupo. Tipos: texto, cpf, cnpj, data, email, tel, cep, moeda, inteiro, percentual, lista, area.
   * grupoPJ: nome do grupo quando o cliente é pessoa jurídica.
   * obrigatorio: precisa ser preenchido (campos ocultos não contam); largura 'meia' ocupa meia linha;
   * mostrar: condição (outro campo = valores); proposta: vem da simulação em tela ao abrir;
   * lembrar: o navegador guarda (só os dados do consultor); sugestoes: lista para escolher ou digitar.
   */
  const CAMPOS_ADESAO = [
    { id: 'fechamento', grupo: 'Fechamento', campos: [
      { id: 'estrategia', rotulo: 'Estratégia', tipo: 'lista', opcoes: ['Aquisição', 'Alavancagem'], obrigatorio: true, largura: 'meia' },
      { id: 'tipoPessoa', rotulo: 'Tipo de pessoa', tipo: 'lista', opcoes: ['Física', 'Jurídica'], obrigatorio: true, largura: 'meia', proposta: true },
      { id: 'tipoCarta', rotulo: 'Tipo da carta', tipo: 'lista', opcoes: ['Imóvel', 'Veículo', 'Serviço'], obrigatorio: true, largura: 'meia', proposta: true },
      { id: 'prazo', rotulo: 'Prazo (meses)', tipo: 'inteiro', min: 1, max: 600, obrigatorio: true, largura: 'meia', proposta: true },
      { id: 'valorCarta', rotulo: 'Valor da carta (R$)', tipo: 'moeda', obrigatorio: true, largura: 'meia', proposta: true },
      { id: 'redutor', rotulo: 'Percentual redutor (%)', tipo: 'percentual', largura: 'meia', proposta: true },
      { id: 'seguroPrestamista', rotulo: 'Seguro prestamista', tipo: 'lista', opcoes: ['Sim', 'Não'], obrigatorio: true, largura: 'meia', proposta: true }
    ] },
    { id: 'empresa', grupo: 'Dados da empresa', campos: [
      { id: 'cnpj', rotulo: 'CNPJ', tipo: 'cnpj', obrigatorio: true, largura: 'meia', mostrar: PJ },
      { id: 'razaoSocial', rotulo: 'Razão social', tipo: 'texto', obrigatorio: true, largura: 'meia', mostrar: PJ },
      { id: 'nomeFantasia', rotulo: 'Nome fantasia', tipo: 'texto', largura: 'meia', mostrar: PJ },
      { id: 'dataAbertura', rotulo: 'Data de abertura', tipo: 'data', obrigatorio: true, largura: 'meia', mostrar: PJ },
      { id: 'faturamento', rotulo: 'Faturamento mensal (R$)', tipo: 'moeda', obrigatorio: true, largura: 'meia', mostrar: PJ }
    ] },
    { id: 'consorciado', grupo: 'Dados do consorciado', grupoPJ: 'Dados do representante legal', campos: [
      { id: 'cpf', rotulo: 'CPF', tipo: 'cpf', obrigatorio: true, largura: 'meia' },
      { id: 'nome', rotulo: 'Nome completo', tipo: 'texto', obrigatorio: true, largura: 'meia' },
      { id: 'nascimento', rotulo: 'Data de nascimento', tipo: 'data', idadeMinima: 18, obrigatorio: true, largura: 'meia' },
      { id: 'estadoCivil', rotulo: 'Estado civil', tipo: 'lista', opcoes: ['Solteiro(a)', 'Casado(a)', 'União estável', 'Divorciado(a)', 'Separado(a)', 'Viúvo(a)'], obrigatorio: true, largura: 'meia' },
      { id: 'conjugeCpf', rotulo: 'CPF do cônjuge', tipo: 'cpf', obrigatorio: true, largura: 'meia', mostrar: CASADO },
      { id: 'conjugeNome', rotulo: 'Nome do cônjuge', tipo: 'texto', obrigatorio: true, largura: 'meia', mostrar: CASADO },
      { id: 'email', rotulo: 'E-mail', tipo: 'email', obrigatorio: true, largura: 'meia' },
      { id: 'telefone', rotulo: 'Celular com DDD', tipo: 'tel', obrigatorio: true, largura: 'meia' },
      { id: 'rg', rotulo: 'RG', tipo: 'texto', obrigatorio: true, largura: 'meia' },
      { id: 'orgaoEmissor', rotulo: 'Órgão emissor', tipo: 'texto', obrigatorio: true, largura: 'meia' },
      { id: 'dataEmissao', rotulo: 'Data de emissão', tipo: 'data', depoisDe: 'nascimento', obrigatorio: true, largura: 'meia' },
      { id: 'cidadeNascimento', rotulo: 'Cidade de nascimento', tipo: 'texto', obrigatorio: true, largura: 'meia' },
      { id: 'nomeMae', rotulo: 'Nome da mãe', tipo: 'texto', obrigatorio: true, largura: 'meia' },
      { id: 'profissao', rotulo: 'Profissão', tipo: 'texto', obrigatorio: true, largura: 'meia' },
      { id: 'cargo', rotulo: 'Cargo', tipo: 'texto', largura: 'meia' },
      { id: 'renda', rotulo: 'Renda mensal (R$)', tipo: 'moeda', obrigatorio: true, largura: 'meia' }
    ] },
    { id: 'endereco', grupo: 'Endereço', campos: [
      { id: 'cep', rotulo: 'CEP', tipo: 'cep', obrigatorio: true, largura: 'meia' },
      { id: 'uf', rotulo: 'UF', tipo: 'lista', opcoes: UFS, obrigatorio: true, largura: 'meia' },
      { id: 'logradouro', rotulo: 'Endereço (rua, avenida)', tipo: 'texto', obrigatorio: true },
      { id: 'numero', rotulo: 'Número', tipo: 'texto', obrigatorio: true, largura: 'meia' },
      { id: 'complemento', rotulo: 'Complemento', tipo: 'texto', largura: 'meia' },
      { id: 'bairro', rotulo: 'Bairro', tipo: 'texto', obrigatorio: true, largura: 'meia' },
      { id: 'cidade', rotulo: 'Cidade', tipo: 'texto', obrigatorio: true, largura: 'meia' }
    ] },
    { id: 'bancarios', grupo: 'Dados bancários (para futuros depósitos)', campos: [
      { id: 'banco', rotulo: 'Banco', tipo: 'texto', sugestoes: BANCOS, obrigatorio: true },
      { id: 'agencia', rotulo: 'Agência', tipo: 'texto', obrigatorio: true, largura: 'meia' },
      { id: 'conta', rotulo: 'Conta (com dígito)', tipo: 'texto', obrigatorio: true, largura: 'meia' }
    ] },
    // Grupo e cota são definidos depois, na assinatura do termo
    { id: 'pagamento', grupo: 'Pagamento', campos: [
      { id: 'vencimento', rotulo: 'Dia de vencimento', tipo: 'lista', opcoes: ['5', '10', '15', '20', '25'], largura: 'meia' },
      { id: 'pagamento', rotulo: 'Pagamento da 1ª parcela', tipo: 'lista', opcoes: ['Boleto', 'PIX', 'Cartão de crédito', 'Débito em conta'], largura: 'meia' }
    ] },
    { id: 'consultor', grupo: 'Consultor responsável', campos: [
      { id: 'consultorNome', rotulo: 'Nome do consultor', tipo: 'texto', obrigatorio: true, largura: 'meia', lembrar: true },
      { id: 'consultorEmail', rotulo: 'E-mail do consultor', tipo: 'email', obrigatorio: true, largura: 'meia', lembrar: true },
      { id: 'observacoes', rotulo: 'Observações para o pós-venda', tipo: 'area' }
    ] }
  ];
  const TODOS = CAMPOS_ADESAO.flatMap((g) => g.campos);
  const campoPorId = (id) => TODOS.find((c) => c.id === id);

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
  /** CNPJ com dígitos verificadores válidos. */
  function cnpjValido(t) {
    const d = digitos(t);
    if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
    const dv = (n) => {
      const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      const r = pesos.reduce((a, p, i) => a + p * Number(d[i]), 0) % 11;
      return r < 2 ? 0 : 11 - r;
    };
    return dv(12) === Number(d[12]) && dv(13) === Number(d[13]);
  }
  const emailValido = (t) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(t || '').trim());

  function mascara(tipo, t) {
    const d = digitos(t);
    if (tipo === 'cpf') {
      const x = d.slice(0, 11);
      return x.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1-$2');
    }
    if (tipo === 'cnpj') {
      const x = d.slice(0, 14);
      return x.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
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
    if (tipo === 'inteiro') return d.slice(0, 3);
    if (tipo === 'percentual') {
      // Só dígitos e uma vírgula, com até 2 casas
      const [int, ...dec] = String(t || '').replace(/\./g, ',').replace(/[^\d,]/g, '').split(',');
      return int.slice(0, 2) + (dec.length ? ',' + dec.join('').slice(0, 2) : '');
    }
    return t;
  }

  /** Data ISO (aaaa-mm-dd) válida, a partir de 1900 e não futura; senão null. */
  function lerData(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m || Number(m[1]) < 1900) return null;
    const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return dt.getMonth() === Number(m[2]) - 1 && dt <= new Date() ? dt : null;
  }

  /** Mensagem de erro do campo (ou '' quando está certo). dados: o formulário inteiro, para as regras entre campos. */
  function erroCampo(c, v, dados) {
    const t = String(v == null ? '' : v).trim();
    if (!t) return c.obrigatorio ? 'Campo obrigatório.' : '';
    if (c.tipo === 'cpf' && !cpfValido(t)) return 'CPF inválido.';
    if (c.tipo === 'cnpj' && !cnpjValido(t)) return 'CNPJ inválido.';
    if (c.tipo === 'email' && !emailValido(t)) return 'E-mail inválido.';
    if (c.tipo === 'cep' && digitos(t).length !== 8) return 'CEP com 8 dígitos.';
    if (c.tipo === 'tel' && digitos(t).length < 10) return 'Telefone com DDD.';
    if (c.tipo === 'moeda' && c.obrigatorio && !Number(digitos(t))) return 'Informe o valor.';
    if (c.tipo === 'inteiro') {
      const n = Number(t);
      if (!/^\d+$/.test(t) || n < (c.min || 0) || (c.max && n > c.max)) return 'Informe um número de ' + (c.min || 0) + ' a ' + c.max + '.';
    }
    if (c.tipo === 'percentual') {
      const n = Number(t.replace(',', '.'));
      if (!/^\d+(,\d{1,2})?$/.test(t) || n >= 100) return 'Percentual de 0 a 99,99.';
    }
    if (c.tipo === 'data') {
      const dt = lerData(t);
      if (!dt) return 'Data inválida.';
      if (c.idadeMinima) {
        const hoje = new Date();
        const idade = hoje.getFullYear() - dt.getFullYear() - (hoje < new Date(hoje.getFullYear(), dt.getMonth(), dt.getDate()) ? 1 : 0);
        if (idade < c.idadeMinima) return 'O consorciado precisa ter ' + c.idadeMinima + ' anos ou mais.';
      }
      const antes = c.depoisDe && dados ? lerData(dados[c.depoisDe]) : null;
      if (antes && dt < antes) return 'Data anterior à ' + campoPorId(c.depoisDe).rotulo.toLowerCase() + '.';
    }
    return '';
  }

  /** Endereço numa linha: "Rua, número – complemento – bairro – cidade/UF – CEP". */
  function enderecoCompleto(d) {
    const t = (x) => String(x || '').trim();
    const rua = [t(d.logradouro), t(d.numero)].filter(Boolean).join(', ');
    const partes = [rua, t(d.complemento), t(d.bairro), [t(d.cidade), t(d.uf)].filter(Boolean).join('/')].filter(Boolean);
    return partes.join(' – ') + (t(d.cep) ? (partes.length ? ' – ' : '') + 'CEP ' + t(d.cep) : '');
  }

  /** Resposta da busca de CEP (ViaCEP ou BrasilAPI) → { logradouro, bairro, cidade, uf }, ou null se o CEP não existe. */
  function enderecoDoCep(j) {
    if (!j || j.erro === true || j.erro === 'true') return null;
    const e = { logradouro: j.logradouro || j.street || '', bairro: j.bairro || j.neighborhood || '', cidade: j.localidade || j.city || '', uf: j.uf || j.state || '' };
    return e.cidade || e.uf ? e : null;
  }

  const visivel = (c, dados) => !c.mostrar || c.mostrar.valores.includes(dados[c.mostrar.campo]);
  const ehPJ = (dados) => dados.tipoPessoa === 'Jurídica';
  const nomeGrupo = (g, dados) => (ehPJ(dados) && g.grupoPJ ? g.grupoPJ : g.grupo);
  const dataBr = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? m[3] + '/' + m[2] + '/' + m[1] : iso || ''; };
  /** Rótulo e valor no PDF e no e-mail: a unidade sai do rótulo e vai para o valor ("Prazo: 240 meses"). */
  const rotuloSaida = (c) => c.rotulo.replace(/\s*\((R\$|%|meses)\)$/, '');
  function valorTexto(c, v) {
    const t = String(v == null ? '' : v).trim();
    if (c.tipo === 'data') return dataBr(t);
    if (c.tipo === 'percentual') return t + '%' + (Number(t.replace(',', '.')) === 0 ? ' (sem redutor)' : '');
    if (c.tipo === 'inteiro' && /\(meses\)$/.test(c.rotulo)) return t + ' meses';
    return t;
  }

  /** Valor vindo da simulação no formato do campo (moeda em R$, percentual com vírgula). */
  function valorInicial(c, v) {
    if (v == null || v === '' || (typeof v === 'number' && !isFinite(v))) return '';
    if (typeof v !== 'number') return String(v);
    if (c.tipo === 'moeda') return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if (c.tipo === 'percentual') return String(Math.round(v * 100) / 100).replace('.', ',');
    if (c.tipo === 'inteiro') return String(Math.round(v));
    return String(v);
  }

  function Adesao(ui) {
    const esc = ui.esc;
    const CHAVE_CONSULTOR = 'simconsorcio.consultor';
    // Dados digitados ficam só na memória desta aba (não são gravados no navegador: são dados pessoais do cliente).
    // O rascunho é do cliente para quem foi aberto (nome + celular da proposta); outro cliente começa do zero.
    let rascunho = {};
    let rascunhoDe = '';
    function limpar() { rascunho = {}; rascunhoDe = ''; }

    function lembrados() {
      try { return JSON.parse(localStorage.getItem(CHAVE_CONSULTOR) || '{}') || {}; } catch (e) { return {}; }
    }
    function lembrar(dados) {
      const l = {};
      TODOS.forEach((c) => { if (c.lembrar) l[c.id] = dados[c.id] || ''; });
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
        const modo = { cpf: 'numeric', cnpj: 'numeric', cep: 'numeric', moeda: 'numeric', inteiro: 'numeric', percentual: 'decimal', tel: 'tel' }[c.tipo];
        input = '<input type="' + tipoHtml + '"' + comum + (modo ? ' inputmode="' + modo + '"' : '') + ' value="' + esc(v || '') + '" autocomplete="off" maxlength="120"' +
          (c.tipo === 'data' ? ' max="' + new Date().toISOString().slice(0, 10) + '"' : '') + (c.sugestoes ? ' list="ad-lista-' + c.id + '"' : '') + '>';
        if (c.sugestoes) input += '<datalist id="ad-lista-' + c.id + '">' + c.sugestoes.map((o) => '<option value="' + esc(o) + '"></option>').join('') + '</datalist>';
      }
      const status = c.tipo === 'cep' ? '<small class="ad-status" aria-live="polite">O endereço é preenchido pelo CEP.</small>' : '';
      return '<label class="f ad-campo' + (c.largura === 'meia' ? ' meia' : '') + '"' + (c.mostrar ? ' data-ad-mostrar="' + c.id + '"' : '') + '><span>' + esc(c.rotulo) + req + '</span>' + input + status + '<small class="ad-erro" aria-live="polite"></small></label>';
    }

    function formularioHtml(dados, resumo) {
      let h = '<h2>Finalizar venda</h2><p class="nota">Ficha de cadastro para o termo de adesão. Uso interno: ao concluir, o PDF "Termo de cadastro de consórcio" (com data e hora da emissão) é baixado para você encaminhar ao pós-venda. O cliente não recebe este documento.</p>';
      h += '<details class="ad-resumo"><summary>Resumo da simulação</summary><dl>' + resumo.map(([k, v]) => '<div><dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd></div>').join('') + '</dl></details>';
      h += '<form class="ad-form" novalidate>' + CAMPOS_ADESAO.map((g) => '<fieldset class="ad-grupo" data-ad-grupo="' + g.id + '"><legend>' + esc(g.grupo) + '</legend>' +
        (g.id === 'fechamento' ? '<p class="nota ad-nota">Tipo de pessoa, tipo da carta, prazo, valor, redutor e seguro vêm da simulação em tela; confira antes de concluir.</p>' : '') +
        '<div class="ad-grade">' + g.campos.map((c) => campoHtml(c, dados[c.id])).join('') + '</div></fieldset>').join('') + '</form>';
      return h;
    }

    function lerFormulario(raiz) {
      const dados = {};
      raiz.querySelectorAll('[data-ad]').forEach((el) => { dados[el.dataset.ad] = el.value; });
      return dados;
    }

    function atualizarCondicionais(raiz) {
      const dados = lerFormulario(raiz);
      TODOS.forEach((c) => {
        if (!c.mostrar) return;
        const el = raiz.querySelector('[data-ad-mostrar="' + c.id + '"]');
        if (el) el.hidden = !visivel(c, dados);
      });
      // Grupo sem nenhum campo visível some (dados da empresa só para pessoa jurídica); o nome do grupo segue o tipo de pessoa
      CAMPOS_ADESAO.forEach((g) => {
        const fs = raiz.querySelector('[data-ad-grupo="' + g.id + '"]');
        if (!fs) return;
        fs.hidden = g.campos.every((c) => !visivel(c, dados));
        fs.querySelector('legend').textContent = nomeGrupo(g, dados);
      });
    }

    function marcarErro(el, msg) {
      el.classList.toggle('campo-erro', !!msg);
      el.setAttribute('aria-invalid', msg ? 'true' : 'false');
      el.closest('.ad-campo').querySelector('.ad-erro').textContent = msg;
    }

    /** Valida o formulário, marca os campos com erro e devolve se está tudo certo. */
    function validarFormulario(raiz) {
      const dados = lerFormulario(raiz);
      let primeiro = null;
      TODOS.forEach((c) => {
        const el = raiz.querySelector('#ad-' + c.id);
        if (!el) return;
        const msg = visivel(c, dados) ? erroCampo(c, dados[c.id], dados) : '';
        marcarErro(el, msg);
        if (msg && !primeiro) primeiro = el;
      });
      if (primeiro) primeiro.focus();
      return !primeiro;
    }

    // -------------------------------------------------------------------------
    // Busca do endereço pelo CEP (ViaCEP; se falhar, BrasilAPI)
    // -------------------------------------------------------------------------

    async function consultarCep(cep) {
      try {
        return enderecoDoCep(await ui.lerJson('https://viacep.com.br/ws/' + cep + '/json/'));
      } catch (e) {
        try {
          return enderecoDoCep(await ui.lerJson('https://brasilapi.com.br/api/cep/v1/' + cep));
        } catch (e2) {
          if (/HTTP 404/.test(String(e2 && e2.message))) return null; // CEP inexistente
          throw e2;
        }
      }
    }

    async function buscarCep(raiz, cep) {
      const campoCep = raiz.querySelector('#ad-cep');
      const status = campoCep.closest('.ad-campo').querySelector('.ad-status');
      status.textContent = 'Buscando o endereço…';
      let end;
      try {
        end = await consultarCep(cep);
      } catch (e) {
        if (digitos(campoCep.value) === cep) status.textContent = 'Sem conexão para buscar o CEP: preencha o endereço.';
        return;
      }
      if (digitos(campoCep.value) !== cep || !raiz.isConnected) return; // o CEP mudou durante a busca
      if (!end) { status.textContent = 'CEP não encontrado: confira o número ou preencha o endereço.'; return; }
      Object.entries(end).forEach(([k, v]) => {
        const el = raiz.querySelector('#ad-' + k);
        if (!el || !v) return;
        el.value = v;
        marcarErro(el, '');
      });
      status.textContent = 'Endereço preenchido pelo CEP: confira e informe o número.';
      const numero = raiz.querySelector('#ad-numero');
      if (numero && !numero.value) numero.focus();
    }

    // -------------------------------------------------------------------------
    // Saída: PDF interno "Termo de cadastro de consórcio"
    // -------------------------------------------------------------------------

    function linhasGrupo(g, dados) {
      if (g.id === 'endereco') { const e = enderecoCompleto(dados); return e ? [['Endereço completo', e]] : []; }
      return g.campos.filter((c) => c.id !== 'observacoes' && visivel(c, dados) && String(dados[c.id] || '').trim()).map((c) => [rotuloSaida(c), valorTexto(c, dados[c.id])]);
    }

    /** Blocos da ficha: topo com a emissão, grupos preenchidos, observações e o resumo da simulação. */
    function blocosPdf(dados, resumo, emissao) {
      const dl = (pares) => '<dl class="pdf-carac">' + pares.map(([k, v]) => '<div><dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd></div>').join('') + '</dl>';
      const pj = ehPJ(dados);
      const blocos = ['<header class="pdf-topo">' + (ui.LOGO.claro ? '<img class="pdf-logo" src="' + ui.LOGO.claro + '" alt="' + esc(ui.EMPRESA) + '">' : '') +
        '<p class="eyebrow">Termo de cadastro · uso interno</p><h1>Cadastro de <span class="acento">Consórcio</span></h1>' +
        '<p class="pdf-cliente">' + esc(pj ? dados.razaoSocial : dados.nome) + '</p>' + (pj ? '<p class="pdf-ident">Representante legal: ' + esc(dados.nome) + '</p>' : '') +
        '<p class="pdf-ident pdf-emissao">Ficha emitida em <b>' + esc(emissao.texto) + '</b> · ' + esc(dados.consultorNome || '') + '</p></header>'];
      CAMPOS_ADESAO.forEach((g) => {
        const pares = linhasGrupo(g, dados);
        if (pares.length) blocos.push('<div class="pdf-bloco"><h2 class="pdf-h2">' + esc(nomeGrupo(g, dados)) + '</h2>' + dl(pares) + '</div>');
      });
      if (String(dados.observacoes || '').trim()) blocos.push('<div class="pdf-bloco"><h2 class="pdf-h2">Observações</h2><p class="pdf-ident">' + esc(dados.observacoes) + '</p></div>');
      blocos.push('<div class="pdf-bloco"><h2 class="pdf-h2">Resumo da <span class="acento">Simulação</span></h2>' + dl(resumo) + '</div>');
      return blocos;
    }

    /** Distribui os blocos em páginas A4 medindo cada um no tamanho final (como a proposta da carta contemplada). */
    async function pdfHtml(dados, resumo, emissao) {
      const blocos = blocosPdf(dados, resumo, emissao);
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const area = document.createElement('div');
      area.className = 'pdf-render pdf-medida';
      area.innerHTML = '<section class="pdf-pagina"><div class="pdf-corpo">' + blocos.map((b) => '<div class="pdf-item">' + b + '</div>').join('') + '</div></section>';
      document.body.appendChild(area);
      let util, gap, alturas;
      try {
        const pg = area.querySelector('.pdf-pagina');
        const cs = getComputedStyle(pg);
        util = (pg.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) * 0.994;
        gap = parseFloat(getComputedStyle(area.querySelector('.pdf-corpo')).rowGap) || 0;
        alturas = Array.from(area.querySelectorAll('.pdf-corpo > .pdf-item')).map((el) => el.getBoundingClientRect().height);
      } finally {
        area.remove();
      }
      const paginas = [];
      let atual = [], usado = 0;
      blocos.forEach((b, i) => {
        if (atual.length && usado + gap + alturas[i] > util) { paginas.push(atual); atual = []; usado = 0; }
        usado += (atual.length ? gap : 0) + alturas[i];
        atual.push(b);
      });
      if (atual.length) paginas.push(atual);
      return paginas.map((p, i) => '<section class="pdf-pagina"><div class="pdf-corpo">' + p.map((b) => '<div class="pdf-item">' + b + '</div>').join('') + '</div>' +
        '<footer class="pdf-rodape"><span>Emitida em ' + esc(emissao.texto) + '</span>' + (ui.LOGO.claro ? '<img class="pdf-logo-rodape" src="' + ui.LOGO.claro + '" alt="' + esc(ui.EMPRESA) + '">' : '') +
        '<span>Uso interno · ' + (i + 1) + ' / ' + paginas.length + '</span></footer></section>').join('');
    }

    /** Nome do arquivo: Termo_Cadastro_Consorcio_<cliente>_<administradora>.pdf */
    function nomeArquivoTermo(dados, resumo) {
      const adm = (resumo.find(([k]) => k === 'Administradora') || [])[1];
      const partes = ['Termo_Cadastro_Consorcio', ui.nomeArquivo(ehPJ(dados) ? dados.razaoSocial : dados.nome)];
      if (adm && adm !== '—') partes.push(ui.nomeArquivo(adm));
      return partes.join('_') + '.pdf';
    }

    /** Gera o PDF da ficha (com data e hora da emissão) e baixa o arquivo; o consultor encaminha ao pós-venda. */
    async function finalizar(dados, resumo) {
      const agora = new Date();
      const data = agora.toLocaleDateString('pt-BR');
      const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const emissao = { data, hora, texto: data + ' às ' + hora };
      const blob = await ui.gerarPdfArquivo(await pdfHtml(dados, resumo, emissao));
      await ui.baixarArquivo(blob, nomeArquivoTermo(dados, resumo));
    }

    /**
     * Abre o formulário. cliente: { nome, telefone }; resumo: pares [rótulo, valor] da simulação em tela;
     * proposta: valores do fechamento vindos da simulação ({ tipoPessoa, tipoCarta, prazo, valorCarta, redutor, seguroPrestamista, estrategia }).
     */
    function abrir(cliente, resumo, proposta) {
      const de = String(cliente.nome || '').trim().toLowerCase() + '|' + digitos(cliente.telefone);
      if (de !== rascunhoDe) { rascunho = {}; rascunhoDe = de; }
      const dados = Object.assign({}, lembrados(), rascunho);
      if (!dados.nome) dados.nome = cliente.nome || '';
      const fone = String(cliente.telefone || '');
      if (!dados.telefone) dados.telefone = [10, 11].includes(digitos(fone).length) ? mascara('tel', fone) : fone;
      // Os campos da simulação seguem o que está em tela; os demais valores da proposta só preenchem o que está vazio
      Object.entries(proposta || {}).forEach(([k, v]) => {
        const c = campoPorId(k);
        const txt = c ? valorInicial(c, v) : '';
        if (txt && (c.proposta || !String(dados[k] || '').trim())) dados[k] = txt;
      });
      let ocupado = false;
      const fundo = ui.janela(formularioHtml(dados, resumo), [
        { texto: 'Cancelar', acao: (f) => { rascunho = lerFormulario(f); } },
        { texto: 'Concluir e baixar termo', primario: true, acao: (f) => {
          if (ocupado) return false;
          rascunho = lerFormulario(f);
          if (!validarFormulario(f)) { ui.avisar('Confira os campos destacados.'); return false; }
          const lidos = lerFormulario(f);
          lembrar(lidos);
          ocupado = true;
          finalizar(lidos, resumo).then(() => {
            rascunho = {};
            f.remove();
            ui.agradecer(); // tela de agradecimento e, em seguida, o site
          }).catch((e) => {
            ocupado = false;
            ui.avisar(e && e.code === 'declined' ? 'Download cancelado.' : 'Não foi possível baixar o PDF do termo. Tente de novo.');
          });
          return false;
        } }
      ], true);
      fundo.classList.add('sobreposicao-adesao');
      const form = fundo.querySelector('.ad-form');
      let cepBuscado = digitos(dados.cep);
      form.addEventListener('input', (ev) => {
        const el = ev.target;
        const c = campoPorId(el.dataset.ad);
        if (c && ['cpf', 'cnpj', 'cep', 'tel', 'moeda', 'inteiro', 'percentual'].includes(c.tipo)) el.value = mascara(c.tipo, el.value);
        if (el.classList.contains('campo-erro')) marcarErro(el, '');
        if (c && c.tipo === 'cep') {
          const d = digitos(el.value);
          if (d.length === 8 && d !== cepBuscado) { cepBuscado = d; buscarCep(fundo, d); }
          else if (d.length < 8) cepBuscado = '';
        }
      });
      form.addEventListener('change', () => atualizarCondicionais(fundo));
      atualizarCondicionais(fundo);
      const primeiro = fundo.querySelector('[data-ad]');
      if (primeiro) primeiro.focus({ preventScroll: true });
    }

    return { abrir, limpar, CAMPOS_ADESAO, cpfValido, cnpjValido, emailValido, erroCampo };
  }

  if (typeof window !== 'undefined') window.Adesao = Adesao;
  // Exposto para testes (Node)
  if (typeof module !== 'undefined' && module.exports) module.exports = { cpfValido, cnpjValido, emailValido, erroCampo, mascara, enderecoCompleto, enderecoDoCep, valorInicial, CAMPOS_ADESAO };
})();

/* Acesso ao simulador: tela de senha na entrada e travas contra salvar, imprimir ou copiar a página.
 * A senha é conferida pelo resumo SHA-256 em js/config.js (senhaAcessoHash, gerado por npm run senha).
 * No arquivo protegido (npm run build:protegido) a senha já é pedida antes de abrir o conteúdo
 * criptografado: ali window.ACESSO_LIBERADO vem marcado e esta tela não aparece de novo. */
(function () {
  'use strict';

  const PREFIXO = 'glb-simulador:';

  // ---------------------------------------------------------------------------
  // SHA-256 (WebCrypto quando disponível; senão, implementação em JavaScript)
  // ---------------------------------------------------------------------------

  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  function sha256Js(texto) {
    const msg = Array.from(new TextEncoder().encode(texto));
    const bits = msg.length * 8;
    msg.push(0x80);
    while (msg.length % 64 !== 56) msg.push(0);
    for (let i = 7; i >= 0; i--) msg.push(i > 3 ? 0 : (bits >>> (i * 8)) & 0xff);
    const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const rot = (x, n) => (x >>> n) | (x << (32 - n));
    const w = new Array(64);
    for (let b = 0; b < msg.length; b += 64) {
      for (let i = 0; i < 16; i++) w[i] = (msg[b + 4 * i] << 24) | (msg[b + 4 * i + 1] << 16) | (msg[b + 4 * i + 2] << 8) | msg[b + 4 * i + 3];
      for (let i = 16; i < 64; i++) {
        const s0 = rot(w[i - 15], 7) ^ rot(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rot(w[i - 2], 17) ^ rot(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      let [a, bb, c, d, e, f, g, hh] = h;
      for (let i = 0; i < 64; i++) {
        const t1 = (hh + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
        const t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & bb) ^ (a & c) ^ (bb & c))) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
      }
      [a, bb, c, d, e, f, g, hh].forEach((v, i) => { h[i] = (h[i] + v) | 0; });
    }
    return h.map((v) => (v >>> 0).toString(16).padStart(8, '0')).join('');
  }

  async function sha256(texto) {
    const sutil = typeof crypto !== 'undefined' && crypto.subtle && (typeof window === 'undefined' || window.isSecureContext);
    if (!sutil) return sha256Js(texto);
    const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
    return Array.from(new Uint8Array(d)).map((x) => x.toString(16).padStart(2, '0')).join('');
  }
  const resumoSenha = (senha) => sha256(PREFIXO + String(senha || '').trim());

  // Exposto para testes e para o build (Node)
  if (typeof module !== 'undefined' && module.exports) { module.exports = { sha256Js, PREFIXO }; return; }

  // ---------------------------------------------------------------------------
  // Travas: sem salvar (Ctrl+S), ver código (Ctrl+U), imprimir (Ctrl+P), ferramentas do desenvolvedor,
  // botão direito, arrastar e cópia de texto fora dos campos
  // ---------------------------------------------------------------------------

  const editavel = (el) => !!(el && el.closest && el.closest('input, textarea, select, [contenteditable="true"]'));
  document.addEventListener('contextmenu', (e) => { if (!editavel(e.target)) e.preventDefault(); });
  ['copy', 'cut'].forEach((t) => document.addEventListener(t, (e) => { if (!editavel(document.activeElement)) e.preventDefault(); }));
  document.addEventListener('dragstart', (e) => { if (!editavel(e.target)) e.preventDefault(); });
  document.addEventListener('keydown', (e) => {
    const k = String(e.key || '').toLowerCase();
    const mod = e.ctrlKey || e.metaKey;
    const bloquear = e.key === 'F12' || (mod && ['s', 'u', 'p'].includes(k)) ||
      (mod && e.shiftKey && ['i', 'j', 'c', 'k'].includes(k)) || (e.metaKey && e.altKey && ['i', 'j', 'c', 'u'].includes(k));
    if (bloquear) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  document.documentElement.classList.add('sem-selecao');

  // ---------------------------------------------------------------------------
  // Tela de senha na entrada
  // ---------------------------------------------------------------------------

  const cfg = window.CONFIG_SIMULADOR || {};
  const alvo = String(cfg.senhaAcessoHash || '').trim().toLowerCase();
  if (window.ACESSO_LIBERADO || !alvo) return;

  document.documentElement.classList.add('acesso-pendente');
  const logo = window.LOGO_MARCA || {};
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const versao = String(cfg.versao || '').trim();
  const tela = document.createElement('div');
  tela.className = 'tela-acesso';
  tela.setAttribute('role', 'dialog');
  tela.setAttribute('aria-modal', 'true');
  tela.setAttribute('aria-labelledby', 'acesso-rotulo');
  tela.innerHTML = '<form class="tela-acesso-caixa" novalidate>' +
    (logo.escuro ? '<img class="logo logo-escuro" src="' + logo.escuro + '" alt="' + esc(cfg.empresa || '') + '">' : '') +
    (logo.claro ? '<img class="logo logo-claro" src="' + logo.claro + '" alt="' + esc(cfg.empresa || '') + '">' : '') +
    '<p class="tela-acesso-versao">Simulador' + (versao ? ' · versão ' + esc(versao) : '') + '</p>' +
    '<label for="acesso-senha" id="acesso-rotulo">Senha de acesso</label>' +
    '<input type="password" id="acesso-senha" inputmode="numeric" autocomplete="off" required>' +
    '<button type="submit" class="primario">Entrar</button>' +
    '<p class="tela-acesso-msg" role="alert" aria-live="assertive"></p>' +
    '<p class="tela-acesso-nota">Uso exclusivo da equipe ' + esc(cfg.empresa || '') + '.</p></form>';
  document.body.appendChild(tela);
  const form = tela.querySelector('form'), campo = tela.querySelector('input'), msg = tela.querySelector('.tela-acesso-msg'), botao = tela.querySelector('button');
  let erros = 0, esperaAte = 0;
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (Date.now() < esperaAte) { msg.textContent = 'Muitas tentativas: aguarde alguns segundos.'; return; }
    if (!campo.value.trim()) { msg.textContent = 'Informe a senha.'; campo.focus(); return; }
    botao.disabled = true;
    const ok = (await resumoSenha(campo.value)) === alvo;
    botao.disabled = false;
    if (ok) {
      tela.remove();
      document.documentElement.classList.remove('acesso-pendente');
      return;
    }
    erros++;
    if (erros >= 5) { erros = 0; esperaAte = Date.now() + 30000; msg.textContent = 'Senha incorreta. Muitas tentativas: aguarde 30 segundos.'; }
    else msg.textContent = 'Senha incorreta.';
    campo.value = '';
    campo.focus();
  });
  campo.focus();
})();

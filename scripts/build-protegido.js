// Gera o arquivo do simulador para distribuir à equipe, protegido por senha:
//   SIMULADOR_SENHA=1234 npm run build:protegido      (ou: npm run build:protegido -- --senha=1234)
//
// Todo o simulador (HTML, CSS e JS, com as bibliotecas do PDF, para funcionar sem internet) é compactado e
// criptografado com AES-256-GCM, com a chave derivada da senha por PBKDF2-SHA256. O arquivo só traz em texto
// a tela de acesso: sem a senha, não há como ver nem usar o simulador. Depois da validade da versão
// (js/config.js: validadeVersao) a tela de acesso não abre mais o arquivo; versão e validade entram na
// autenticação da criptografia, então editar a data no arquivo impede que ele abra.
// A senha não fica gravada em lugar nenhum: guarde-a e passe à equipe por outro canal. Senhas curtas
// (como 4 dígitos) podem ser descobertas por tentativa com ferramentas próprias: prefira 8+ caracteres.
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { montar, config, raiz, lerBase64 } = require('./montar');

const ITERACOES = 600000;
const argSenha = (process.argv.slice(2).find((a) => a.startsWith('--senha=')) || '').slice(8);
const senha = String(argSenha || process.env.SIMULADOR_SENHA || '').trim();
if (!/^\S{4,64}$/.test(senha)) {
  console.error('Informe a senha de acesso (4 a 64 caracteres, sem espaços), por exemplo:\n  SIMULADOR_SENHA=1234 npm run build:protegido\n  npm run build:protegido -- --senha=1234');
  process.exit(1);
}
const senhaFraca = senha.length < 8 || /^\d+$/.test(senha);
const cfg = config();
const versao = String(cfg.versao || '').trim();
const validade = String(cfg.validadeVersao || '').trim();
const dataValida = (t) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t); if (!m) return false; const d = new Date(+m[1], +m[2] - 1, +m[3]); return d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3]; };
if (validade && !dataValida(validade)) { console.error('validadeVersao em js/config.js deve ser uma data válida (aaaa-mm-dd).'); process.exit(1); }

// Conteúdo do simulador: compactado e criptografado (a etiqueta do GCM vai no fim, como o WebCrypto espera)
const m = montar({ pdfEmbutido: true });
const conteudo = zlib.gzipSync(Buffer.from(JSON.stringify({ css: m.css, corpo: m.corpo, scripts: m.scripts }), 'utf8'), { level: 9 });
const sal = crypto.randomBytes(16);
const iv = crypto.randomBytes(12);
const chave = crypto.pbkdf2Sync(senha, sal, ITERACOES, 32, 'sha256');
// Versão e validade autenticadas junto com o conteúdo (dados adicionais do GCM): alterar a data no arquivo
// faz a abertura falhar, mesmo com a senha certa
const autenticado = JSON.stringify({ versao, validade });
const cifra = crypto.createCipheriv('aes-256-gcm', chave, iv);
cifra.setAAD(Buffer.from(autenticado, 'utf8'));
const cifrado = Buffer.concat([cifra.update(conteudo), cifra.final(), cifra.getAuthTag()]);

const PARAMS = { versao, validade, sal: sal.toString('base64'), iv: iv.toString('base64'), iteracoes: ITERACOES, numerica: /^\d+$/.test(senha) };

const estiloAcesso = `
:root{--fundo:#000;--cartao:#111;--texto:#F7F5F2;--suave:#A39E99;--borda:rgba(255,255,255,.14);--laranja:#F05A00;--botao:#CC4800;--destaque:#FF7A2E;--erro:#FF6B6B;color-scheme:dark}
@media (prefers-color-scheme: light){:root{--fundo:#ECE9E5;--cartao:#FFF;--texto:#201E1E;--suave:#67615C;--borda:rgba(32,30,30,.14);--destaque:#B03D00;--erro:#B83232;color-scheme:light}}
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;background:var(--fundo);color:var(--texto);font-family:"Klavika","Titillium Web","Segoe UI",Roboto,Arial,sans-serif}
.acesso{min-height:100vh;display:grid;place-items:center;padding:24px;background-image:radial-gradient(60% 50% at 50% 35%,rgba(240,90,0,.14),transparent 70%)}
.acesso-caixa{width:100%;max-width:380px;padding:32px 28px;border-radius:24px;border:1px solid var(--borda);background:var(--cartao);text-align:center;box-shadow:0 30px 60px -20px rgba(0,0,0,.45)}
.acesso-logo{width:190px;margin:0 auto 6px;display:block}
.acesso-logo.claro{display:none}
@media (prefers-color-scheme: light){.acesso-logo.escuro{display:none}.acesso-logo.claro{display:block}}
.acesso-versao{margin:0 0 22px;font-size:.8rem;color:var(--suave)}
.acesso label{display:block;margin:0 0 8px;font-size:.9rem;color:var(--suave)}
.acesso input{width:100%;height:52px;border-radius:14px;border:1px solid var(--borda);background:transparent;color:var(--texto);font-size:1.35rem;letter-spacing:.3em;text-align:center;font-variant-numeric:tabular-nums}
.acesso input:focus{outline:none;border-color:var(--laranja);box-shadow:0 0 0 3px rgba(240,90,0,.3)}
.acesso button{width:100%;height:46px;margin-top:14px;border:0;border-radius:999px;background:var(--botao);color:#fff;font:inherit;font-weight:600;font-size:1rem;cursor:pointer}
.acesso button:disabled{opacity:.6;cursor:wait}
.acesso button:focus-visible{outline:3px solid var(--destaque);outline-offset:3px}
.acesso-msg{min-height:1.4em;margin:12px 0 0;font-size:.88rem;color:var(--erro)}
.acesso-nota{margin:16px 0 0;font-size:.75rem;color:var(--suave)}
`;

// Tela de acesso: abre o conteúdo com a senha, verifica a validade e liga as travas contra cópia
function carregador(P) {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const form = $('acesso-form'), campo = $('acesso-senha'), msg = $('acesso-msg'), botao = form.querySelector('button');
  const bloquear = (texto) => { msg.textContent = texto; campo.disabled = true; botao.disabled = true; };
  if (P.validade) {
    const fim = new Date(P.validade + 'T23:59:59');
    if (new Date() > fim) {
      bloquear('Esta versão' + (P.versao ? ' (' + P.versao + ')' : '') + ' expirou em ' + fim.toLocaleDateString('pt-BR') + '. Peça a versão atual ao responsável.');
      return;
    }
  }
  if (!window.isSecureContext) {
    bloquear('Abra o arquivo direto do computador (duplo clique) ou por um endereço https.');
    return;
  }
  if (!(window.crypto && crypto.subtle && window.DecompressionStream && window.TextEncoder)) {
    bloquear('Navegador sem suporte. Abra o arquivo no Google Chrome ou no Microsoft Edge atualizados.');
    return;
  }
  const bytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  async function abrir(senha) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveKey']);
    const chave = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: bytes(P.sal), iterations: P.iteracoes, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const autenticado = new TextEncoder().encode(JSON.stringify({ versao: P.versao, validade: P.validade }));
    const claro = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(P.iv), additionalData: autenticado }, chave, bytes($('conteudo').textContent.trim()));
    const fluxo = new Blob([claro]).stream().pipeThrough(new DecompressionStream('gzip'));
    return JSON.parse(await new Response(fluxo).text());
  }
  function proteger() {
    const editavel = (el) => !!(el && el.closest && el.closest('input, textarea, select, [contenteditable="true"]'));
    document.addEventListener('contextmenu', (e) => { if (!editavel(e.target)) e.preventDefault(); });
    ['copy', 'cut'].forEach((t) => document.addEventListener(t, (e) => { if (!editavel(document.activeElement)) e.preventDefault(); }));
    document.addEventListener('dragstart', (e) => { if (!editavel(e.target)) e.preventDefault(); });
    document.addEventListener('keydown', (e) => {
      const k = String(e.key || '').toLowerCase();
      const mod = e.ctrlKey || e.metaKey;
      const fechar = e.key === 'F12' || (mod && (k === 's' || k === 'u')) || (mod && e.shiftKey && ['i', 'j', 'c', 'k'].includes(k)) || (e.metaKey && e.altKey && ['i', 'j', 'c', 'u'].includes(k));
      if (fechar) { e.preventDefault(); e.stopPropagation(); }
    }, true);
    const st = document.createElement('style');
    st.textContent = 'body{-webkit-user-select:none;user-select:none}input,textarea,select,[contenteditable="true"]{-webkit-user-select:text;user-select:text}img{-webkit-user-drag:none}';
    document.head.appendChild(st);
  }
  function iniciar(c) {
    const estilo = document.createElement('style');
    estilo.textContent = c.css;
    document.head.appendChild(estilo);
    $('estilo-acesso').remove();
    // O corpo do simulador substitui a tela de acesso; os scripts rodam e saem da página em seguida
    document.body.innerHTML = c.corpo;
    c.scripts.forEach((codigo) => {
      const el = document.createElement('script');
      el.textContent = codigo;
      document.body.appendChild(el);
      el.remove();
    });
    proteger();
  }
  let erros = 0, esperaAte = 0;
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (Date.now() < esperaAte) { msg.textContent = 'Muitas tentativas: aguarde alguns segundos.'; return; }
    const senha = campo.value.trim();
    if (!senha) { msg.textContent = 'Informe a senha.'; campo.focus(); return; }
    botao.disabled = true;
    msg.textContent = '';
    let conteudo = null;
    try { conteudo = await abrir(senha); } catch (e) { conteudo = null; }
    botao.disabled = false;
    if (!conteudo) {
      erros++;
      if (erros >= 5) { erros = 0; esperaAte = Date.now() + 30000; msg.textContent = 'Senha incorreta. Muitas tentativas: aguarde 30 segundos.'; }
      else msg.textContent = 'Senha incorreta.';
      campo.value = '';
      campo.focus();
      return;
    }
    iniciar(conteudo);
  });
  if (P.numerica) campo.setAttribute('inputmode', 'numeric');
  campo.focus();
}

const logo = (arquivo, cls) => '<img class="acesso-logo ' + cls + '" src="data:image/png;base64,' + lerBase64(arquivo) + '" alt="Grupo Life Brasil">';
const pagina = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
${m.titulo}
${m.fontes}
${m.icone}
<style id="estilo-acesso">${estiloAcesso}</style>
</head>
<body>
<main class="acesso">
  <div class="acesso-caixa">
    ${logo('marca/life-logo-escuro.png', 'escuro')}${logo('marca/life-logo-claro.png', 'claro')}
    <p class="acesso-versao">Simulador${versao ? ' · versão ' + versao : ''}</p>
    <form id="acesso-form" autocomplete="off" novalidate>
      <label for="acesso-senha">Senha de acesso</label>
      <input id="acesso-senha" type="password" autocomplete="off" required>
      <button type="submit">Entrar</button>
      <p class="acesso-msg" id="acesso-msg" role="alert" aria-live="assertive"></p>
    </form>
    <p class="acesso-nota">Uso exclusivo da equipe Grupo Life Brasil.</p>
  </div>
</main>
<script id="conteudo" type="application/octet-stream">${cifrado.toString('base64')}</script>
<script>(${carregador.toString()})(${JSON.stringify(PARAMS)});</script>
</body>
</html>
`;

const nome = 'Simulador_Life' + (versao ? '_v' + versao : '') + '.html';
fs.mkdirSync(path.join(raiz, 'dist'), { recursive: true });
fs.writeFileSync(path.join(raiz, 'dist', nome), pagina);
console.log('dist/' + nome + ' gerado (' + Math.round(pagina.length / 1024) + ' KB)' + (validade ? ', válido até ' + validade.split('-').reverse().join('/') : ''));
if (senhaFraca) console.warn('Atenção: senha curta ou só com números pode ser descoberta por tentativa. Para mais segurança, use 8 ou mais caracteres com letras e números.');

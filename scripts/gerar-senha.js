// Define a senha da tela de acesso do simulador: grava o resumo SHA-256 em js/config.js (senhaAcessoHash).
//   npm run senha -- 1234
// A senha em si não fica gravada. Use a mesma senha no arquivo protegido (SIMULADOR_SENHA=1234 npm run build:protegido).
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PREFIXO } = require('../js/acesso.js');

const senha = String(process.argv[2] || '').trim();
if (!/^\S{4,64}$/.test(senha)) { console.error('Informe a nova senha (4 a 64 caracteres, sem espaços): npm run senha -- 1234'); process.exit(1); }
const arquivo = path.join(__dirname, '..', 'js', 'config.js');
const texto = fs.readFileSync(arquivo, 'utf8');
const hash = crypto.createHash('sha256').update(PREFIXO + senha).digest('hex');
if (!/senhaAcessoHash:\s*'[0-9a-f]*'/.test(texto)) { console.error('Campo senhaAcessoHash não encontrado em js/config.js.'); process.exit(1); }
fs.writeFileSync(arquivo, texto.replace(/senhaAcessoHash:\s*'[0-9a-f]*'/, "senhaAcessoHash: '" + hash + "'"));
console.log('Senha de acesso atualizada em js/config.js.');

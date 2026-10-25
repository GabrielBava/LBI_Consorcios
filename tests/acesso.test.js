'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { sha256Js, PREFIXO } = require('../js/acesso.js');

test('acesso: SHA-256 em JavaScript igual ao do Node (usado quando o WebCrypto não está disponível)', () => {
  for (const t of ['', 'abc', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(64), 'a'.repeat(200), 'ção · R$ 1.000', PREFIXO + '9876']) {
    assert.equal(sha256Js(t), crypto.createHash('sha256').update(t).digest('hex'), JSON.stringify(t.slice(0, 20)));
  }
});

test('acesso: a configuração guarda só o resumo da senha (64 caracteres hexadecimais)', () => {
  const janela = {};
  new Function('window', require('fs').readFileSync(require('path').join(__dirname, '..', 'js', 'config.js'), 'utf8'))(janela);
  assert.match(janela.CONFIG_SIMULADOR.senhaAcessoHash, /^[0-9a-f]{64}$/);
});

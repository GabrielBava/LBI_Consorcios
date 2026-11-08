'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { montar } = require('../scripts/montar.js');

test('build: scripts na ordem e apresentação V1 embutida sem fechar o <script>', () => {
  const m = montar({});
  const apres = m.scripts.find((s) => s.startsWith('window.APRESENTACAO_V1 = '));
  assert.ok(apres, 'apresentação embutida');
  assert.ok(!/<\/script/i.test(apres) && !apres.includes('<'), 'sem "<" literal');
  const janela = {};
  new Function('window', apres)(janela);
  assert.match(janela.APRESENTACAO_V1, /^<!DOCTYPE html>/);
  assert.match(janela.APRESENTACAO_V1, /life-v1:voltar-simulador/, 'a apresentação avisa o simulador ao voltar');
  const i = (trecho) => m.scripts.findIndex((s) => s.includes(trecho));
  assert.ok(i('window.CONFIG_SIMULADOR = {') < i('window.CONFIG_SIMULADOR.planos = ['), 'planos depois da configuração');
  assert.ok(i('root.PlanilhaPlanos = factory()') < i('window.PlanilhaPlanos.lerPlanos'), 'leitura da planilha antes do app');
});

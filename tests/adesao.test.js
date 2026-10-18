'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const A = require('../js/adesao.js');

const campo = (id) => A.CAMPOS_ADESAO.flatMap((g) => g.campos).find((c) => c.id === id);
const isoAnosAtras = (anos, dias) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - anos);
  d.setDate(d.getDate() + (dias || 0));
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

test('termo de adesão: CPF com dígitos verificadores', () => {
  assert.equal(A.cpfValido('529.982.247-25'), true);
  assert.equal(A.cpfValido('52998224725'), true);
  assert.equal(A.cpfValido('529.982.247-24'), false);
  assert.equal(A.cpfValido('111.111.111-11'), false);
  assert.equal(A.cpfValido('1234'), false);
});

test('termo de adesão: máscaras de CPF, CEP, celular e moeda', () => {
  assert.equal(A.mascara('cpf', '52998224725'), '529.982.247-25');
  assert.equal(A.mascara('cep', '01310100'), '01310-100');
  assert.equal(A.mascara('tel', '11987654321'), '(11) 98765-4321');
  assert.equal(A.mascara('tel', '1133334444'), '(11) 3333-4444');
  assert.equal(A.mascara('moeda', '1234567').replace(/\s/g, ' '), 'R$ 12.345,67');
});

test('termo de adesão: obrigatórios, formatos e idade mínima', () => {
  assert.equal(A.erroCampo(campo('nome'), '  '), 'Campo obrigatório.');
  assert.equal(A.erroCampo(campo('rg'), ''), '');
  assert.equal(A.erroCampo(campo('cpf'), '529.982.247-24'), 'CPF inválido.');
  assert.equal(A.erroCampo(campo('email'), 'maria@exemplo'), 'E-mail inválido.');
  assert.equal(A.erroCampo(campo('email'), 'maria@exemplo.com'), '');
  assert.equal(A.erroCampo(campo('cep'), '0131-010'), 'CEP com 8 dígitos.');
  assert.equal(A.erroCampo(campo('telefone'), '98765-4321'), 'Telefone com DDD.');
  assert.equal(A.erroCampo(campo('nascimento'), isoAnosAtras(17)), 'O consorciado precisa ter 18 anos ou mais.');
  assert.equal(A.erroCampo(campo('nascimento'), isoAnosAtras(18, -1)), '');
  assert.equal(A.erroCampo(campo('nascimento'), isoAnosAtras(-1)), 'Data inválida.');
});

test('termo de adesão: cônjuge só aparece para casado(a) ou união estável', () => {
  for (const id of ['conjugeNome', 'conjugeCpf']) {
    assert.deepEqual(campo(id).mostrar, { campo: 'estadoCivil', valores: ['Casado(a)', 'União estável'] });
  }
});

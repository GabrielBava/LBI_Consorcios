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
  assert.equal(A.erroCampo(campo('rg'), ''), 'Campo obrigatório.');
  assert.equal(A.erroCampo(campo('cargo'), ''), '');
  assert.equal(A.erroCampo(campo('complemento'), ''), '');
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

test('termo de adesão: fechamento (prazo, valor, redutor) e data de emissão', () => {
  assert.equal(A.erroCampo(campo('prazo'), '0'), 'Informe um número de 1 a 600.');
  assert.equal(A.erroCampo(campo('prazo'), '240'), '');
  assert.equal(A.erroCampo(campo('valorCarta'), 'R$ 0,00'), 'Informe o valor.');
  assert.equal(A.erroCampo(campo('valorCarta'), 'R$ 200.000,00'), '');
  assert.equal(A.erroCampo(campo('redutor'), ''), '');
  assert.equal(A.erroCampo(campo('redutor'), '50'), '');
  assert.equal(A.erroCampo(campo('redutor'), '12,5'), '');
  assert.equal(A.erroCampo(campo('redutor'), '100'), 'Percentual de 0 a 99,99.');
  assert.equal(A.mascara('percentual', '12.555'), '12,55');
  assert.equal(A.mascara('inteiro', '24a0'), '240');
  const dados = { nascimento: '1990-05-10' };
  assert.equal(A.erroCampo(campo('dataEmissao'), '1989-01-01', dados), 'Data anterior à data de nascimento.');
  assert.equal(A.erroCampo(campo('dataEmissao'), '2008-03-20', dados), '');
  assert.equal(A.erroCampo(campo('dataEmissao'), '2010-02-30', dados), 'Data inválida.');
});

test('termo de adesão: valores da simulação no formato do campo', () => {
  assert.equal(A.valorInicial(campo('valorCarta'), 200000).replace(/\s/g, ' '), 'R$ 200.000,00');
  assert.equal(A.valorInicial(campo('redutor'), 50), '50');
  assert.equal(A.valorInicial(campo('redutor'), 33.333), '33,33');
  assert.equal(A.valorInicial(campo('prazo'), 240), '240');
  assert.equal(A.valorInicial(campo('prazo'), null), '');
  assert.equal(A.valorInicial(campo('seguroPrestamista'), 'Sim'), 'Sim');
});

test('termo de adesão: endereço completo e busca de CEP (ViaCEP e BrasilAPI)', () => {
  const d = { cep: '01310-100', logradouro: 'Av. Paulista', numero: '1000', complemento: 'Ap 12', bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'SP' };
  assert.equal(A.enderecoCompleto(d), 'Av. Paulista, 1000 – Ap 12 – Bela Vista – São Paulo/SP – CEP 01310-100');
  assert.equal(A.enderecoCompleto({}), '');
  assert.deepEqual(A.enderecoDoCep({ cep: '01310-100', logradouro: 'Avenida Paulista', bairro: 'Bela Vista', localidade: 'São Paulo', uf: 'SP' }),
    { logradouro: 'Avenida Paulista', bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'SP' });
  assert.deepEqual(A.enderecoDoCep({ cep: '01310100', state: 'SP', city: 'São Paulo', neighborhood: 'Bela Vista', street: 'Avenida Paulista' }),
    { logradouro: 'Avenida Paulista', bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'SP' });
  assert.equal(A.enderecoDoCep({ erro: true }), null);
  assert.equal(A.enderecoDoCep({ erro: 'true' }), null);
});

test('ficha de cadastro: CNPJ e dados da empresa só para pessoa jurídica; sem grupo e cota', () => {
  assert.equal(A.cnpjValido('11.222.333/0001-81'), true);
  assert.equal(A.cnpjValido('11.222.333/0001-82'), false);
  assert.equal(A.cnpjValido('11111111111111'), false);
  assert.equal(A.mascara('cnpj', '11222333000181'), '11.222.333/0001-81');
  assert.equal(A.erroCampo(campo('cnpj'), '11.222.333/0001-82'), 'CNPJ inválido.');
  for (const id of ['cnpj', 'razaoSocial', 'nomeFantasia', 'dataAbertura', 'faturamento']) {
    assert.deepEqual(campo(id).mostrar, { campo: 'tipoPessoa', valores: ['Jurídica'] }, id);
  }
  assert.equal(campo('tipoPessoa').proposta, true);
  assert.equal(campo('grupoCota'), undefined);
  assert.equal(campo('numeroCota'), undefined);
});

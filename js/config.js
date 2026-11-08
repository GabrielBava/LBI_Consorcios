/*
 * Configurações do simulador (editar aqui).
 *
 * empresa: nome da empresa exibido na proposta, no PDF e na mensagem do WhatsApp.
 *
 * versao: versão do simulador, exibida abaixo do logo. Troque a cada nova versão distribuída.
 *
 * validadeVersao: (opcional, 'aaaa-mm-dd') último dia em que o arquivo protegido desta versão abre.
 * Depois dessa data a tela de acesso pede a versão atual. Vazio = sem validade.
 * A senha de acesso não fica aqui: é informada na hora de gerar o arquivo protegido (npm run build:protegido).
 *
 * siteAposVenda: página aberta depois da tela de agradecimento do "Finalizar venda".
 *
 * senhaAcessoHash: resumo da senha pedida na tela de entrada (a senha não fica aqui).
 * Para trocar: npm run senha -- <nova senha>. Vazio = sem tela de senha.
 *
 * planosUrl: endereço do CRM que devolve os planos cadastrados em JSON
 * (uma lista ou { "planos": [...] }). Quando vazio, usa os planos de js/planos.js.
 *
 * Planos cadastrados (administradora, plano, crédito mínimo e máximo, prazo, taxas, lances e índice):
 * ficam na planilha planos/Cadastro_de_Planos.xlsx. Depois de editar a planilha, rode
 * npm run planos para gerar js/planos.js e, em seguida, o build da nova versão.
 */
window.CONFIG_SIMULADOR = {
  empresa: 'Grupo Life Brasil',
  versao: '1.2.1',
  validadeVersao: '2026-12-31',
  siteAposVenda: 'https://www.grupolifebrasil.com.br/',
  senhaAcessoHash: '4033d1e3ba7d7b60ae6e0e61b28e567fb20618a48f40e7c888c0b685676cc6c8',
  planosUrl: ''
};

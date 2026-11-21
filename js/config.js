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
 * planilhaPlanos: link de compartilhamento da planilha de planos no Google Drive ("qualquer pessoa com o
 * link pode ver"). O simulador lê a planilha direto do Drive ao abrir e a cada 5 minutos; sem conexão,
 * usa a última leitura do navegador ou os planos embutidos em js/planos.js (gerados por npm run planos).
 * Vazio = só os planos de js/planos.js.
 *
 * planosUrl: endereço do CRM que devolve os planos cadastrados em JSON
 * (uma lista ou { "planos": [...] }). Quando vazio, usa os planos acima.
 */
window.CONFIG_SIMULADOR = {
  empresa: 'Grupo Life Brasil',
  versao: '1.2.2',
  validadeVersao: '2026-12-31',
  siteAposVenda: 'https://www.grupolifebrasil.com.br/',
  senhaAcessoHash: '79304064941185e07047565050e0568f2ede3a955742d2636faa356b5d538f13',
  planilhaPlanos: 'https://docs.google.com/spreadsheets/d/1l-1kvMCTs2kz4N9WbKUiit1WHwuYh0Zm/edit?usp=sharing',
  planosUrl: ''
};

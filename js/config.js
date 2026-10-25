/*
 * Configurações do simulador (editar aqui).
 *
 * empresa: nome da empresa exibido na proposta, no PDF e na mensagem do WhatsApp.
 *
 * versao: versão do simulador, exibida abaixo do logo. Troque a cada nova versão distribuída.
 *
 * validadeVersao: (opcional, 'aaaa-mm-dd') último dia em que o arquivo protegido desta versão abre.
 * Depois dessa data a tela de acesso pede a versão atual. Vazio = sem validade.
 * A senha de acesso não fica aqui: é informada na hora de gerar o arquivo (npm run build:online).
 *
 * siteAposVenda: página aberta depois da tela de agradecimento do "Finalizar venda".
 *
 * planosUrl: endereço do CRM que devolve os planos cadastrados em JSON
 * (uma lista ou { "planos": [...] }). Quando vazio, usa a lista "planos" abaixo.
 *
 * planos: planos cadastrados. Campos de cada plano:
 *   id             código do plano (o CRM pode enviar ?plano=<id> no link)
 *   administradora nome da administradora (igual ao da lista do simulador)
 *   nome           nome do plano exibido na seleção
 *   categoria      'imovel' ou 'veiculo'
 *   creditoMinimo  crédito mínimo (R$)
 *   prazo          prazo do grupo (meses)
 *   taxaAdm        taxa administrativa (%)
 *   fundoReserva   fundo de reserva (%)
 *   embutidoPct    lance embutido (%)
 *   fixoPct        lance fixo (%)
 *   indice         'INCC', 'IPCA', 'INPC', 'pre5', 'pre6' ou 'outro'
 *   indiceTaxa     (opcional) taxa anual estimada do índice (%)
 *
 * Os dois planos abaixo são exemplos com os valores padrão do simulador:
 * substitua pelos planos cadastrados no CRM.
 */
window.CONFIG_SIMULADOR = {
  empresa: 'Grupo Life Brasil',
  versao: '1.2.1',
  validadeVersao: '2026-12-31',
  siteAposVenda: 'https://www.grupolifebrasil.com.br/',
  planosUrl: '',
  planos: [
    { id: 'EX-IMOVEL', exemplo: true, administradora: 'HS', nome: 'Imóvel 240 meses', categoria: 'imovel', creditoMinimo: 200000, prazo: 240, taxaAdm: 20, fundoReserva: 2, embutidoPct: 25, fixoPct: 50, indice: 'INCC' },
    { id: 'EX-VEICULO', exemplo: true, administradora: 'HS', nome: 'Veículo 100 meses', categoria: 'veiculo', creditoMinimo: 80000, prazo: 100, taxaAdm: 13, fundoReserva: 2, embutidoPct: 25, fixoPct: 50, indice: 'IPCA' }
  ]
};

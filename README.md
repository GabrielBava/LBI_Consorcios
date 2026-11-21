# Simulador de Consórcio — Grupo Life Brasil

Plataforma única, no mesmo link, com duas páginas:

- **Página 1 · Consórcio** (`index.html#primario`): cartas primárias — condições do plano, evolução do crédito e das parcelas, modalidades de contemplação (sorteio, lance embutido, fixo, livre e retido, com recursos próprios e FGTS), cenários de sorteio e de lance, resultado financeiro estimado e a estratégia de cartas (split do crédito ou multiplicação).
- **Página 2 · Carta Contemplada** (`index.html#contemplada`): uma ou várias cartas contempladas (junção) — resumo com CET, características da proposta, fluxo de parcelas (com ou sem reajuste pelo indexador) e as guias opcionais Estudo de Amortização, Evolução de Parcelas, Calculadora de Rendimentos, Consórcio vs Financiamento (cartões lado a lado; no imóvel, Seguro/FGHab como a Caixa e CESH; no veículo e serviço, financiamento CDC com IOF e tarifas) e Gráficos (só na tela, fora do PDF).

As abas no topo da proposta alternam entre as páginas; o menu lateral troca os campos, e nome do cliente, tema claro/escuro e menu oculto valem para as duas. Cada página gera a sua **proposta em PDF** (tema claro, com data e hora da emissão) com o nome do lead, e o **Finalizar venda** baixa o termo de cadastro do cliente para o consultor encaminhar ao pós-venda (uso interno).

> A simulação depende dos dados do grupo, do contrato, das regras da administradora e das premissas inseridas. Não há garantia de contemplação, venda, lucro, valorização ou rentabilidade.

## Como usar

1. Abra `index.html` no navegador (versão de desenvolvimento). Não há instalação nem servidor; funciona também offline. Para a equipe, distribua o arquivo protegido por senha (abaixo).
2. Preencha as seções do menu lateral. Os resultados são atualizados automaticamente.
3. Clique em **Gerar proposta** e confira a prévia. Na prévia, **Gerar proposta** baixa o PDF (`Proposta_<Nome>_<data>.pdf`) e prepara a mensagem para colar no WhatsApp do cliente.
4. Fechado o negócio, **Finalizar venda** abre a ficha de cadastro (fechamento vindo da simulação, dados do cliente ou da empresa e do representante, endereço pelo CEP e dados bancários). **Concluir e baixar termo** baixa `Termo_Cadastro_Consorcio_<cliente>_<administradora>.pdf`, com data e hora da emissão, mostra o agradecimento e abre o site do grupo. O consultor encaminha o PDF ao pós-venda; o cliente não recebe.

Cada acesso começa do zero, só com as premissas base: nenhuma proposta fica gravada no navegador. **Nova proposta** limpa os campos.

## Planos: planilha no Google Drive, lida em tempo real

Os planos ficam numa planilha .xlsx no Google Drive, compartilhada como **"qualquer pessoa com o link pode ver"**. O link vai em `js/config.js` (`planilhaPlanos`). O simulador lê a planilha **direto do Drive**, sem baixar arquivo nem pedir anexo: ao abrir, a cada 5 minutos com a aba visível, ao voltar para a aba e no link **Atualizar** (abaixo do plano). A nota abaixo do plano mostra a origem: "Planilha de planos lida às 14:32: N planos". Sem conexão, valem a última leitura daquele navegador e, sem ela, os planos embutidos na versão (`js/planos.js`).

Colunas lidas (uma linha por plano; títulos com variações são aceitos, como Produto, Segmento, Tx. Adm., FR, Crédito): **Administradora**, Tipo de Grupo (aparece ao lado do nome do plano), **Plano**, **Tipo** (Imóvel ou Veículo), **Prazo (meses)**, Flag Adesão e Flag Seguro (Sim/Não: já marcam ou desmarcam adesão e seguro), **Crédito mínimo (R$)**, Crédito máximo (R$), **Taxa de administração (%)**, **Fundo de reserva (%)**, Lance embutido (%), Lance fixo (%), Índice de reajuste, Flag Fidelidade (Sim/Não: habilita o Lance Fidelidade), A partir de (Mês) e % Lance Embutido (opções da fidelidade, até 3, separadas por ";"). Também aceita, se forem acrescentadas: Taxa de adesão (%), Adesão diluída em (meses), Seguro prestamista (% a.m.), Modalidade de parcela, Outro redutor (%), Abatimento do lance, Taxa estimada do índice (% a.a.), Ativo (Sim/Não) e Código do plano. Linhas com erro ficam de fora e aparecem em "aviso(s) da planilha", ao lado de Atualizar. `planos/Cadastro_de_Planos.xlsx` é um modelo de colunas.

Planos embutidos na versão (para quando não há conexão), gerados antes de cada build:

```bash
npm run planos                       # lê a planilha do Drive (planilhaPlanos) e gera js/planos.js
npm run planos -- arquivo.xlsx       # ou um arquivo local
```

O comando confere cada linha (obrigatórios, faixas, tipo, índice, crédito máximo menor que o mínimo, plano repetido) e só grava `js/planos.js` se não houver erro.

**Administradoras:** a lista suspensa traz só Porto Seguro (a inicial), Bradesco, Mapfre e Âncora (`ADMINISTRADORAS` em `js/calc.js`); planos de outras administradoras na planilha não aparecem. O especialista escolhe o tipo (Imóvel ou Veículo), a administradora e o plano: prazo, taxas, lances, flags e índice vêm preenchidos, e ele só ajusta o crédito, entre o mínimo e o máximo do plano. Com um só plano para a administradora e o tipo, ele já vem aplicado.

## Apresentação V1 Consórcio

O botão **Apresentação**, ao lado de Claro/Escuro no topo da proposta, abre a apresentação institucional V1 Consórcio (`apresentacao/V1_Consorcio_Life_Brasil.html`) em tela cheia; o botão **Voltar ao simulador** da apresentação (ou o × no canto, ou Esc) volta ao simulador no ponto em que estava. Nos arquivos únicos (protegido e on-line), a apresentação vai embutida; para trocá-la, substitua o arquivo em `apresentacao/` mantendo o nome e gere a versão de novo.

## Senha de acesso

Toda forma de abrir o simulador (`index.html`, a versão on-line e o arquivo protegido) começa por uma tela de senha. A senha não fica gravada: `js/config.js` guarda só o resumo dela (`senhaAcessoHash`). Para trocar:

```bash
npm run senha -- 1234
```

Em todas as formas, depois de entrar, ficam bloqueados o botão direito, a seleção e a cópia de texto fora dos campos e os atalhos de salvar a página (Ctrl+S), imprimir (Ctrl+P), ver código (Ctrl+U) e ferramentas do desenvolvedor (F12, Ctrl+Shift+I/J/C). O menu do próprio navegador ainda permite "Salvar como": no arquivo protegido, a cópia salva não funciona (o conteúdo é criptografado e os scripts saem da página depois de carregados); no `index.html` e na versão on-line, o código está aberto. Por isso, distribua à equipe só o arquivo protegido.

## Arquivo para a equipe (protegido por senha)

```bash
SIMULADOR_SENHA=1234 npm run build:protegido
```

Use a mesma senha do `npm run senha` (o build avisa se forem diferentes). Gera `dist/GLB_Simulador_de_Consorcio_v<versão>.html`: um arquivo único que funciona sem internet e abre com uma tela de senha. Todo o simulador vai criptografado (AES-256-GCM, chave derivada da senha por PBKDF2); a senha (4 a 64 caracteres; prefira 8 ou mais, com letras e números) não fica gravada no arquivo nem no repositório. A cada nova versão:

1. Atualize `versao` e `validadeVersao` em `js/config.js` (depois da validade, o arquivo antigo não abre mais; a data faz parte da criptografia, então editá-la no arquivo impede a abertura).
2. Gere o arquivo com a nova senha e distribua o arquivo e a senha por canais separados.

A senha é pedida uma vez só, na tela do arquivo. É uma proteção contra acesso e cópia casuais: quem tem a senha e conhecimento técnico ainda consegue ler o código pelo navegador, uma senha de 4 dígitos pode ser descoberta por tentativa com ferramentas próprias em poucos minutos, e atrasar o relógio do computador contorna a validade. **O código-fonte deste repositório também precisa ficar privado** (no GitHub: Settings → Danger Zone → Change visibility).

## Versão on-line

`npm run build:online` gera `dist/simulador.html`, uma página única com CSS e JS embutidos, para publicação no claude.ai (os downloads passam pelo recurso de downloads da página publicada; aberta fora dela, usa o download comum do navegador).

## Identidade visual

O simulador segue a identidade do **Grupo Life Brasil** (apresentação institucional V1): laranja Life sobre preto no tema escuro e sobre branco no tema claro (botão **Claro | Escuro** no topo da proposta), títulos em caixa alta com a palavra-chave em negrito, cartões de cantos arredondados e o logotipo com o coração (versões para fundo claro e escuro em `marca/`, embutidas em `js/logos.js` por `npm run logos`). A fonte da marca é a Klavika (comercial), usada quando está instalada no computador; sem ela, a Titillium Web assume automaticamente. Os tokens ficam em `css/tokens.css` e o resumo da identidade em `marca/IDENTIDADE.md`.

## Estrutura

| Arquivo | Conteúdo |
|---|---|
| `index.html` | Tela: menu lateral (configuração) e área de resultados |
| `css/tokens.css` | Tokens da identidade do Grupo Life Brasil (cores, tipografia, forma, sombras; temas escuro e claro) |
| `css/style.css` | Componentes do simulador e layout das páginas do PDF |
| `js/config.js` | Nome da empresa, versão e validade, site aberto depois do Finalizar venda, link da planilha de planos no Drive e endereço do CRM |
| `planos/Cadastro_de_Planos.xlsx` | Modelo de colunas da planilha de planos (a planilha oficial fica no Google Drive) |
| `js/planos.js` | Planos embutidos (sem conexão), gerados da planilha do Drive por `npm run planos` (não editar à mão) |
| `js/planilha-planos.js` | Leitura da planilha de planos (.xlsx) do Drive, no navegador e no `npm run planos` |
| `apresentacao/V1_Consorcio_Life_Brasil.html` | Apresentação institucional V1 Consórcio, aberta pelo botão Apresentação |
| `js/vendor/` | html2canvas e jsPDF, usados para gerar o arquivo PDF |
| `js/calc.js` | Motor de cálculo puro da página 1 (sem interface), com fórmulas, validações e memórias |
| `js/calc-contemplada.js` | Motor de cálculo puro da página 2: cartas, CET, fluxo, amortização, evolução, rendimentos e financiamento |
| `js/app-contemplada.js` | Página 2 na tela, textos do WhatsApp e PDF da carta contemplada |
| `js/acesso.js` | Tela de senha na entrada e travas contra salvar, imprimir e copiar a página |
| `js/adesao.js` | Finalizar venda: ficha de cadastro (campos em `CAMPOS_ADESAO`) e PDF do termo de cadastro |
| `js/app.js` | Interface: navegação entre as páginas, vínculo dos campos, desenho dos resultados, ações e PDF |
| `tests/calc.test.js` | Testes do motor de cálculo da página 1 |
| `tests/contemplada.test.js` | Testes do motor de cálculo da página 2 |
| `scripts/build-protegido.js` | Gera o arquivo protegido por senha para a equipe (`npm run build:protegido`) |
| `scripts/gerar-senha.js` | Troca a senha da tela de acesso (`npm run senha -- <senha>`) |
| `scripts/importar-planos.js` | Lê a planilha do Drive (ou um arquivo) e gera `js/planos.js` (`npm run planos`) |
| `scripts/build-artifact.js` | Gera a página única para publicação on-line (`npm run build:online`) |
| `tests/adesao.test.js` | Testes das validações, máscaras, endereço e busca de CEP da ficha de fechamento |
| `tests/acesso.test.js` | Testes do resumo da senha de acesso |
| `tests/planos.test.js` | Testes da leitura da planilha de planos e do crédito mínimo e máximo |
| `tests/build.test.js` | Teste da montagem dos arquivos únicos (ordem dos scripts e apresentação embutida) |
| `docs/ESPECIFICACAO.md` | Especificação funcional da página 1 (campos, regras, fórmulas, pendências) |
| `docs/ESPECIFICACAO-CONTEMPLADA.md` | Especificação funcional da página 2 |

## Testes

```bash
npm test
```

Requer Node.js 18 ou superior. Não há dependências externas.

<p align="center">
  <img src="docs/images/banner.svg" alt="Org Tree — organograma gratuito e open source para Power BI" width="100%">
</p>

<p align="center">
  <a href="README.md">English</a> · <b>Português</b>
</p>

<p align="center">
  <a href="https://github.com/DevEduNunes/pbi-org-tree/actions/workflows/build.yml"><img alt="Build" src="https://github.com/DevEduNunes/pbi-org-tree/actions/workflows/build.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="Licença: MIT" src="https://img.shields.io/badge/licen%C3%A7a-MIT-green.svg"></a>
  <img alt="Visual personalizado do Power BI" src="https://img.shields.io/badge/Power%20BI-visual%20personalizado-F2C811?logo=powerbi&logoColor=black">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-D3-3178C6?logo=typescript&logoColor=white">
  <a href="CONTRIBUTING.md"><img alt="PRs bem-vindos" src="https://img.shields.io/badge/PRs-bem--vindos-brightgreen.svg"></a>
</p>

# Org Tree

Um **organograma vertical gratuito e open source** para Power BI. Entregue uma tabela simples — uma linha por pessoa, com o ID da pessoa e o ID do gestor — e ele desenha toda a hierarquia: ramos que expandem e recolhem, busca que mostra a linha hierárquica completa, zoom e arrastar, fotos, cores vindas dos dados e filtro cruzado com o restante do relatório.

Sem licença paga, sem cobrança por usuário e sem os dados saírem do seu relatório.

## ✨ Recursos

| | |
|---|---|
| 🌳 **Árvore vertical** | Organograma de cima para baixo, com conectores em cotovelo arredondado, retos ou curvos |
| ➕ **Expandir / recolher** | Por ramo, mais *Expand all*, *Collapse all* e *Fit*; você escolhe quantos níveis começam abertos |
| 🔎 **Busca pela linha hierárquica** | Digite um ID ou nome e veja a pessoa e todos os gestores acima dela, até o topo |
| 📤 **Exportar / Copiar equipe** | Pesquise uma pessoa e baixe um CSV — ou copie, pronto para colar no Excel — com ela e **todos abaixo dela**, em todos os níveis |
| 🖱️ **Zoom e arrastar** | Roda do mouse e arrasto; *Fit* recentraliza tudo |
| 📐 **Controles responsivos** | A barra de ferramentas cresce com o tamanho do visual (e com o navegador reduzido), e os botões +N / − dos cards crescem quando você afasta o zoom |
| 🔗 **Filtro cruzado** | Clique num card para filtrar os outros visuais (Ctrl/Shift para selecionar vários) |
| 🖼️ **Avatares** | Foto por link ou base64, ou iniciais automáticas; círculo ou quadrado, à esquerda ou no topo |
| 🎨 **Cores vindas dos dados** | Uma coluna com cor (`#64C8C8`) pinta cada card; o contraste do texto é ajustado sozinho |
| 🛠️ **Painel de formato** | Layout, cards, avatar, texto, cores e conectores — tudo em *Formatar visual* |
| 🧹 **Tolerante com dados sujos** | Gestores sem linha própria, várias pessoas no topo, IDs duplicados e ciclos são tratados |

## 🚀 Início rápido

1. **Baixe** o `OrganogramaByDevEduNunes.pbiviz` mais recente na página de [Releases](https://github.com/DevEduNunes/pbi-org-tree/releases).
2. No **Power BI Desktop**: painel *Visualizações* → **⋯** → **Importar um visual de um arquivo** → escolha o arquivo.
3. Adicione o visual ao relatório e arraste suas colunas para os campos (abaixo).
4. Abra **Formatar visual** para personalizar.

### Campos

| Campo | Obrigatório | O que colocar |
|---|:---:|---|
| **Employee ID** | ✅ | Chave única da linha (texto é o mais seguro) |
| **Manager ID** | ✅ | ID do gestor da pessoa. Vazio, ou igual ao ID da própria pessoa, significa *topo da árvore* |
| **Employee name** | | Nome mostrado no card (se vazio, usa o ID) |
| **Manager name** | | Dá nome a gestores que não têm linha própria |
| **Card details** | | Uma ou mais colunas; cada uma vira uma linha extra no card e no tooltip |
| **Image URL** | | Link `https://` ou a imagem em base64 (veja os [limites](#-bom-saber)). Vazio = iniciais |
| **Card color** | | Uma cor CSS como `#64C8C8`. Vazio = cor padrão do card |

> **Dica — destacar uma regra.** Monte a cor no seu modelo, por exemplo no Power Query:
> `if [Status] = "Remover" then "#FDE2E2" else ""`

### Formatar visual

| Seção | Opções |
|---|---|
| **Layout** | Níveis expandidos no início, espaço horizontal, espaço vertical |
| **Cards** | Largura, altura, raio dos cantos, largura da borda |
| **Avatar** | Forma (círculo / quadrado / nenhum), posição (esquerda / topo), tamanho |
| **Texto** | Tamanho do título, negrito, tamanho dos detalhes |
| **Cores** | Preenchimento do card, borda, texto |
| **Conectores** | Cor, largura, forma (cotovelo / curva / reta), raio do cotovelo, ponto na ponta do filho |
| **Toolbar** | Escalar com o tamanho do visual (ligado por padrão) e um tamanho manual em % |
| **Export** | Separador do CSV: ponto e vírgula, vírgula ou tab |

## 🔎 Como a busca funciona

- Um **ID exato** tem prioridade: `7957` encontra só o colaborador `7957`, e não `17957`.
- Caso contrário, nomes e IDs que *contêm* o texto são encontrados (até 100 pessoas).
- O gráfico passa a mostrar só a **linha hierárquica**: o(s) resultado(s) e todos os gestores acima, até o topo, com o resultado destacado.
- Use o botão **+N** em qualquer card dessa linha para trazer os outros subordinados diretos dele.
- Durante a busca, **Expand all** mantém o filtro e abre todos os cards dele: cada gestor da linha mostra seus subordinados diretos, e a pessoa pesquisada também mostra a equipe inteira. **Collapse all** volta a mostrar só a linha hierárquica.
- **Export team** (habilitado enquanto há uma busca ativa) salva um CSV com a(s) pessoa(s) pesquisada(s) e **todos abaixo dela(s), em todos os níveis**, estejam os cards expandidos ou não. Colunas: `Level` (0 = a pessoa pesquisada, 1 = subordinados diretos…), depois ID e nome do colaborador, ID e nome do gestor e as colunas de *Card details*. O arquivo é UTF-8 com BOM, então o Excel lê os acentos certo; o separador é definido em *Formatar visual → Export* (ponto e vírgula por padrão, para o Excel em português).
- **Copy team** coloca a mesma lista na área de transferência (separada por tab), para colar direto no Excel. Use quando os **downloads estiverem bloqueados**: muitas organizações desativam *"Permitir downloads de visuais personalizados"* no portal de administração do Power BI/Fabric, e aí o **Export team** mostra uma mensagem do Power BI dizendo que o administrador restringiu os downloads. Se a área de transferência também estiver bloqueada, abre um painel com o texto para você copiar manualmente.
- Limpe a caixa de busca para voltar à árvore completa.

## 📦 Dados de exemplo

[`sample/sample-data.csv`](sample/sample-data.csv) é uma pequena empresa fictícia que você pode carregar no Power BI para testar todos os campos. Para preparar a sua tabela (tipos, remoção de duplicidades, topo da árvore, trechos de Power Query e Spark SQL) leia [`docs/data-preparation.pt-BR.md`](docs/data-preparation.pt-BR.md).

## 💡 Bom saber

- O visual carrega até **30.000 linhas**.
- O Power BI **trunca textos com mais de 32.766 caracteres**, e uma imagem cortada não abre. Mantenha as miniaturas em base64 pequenas (cerca de 80×80 px, abaixo de ~20 KB).
- Imagens por link `https://` só carregam se o link abrir **sem pedir login**. Fotos atrás de login (por exemplo no SharePoint) não aparecem — use base64.
- Ciclos (A reporta a B e B reporta a A) são cortados automaticamente, mas corrija na origem.

## 🔒 Segurança e privacidade

- O visual roda inteiramente dentro do sandbox do Power BI. Ele **não envia seus dados a lugar nenhum**, **não tem telemetria** e **não faz chamadas de rede próprias**.
- O único arquivo que ele pode criar é o CSV que você pede com **Export team**, salvo pelo serviço de download do próprio Power BI: o Power BI pergunta onde salvar, e um administrador pode desativar downloads de visuais personalizados. Texto que uma planilha leria como fórmula (começando com `=`, `+`, `-` ou `@`) é exportado com uma aspa no início.
- As únicas requisições de saída são as que o navegador faz para carregar uma imagem quando seus dados trazem um link de imagem `https://`.
- Textos vindos dos dados são sempre exibidos como texto puro (nunca como HTML), e só links `https://` e dados PNG/JPEG/GIF/WebP são aceitos como imagem.
- Encontrou uma vulnerabilidade? Avise em particular — veja o [SECURITY.md](SECURITY.md).

## 🧑‍💻 Desenvolvimento

Requer **Node.js 20.19+**.

```bash
npm install
npm start          # visual de desenvolvimento servido ao Power BI
npm run package    # gera dist/*.pbiviz
```

Não quer instalar o Node? Cada push roda o **Build visual** no GitHub Actions e guarda o `.pbiviz` como artefato; enviar uma tag como `v1.0.0` publica o arquivo como release.

```
src/orgModel.ts    linhas planas -> árvore (código puro, sem dependência do Power BI)
src/settings.ts    configurações do painel de formato e padrões
src/visual.ts      desenho (d3-hierarchy + SVG), busca, interação, seleção
capabilities.json  campos e objetos do painel de formato
```

## 🗺️ Roadmap

Ideias bem-vindas — abra uma issue ou um pull request:

- Testes unitários do montador de árvore (ciclos, IDs duplicados, gestores ausentes)
- Layout horizontal e nós "assistentes" ao lado do gestor
- Tooltips do Power BI, tema escuro e alto contraste
- Exportar como imagem
- Mais idiomas

## 🤝 Contribuindo

Contribuições de qualquer tamanho são bem-vindas — veja o [CONTRIBUTING.md](CONTRIBUTING.md). **Nunca envie dados reais de colaboradores nem capturas de tela de relatórios reais.**

## 📄 Licença

[MIT](LICENSE) © DevEduNunes e colaboradores.

Feito com [D3](https://d3js.org/) (`d3-hierarchy`, `d3-selection`, `d3-zoom`, licença ISC) e as [ferramentas de visuais do Power BI](https://github.com/microsoft/powerbi-visuals-tools).

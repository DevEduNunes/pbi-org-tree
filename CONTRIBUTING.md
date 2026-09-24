# Contributing / Contribuindo

**English** · [Português](#português)

## English

Thanks for helping! Bug reports, ideas and pull requests are all welcome.

### Ground rules
- **Never commit real data**: employee names, IDs, salaries, credentials or screenshots of real reports. Use the fictional data in `sample/`.
- Keep the visual free of company-specific names or logic; everything must be configurable.
- Keep `src/orgModel.ts` free of Power BI and DOM imports so it stays easy to test.
- Render text from data with `.text()` (never as HTML) and keep the list of accepted image sources strict.

### Workflow
1. Fork and create a branch (`feature/short-name`).
2. `npm install`, then `npm start` to try changes in the Power BI developer visual. No Node? Push your branch and download the `.pbiviz` from the **Build visual** run.
3. `npm run package` must succeed — the workflow runs it on every pull request.
4. Open a pull request describing the change; for visual changes add a screenshot made with the sample data.

### Ideas that would be welcome
Unit tests for `buildForest`, horizontal layout, "assistant" nodes, Power BI tooltips, dark theme / high contrast, export to image, more languages.

### Reporting bugs
Include the Power BI version (Desktop or Service), what you dropped into each field and, when possible, a small fictional dataset that reproduces the problem. For security issues see [SECURITY.md](SECURITY.md).

---

## Português

Obrigado por ajudar! Relatos de bugs, ideias e pull requests são bem-vindos.

### Regras básicas
- **Nunca envie dados reais**: nomes de colaboradores, matrículas, salários, credenciais ou capturas de tela de relatórios reais. Use os dados fictícios de `sample/`.
- Mantenha o visual livre de nomes ou regras específicas de uma empresa; tudo deve ser configurável.
- Mantenha o `src/orgModel.ts` sem imports do Power BI e do DOM, para continuar fácil de testar.
- Exiba textos dos dados com `.text()` (nunca como HTML) e mantenha rígida a lista de origens de imagem aceitas.

### Fluxo
1. Faça um fork e crie uma branch (`feature/nome-curto`).
2. `npm install` e depois `npm start` para testar no visual de desenvolvimento do Power BI. Sem Node? Envie a branch e baixe o `.pbiviz` da execução do **Build visual**.
3. `npm run package` precisa passar — o workflow o executa em todo pull request.
4. Abra um pull request descrevendo a mudança; para mudanças visuais, inclua uma captura feita com os dados de exemplo.

### Ideias bem-vindas
Testes unitários do `buildForest`, layout horizontal, nós "assistentes", tooltips do Power BI, tema escuro / alto contraste, exportar como imagem, mais idiomas.

### Reportando bugs
Informe a versão do Power BI (Desktop ou Serviço), o que foi colocado em cada campo e, se possível, um pequeno conjunto de dados fictício que reproduza o problema. Para questões de segurança, veja o [SECURITY.md](SECURITY.md).

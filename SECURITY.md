# Security Policy / Política de Segurança

**English** · [Português](#português)

## English

### Supported versions
Only the latest release receives fixes.

### Reporting a vulnerability
Please **do not open a public issue** for a security problem.

Use GitHub's private reporting: **Security → Report a vulnerability** on this repository. If that option is not available, open an issue titled "Security contact request" *without any details* and a maintainer will reach out privately.

Please include what you found, how to reproduce it and the impact. You can expect an acknowledgement within a few days.

### What the visual does (and does not do)
- Runs inside the Power BI visual sandbox; no network calls of its own, no telemetry, no data leaves the report.
- Renders text from your data as plain text (never HTML).
- Accepts only `https://` links and PNG/JPEG/GIF/WebP data as images. The browser requests image links, as it does for any image.

### For contributors
Never commit real employee data, credentials or screenshots of real reports. Automated dependency updates are handled by Dependabot; the build workflow runs with read-only permissions.

---

## Português

### Versões suportadas
Apenas a versão mais recente recebe correções.

### Reportando uma vulnerabilidade
Por favor, **não abra uma issue pública** para um problema de segurança.

Use o relato privado do GitHub: **Security → Report a vulnerability** neste repositório. Se a opção não estiver disponível, abra uma issue com o título "Security contact request" **sem nenhum detalhe**, e um mantenedor entrará em contato em particular.

Inclua o que encontrou, como reproduzir e o impacto. Você deve receber uma confirmação em poucos dias.

### O que o visual faz (e não faz)
- Roda dentro do sandbox de visuais do Power BI; sem chamadas de rede próprias, sem telemetria, nenhum dado sai do relatório.
- Exibe textos vindos dos dados como texto puro (nunca HTML).
- Aceita como imagem só links `https://` e dados PNG/JPEG/GIF/WebP. O navegador requisita os links de imagem, como faz com qualquer imagem.

### Para quem contribui
Nunca envie dados reais de colaboradores, credenciais nem capturas de tela de relatórios reais. As atualizações automáticas de dependências ficam com o Dependabot; o workflow de build roda com permissões somente de leitura.

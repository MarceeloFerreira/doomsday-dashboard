# Calendário sem deploy a cada atualização

O site lê `GET /api/calendar`. A rota consulta o store persistente `doomsday-calendar`, chave `current`, no Netlify Blobs. O armazenamento é compartilhado entre deploys; um deploy futuro não substitui nem apaga o calendário publicado.

O navegador consulta ao abrir, ao retornar à aba e a cada minuto enquanto a aba estiver visível. A API guarda uma leitura válida por até um minuto. O prazo normal para refletir uma publicação é de até dois minutos. A região padrão continua sendo 541; todas as restrições, IDs e variantes permanecem nos dados.

## Ativação inicial

No WSL, dentro de `/home/marcelof/projects/doomsday-dashboard`:

```bash
export PATH="$HOME/.nvm/versions/node/v22.22.2/bin:$PATH"
npx netlify-cli login
npx netlify-cli link
```

Autorize o CLI na conta Netlify e selecione **o projeto existente** deste dashboard. Não crie outro site. O vínculo fica em `.netlify/state.json`, ignorado pelo Git. O publicador reutiliza o token do CLI local sem incluí-lo no código ou no navegador. Em ambiente automatizado, é possível fornecer NETLIFY_AUTH_TOKEN e NETLIFY_SITE_ID por variáveis protegidas.

Depois da revisão/testes, publique uma vez esta versão do código pelo fluxo normal do projeto ou `npx netlify-cli deploy --build --prod`. A integração não cria ou altera senhas de membros/liderança; preserve as variáveis existentes do site.

```bash
npm run calendar:publish
```

Confirme que `/api/calendar` retorna `delivery.source` igual a `live` e a mesma quantidade de eventos indicada por `npm run calendar:check` (624 na validação de 21/10/2026). Sem autenticação, a publicação falha antes de enviar; a atualização local ainda fica disponível.

## Atualizações seguintes

1. Atualize/abra o cliente do jogo para obter o patch local atual.
2. Execute `npm run calendar:publish` no projeto WSL.
3. Verifique o resultado `published` ou `unchanged`. Não precisa de deploy.

O comando primeiro executa o extrator existente e depois publica. Para validar sem enviar, use `npm run calendar:check`. Para enviar o JSON já coletado sem nova extração, use `node scripts/publish-calendar.cjs`.

## Proteções

- Rejeita arquivos vazios, IDs duplicados, datas inválidas, ausência de proveniência e queda superior a 20% na quantidade de eventos publicada.
- Não permite que uma coleta mais antiga substitua a publicada.
- Detecta conteúdo idêntico ignorando apenas `generatedAt`; não cria uma nova versão por mudança de horário.
- Salva versões em `versions/<sha256>` e preserva a versão anterior antes de trocar `current`.
- Usa ETag/condição de criação para impedir sobrescritas concorrentes e lê de volta os dados após publicar.
- A API é somente leitura; nenhuma senha de escrita é exposta publicamente.
- Em falha de leitura, preserva a última resposta válida daquela instância. Em uma instância nova, usa a cópia incluída no último deploy e sinaliza a indisponibilidade temporária. Essa cópia pode ser mais antiga que a última publicação.

Para recuperar uma versão, consulte o histórico com `npx netlify-cli blobs:list doomsday-calendar --json`. Após identificar e conferir a versão desejada, baixe com `blobs:get` e restaure explicitamente a chave `current` com `blobs:set --input`. Restauração é uma operação manual deliberada; o publicador normal bloqueia retrocesso de data.

## Limites e operação

A extração ainda depende dos arquivos do jogo neste PC. Separar a publicação do deploy não cria um acesso aos servidores do jogo nem confirma disponibilidade na Região 541. O agendamento do Codex agora executa a skill `doomsday-event-calendar` às quartas-feiras às 12h de Europe/Lisbon, com varredura, auditoria de diferenças, testes e publicação de dados válidos. Substitui a rotina anterior das 10h.

A rotina precisa do PC e do Codex ligados, dos arquivos locais do jogo disponíveis e da sessão Netlify válida no WSL. Diante de falha, interrompe sem deploy e solicita a ação necessária; em validação recusada, restaura o calendário local anterior. Os relatórios ficam em `.netlify/calendar-runs/<execução>/`.

Referências: [Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/), [CLI Blobs](https://cli.netlify.com/commands/blobs/).


## Entrega validada em 21/10/2026

Projeto local concluído: coleta de 624 registros, 72 testes aprovados,
build de produção concluído e validação do JSON aprovada. A coleta retornou
`unchanged`: a quantidade de 624 registros já estava presente no projeto ao
retomar o trabalho; não foi anunciada como uma novidade desta execução.

Na entrega de 21/10/2026, a publicação inicial do site público ficou manual por escolha do proprietário. Posteriormente, o proprietário autorizou a publicação automática semanal apenas dos dados, pela skill e pelo agendamento acima.
Nenhum commit, push, deploy ou envio ao Netlify Blobs foi feito neste chat.
O funcionamento em produção precisa ser confirmado após a ativação inicial.

Sequência completa para a primeira publicação, no terminal WSL:

```bash
cd /home/marcelof/projects/doomsday-dashboard
export PATH="$HOME/.nvm/versions/node/v22.22.2/bin:$PATH"
npx netlify-cli login
npx netlify-cli link
npx netlify-cli deploy --build --prod
npm run calendar:publish
```

Nas próximas atualizações do calendário, execute apenas
`npm run calendar:publish` nessa pasta. A sessão Netlify e o vínculo ao projeto
precisam continuar disponíveis.

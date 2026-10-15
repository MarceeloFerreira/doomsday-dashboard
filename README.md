# BoPE · Doomsday Dashboard

Aplicação Next.js com App Router. O calendário é um componente React separado,
alimentado por `public/data/calendar.json`. A navegação, a identidade visual e as
funções existentes de membros foram preservadas em `legacy/` e `public/members.js`.
Esses módulos ainda usam a implementação original e podem ser migrados para React
gradualmente. O calendário não depende de editar HTML a cada atualização.

## Executar no WSL2

```bash
cd /home/marcelof/projects/doomsday-dashboard
export PATH="$HOME/.nvm/versions/node/v22.22.2/bin:$PATH"
npm ci
npm run dev
```

Abra http://localhost:3000. Para produção local: `npm run build && npm start`.
Os servidores npm estão restritos ao localhost por padrão.

## Atualizar o calendário

Com o cliente Steam atualizado no Windows:

```bash
bash scripts/update-calendar.sh
npm test
npm run build
```

A coleta usa o Python Windows do runtime Codex e a biblioteca UnityPy existente
em `C:\Users\maarc\Documents\Codex\Doomsday\.tools\unitypy`.
Os caminhos podem ser alterados por `DOOMSDAY_WORKSPACE`, `DOOMSDAY_GAME` e
`DOOMSDAY_CACHE` no ambiente Windows. O script resolve os bundles pelo manifesto
atual, aplica a localização PT e seus ajustes, e registra hashes das fontes.
Uma coleta inválida falha sem substituir o JSON anterior. O jogo não é atualizado
por este pipeline: uma instalação/cache antigo produz dados antigos.

Agendamento criado neste chat Codex: quarta-feira às 10h de Europe/Lisbon.
A tarefa coleta os arquivos locais e valida alterações. Computador e Codex precisam
estar disponíveis; não há publicação ou push automático para GitHub.

## Datas e limites de evidência

Os meses do campo `Start` são de 1 a 12. Os prazos são calculados em UTC,
com término exclusivo (`Start + Duration`). Eventos recorrentes usam `LoopDay`;
um `End` explícito limita as ocorrências. O estado e as contagens usam a mesma
função, recalculada a cada minuto. A coleta antiga é sinalizada após oito dias.

Eventos ocultos, descontinuados, sem localização ou sem data absoluta são excluídos.
`ServerDay`, `ServerDayEnd` e `KingdomId` são preservados como restrições: sem saber
a região e sua idade, as janelas exibidas são estimativas do cliente, não confirmação
de disponibilidade no servidor. O calendário abre com foco na região 541 e permite consultar todas as regiões.
Listas `KingdomId` explícitas incompatíveis são excluídas; uma lista vazia não
confirma disponibilidade. A idade da região e condições especiais não são inferidas.

Cada nome aparece uma vez na lista. Janelas equivalentes são agrupadas, preservando
todos os IDs; datas, recorrências e condições diferentes permanecem nos detalhes.
As contagens representam nomes por estado: um evento pode ter fases em andamento
e futuras. Os destaques cobrem os próximos 30 dias. Datas incluem a hora UTC e o
término é exclusivo. O histórico continua acessível pelos filtros.

## Interface do calendário

A rota React `/calendario` apresenta cards de eventos em andamento e próximos,
com descrições extraídas de `SubtitleKey`, `CalendarTipsKey` ou trechos de `RuleKey`.
Os textos têm até 240 caracteres e são limitados visualmente a três linhas nos
cards e duas na tabela. A origem fica em `descriptionSourceKey` no JSON.

O radar combina prazos próximos e eventos de data fixa, sem repetir nomes.
Os resumos numéricos, a alternância de cards e o link de cada evento filtram a
lista. Contagens regressivas e progresso são recalculados a cada minuto.
O aviso de 48 horas usa o próximo término exclusivo de uma janela ativa;
uma fase terminando não significa que todo o evento termina. O filtro de prazos
mostra apenas as janelas que satisfazem esse limite. As animações respeitam
`prefers-reduced-motion` e os controles funcionam pelo teclado.

## Área de membros

O acesso é verificado no servidor por sessão assinada de oito horas e cookie HttpOnly. Configure MEMBERS_PASSWORD (12 a 256 caracteres) e uma chave de sessão; não há senha padrão. O relatório entrega somente pontuações gerais, sem metas/poder/tropas da liderança. Configuração: [docs/members.md](docs/members.md).

A galeria `/queimadinhos` é pública por escolha do proprietário e retorna somente registros ativos, com fotos servidas por ID autorizado no Apps Script. Dados já presentes no repositório público continuam públicos no Git.

Revisão, limitações e ativação das proteções: [docs/security-review-2026-10-16.md](docs/security-review-2026-10-16.md).

## Validação

`npm test` verifica calendário, regras, análises, sessões, autorização, origem, limites de requisição e integração Apps Script.
`npm run build` compila as páginas. O arquivo `index.html` foi mantido como entrada
estática compatível, com UTF-8 e o mesmo JSON; a aplicação principal é a Next.js.

## Liderança / R4

Área separada com senha e sessão no servidor, análise por edição e metas do Arquipélago.
Configuração de ambiente e planilha: [docs/leadership.md](docs/leadership.md).

## Rotas

- `/calendario`: calendário de eventos (a raiz `/` redireciona para esta página).
- `/alianca`: informações da BoPE.
- `/membros`: acesso e calculadoras de membros.
- `/queimadinhos`: galeria pública de registros ativos.
- `/lideranca`: acesso R4 e análise por edição.

O menu usa Link do Next.js. Atualizar com F5, abrir um link direto ou usar voltar/
avançar preserva a página correspondente. A edição selecionada pela liderança
fica no parâmetro `data`, por exemplo `/lideranca?data=2026-08-24`.
O cabeçalho do ranking R4 permanece visível dentro do contêiner de rolagem.

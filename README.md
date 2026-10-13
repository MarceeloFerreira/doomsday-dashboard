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
o reino e sua idade, as janelas exibidas são estimativas do cliente, não confirmação
de disponibilidade no servidor. IDs distintos com o mesmo nome permanecem distintos.

## Área de membros

A trava original de senha e localStorage é uma barreira visual; os dados e a lógica
continuam no navegador. A migração para Next.js não cria autenticação segura.
Para dados privados, o próximo passo é autenticação e autorização no servidor,
com dados de membros fora de `public/`. Não publicar dados confidenciais nessa área.

## Validação

`npm test` verifica limites de datas, recorrência e horário de verão.
`npm run build` compila as páginas. O arquivo `index.html` foi mantido como entrada
estática compatível, com UTF-8 e o mesmo JSON; a aplicação principal é a Next.js.

## Liderança / R4

Área separada com senha e sessão no servidor, análise por edição e metas do Arquipélago.
Configuração de ambiente e planilha: [docs/leadership.md](docs/leadership.md).

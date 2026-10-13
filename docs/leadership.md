# Liderança / R4

Nova aba separada da área de membros, com senha exclusiva verificada no servidor.
Configure no Netlify, para Functions/Runtime e produção:

- `R4_PASSWORD`: senha da liderança, mínimo 12 caracteres. Não reutilizar a senha de membros.
- `R4_SESSION_SECRET`: chave aleatória de pelo menos 32 caracteres para assinatura da sessão.
- `GOOGLE_SHEETS_SCRIPT_URL`: URL Apps Script terminada em `/exec`.
- `GOOGLE_SHEETS_SCRIPT_TOKEN`: mesma chave `DASHBOARD_TOKEN` nas propriedades do Apps Script.

As duas novas variáveis ficam vazias em `.env.example`. Sem elas, o acesso R4 fica
fechado; não existe senha padrão. Configure os valores no Netlify, nunca em arquivos
commitados. A sessão usa cookie HttpOnly, SameSite Strict e Secure em HTTPS,
expira em oito horas e perde validade quando a senha ou a chave muda.
As rotas de eventos validam a sessão antes de carregar os dados.
Há limitação de tentativas por instância, não compartilhada entre instâncias serverless.

## Google Apps Script

Atualize o script com `scripts/google-sheets/Code.gs`. Em **Implantar > Gerenciar
implantações**, edite a implantação e selecione **Nova versão** para manter a URL.
O script atualizado retorna `values` da Hist. Pontuações e `members.values` de
MembrosAlianca. Não modifica nenhuma célula. Se a aba tiver outro nome, configure
`MEMBER_SHEET_NAME` nas propriedades do Apps Script.

Cabeçalho do histórico: Data, Evento, Player, Pontuação (Pontos também é aceito).
Uma data identifica uma edição; dois eventos na mesma data ou jogador duplicado
na mesma edição causam erro explícito, sem somar linhas silenciosamente.

Cabeçalho de MembrosAlianca: ID, Player, Poder, Tropa, Tipo, Esta na aliança ?.
Use T5/T6 em Tropa, conta/farm em Tipo e Sim/Não na situação. Player precisa
corresponder ao nome do histórico. O ID é exibido; o histórico atual não possui ID,
então mudanças de nome exigem alinhamento entre as abas.

Poder aceita número inteiro (`180000000`), formato PT (`180.000.000`) ou `180M`/
`180,5M`. Escrever só `180` significa 180 pontos de poder, não 180 milhões.
Campos em branco ficam sem meta; não são tratados como zero.

## Metas e análise

Arquipélago: T5 deve pontuar 30% do poder; T6 até 180 milhões inclusive deve
pontuar 80 milhões; T6 acima de 180 milhões deve pontuar 120 milhões.
Sem regras para Gênesis, Insular ou tropas diferentes de T5/T6.
Conta/farm é um filtro, não uma regra adicional de meta.

O painel mostra edições por data, ranking, total, registros, jogadores que pontuaram,
meta atingida/abaixo/sem avaliação, percentual cumprido, déficit e variação em relação
à edição anterior do mesmo evento. Jogadores sem registro anterior não recebem
comparação com zero. Membros atuais sem linha no evento são listados à parte;
ausência de registro não implica pontuação zero.

Poder, tropa, tipo e situação são os valores atuais de MembrosAlianca. Ao analisar
eventos antigos, as metas são uma referência com o poder atual. Para aferir metas
históricas exatas, será necessário salvar poder e tropa também por edição.

## Fonte e atualização

A área R4 consulta o servidor ao entrar e a cada cinco minutos. O servidor usa
cache de cinco minutos para chamadas Apps Script. Após uma edição na planilha,
a propagação pode levar até aproximadamente dez minutos em uma página aberta;
recarregar após expirar o cache antecipa a consulta do navegador.
Falha de acesso ou formato inválido usa o histórico salvo no projeto, com aviso
visível e metas indisponíveis. Não afirma estar sincronizado quando usa o snapshot.

O acesso novo protege os relatórios e APIs R4. A implementação antiga de membros
ainda contém as pontuações no JavaScript público; essa mudança não torna o
histórico de pontuações já publicado confidencial. Para isso, migrar também a
área antiga para autenticação e dados no servidor.

## Carregamento e indisponibilidade temporária

Spinner e indicação de carregamento aparecem durante consultas, com botão de
atualização manual/tentar novamente. Apenas falhas temporárias (timeout, erro de
rede, HTTP 429 ou 5xx) recebem uma segunda tentativa: limites de 10 e 15 segundos.
Chaves/permissões recusadas não são repetidas. O navegador encerra uma consulta
sem resposta em 35 segundos e permite tentar novamente.
Em atualizações da mesma edição, os últimos dados válidos da planilha ficam
visíveis quando a nova leitura falha, marcados como desatualizados. Uma edição
diferente nunca reutiliza o ranking da anterior como se fosse seu próprio.

## Gráficos e seleção de edição

A seleção de evento ocupa um painel próprio, com filtros por tipo, data e navegação entre edições. O ranking mostra seis colunas; Faltam e Variação foram removidas da interface.

Quatro gráficos permitem acompanhar até oito edições anteriores do mesmo evento (total, média ou registros), distribuição do cumprimento das metas, top dez por pontuação e até doze jogadores com menor percentual da meta. Os filtros de jogador, meta e tipo de conta afetam os gráficos de jogadores e a tabela. O resumo da edição e o histórico permanecem completos. Clicar em um jogador abre sua seleção na tabela; clicar em uma categoria de meta filtra a seleção; as datas do histórico abrem a respectiva edição.

A taxa de metas atingidas usa apenas jogadores avaliados; ausência de cadastro ou regra é mostrada como sem avaliação. Gráficos vazios não interpretam falta de dados como zero. Metas de edições antigas continuam calculadas com o cadastro atual. As barras de cumprimento param em 200%, mas o percentual escrito preserva o valor real.

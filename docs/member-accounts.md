# Contas individuais de membros

Esta etapa troca a senha compartilhada por cadastro individual, aprovação, vínculo
com player e inativação. Pontuações e metas continuam sendo lidas da planilha.
Não importa o Excel nem publica o site automaticamente.

## Configuração do Supabase Free

1. Crie um projeto Supabase Free e guarde a senha do banco em local seguro.
2. No SQL Editor, execute uma vez
   `supabase/migrations/20261022_member_accounts.sql`.
3. Em Authentication / Sign In / Providers, mantenha Email e o cadastro habilitados
   e **desative Confirm email**. Configure o mínimo de senha para 6 caracteres.
   Não configure SMTP, recuperação por e-mail ou login por SMS nesta etapa.
4. Nas configurações do projeto, copie a URL, a chave publishable e a chave secret.
   Configure somente no ambiente do servidor (`.env.local` para desenvolvimento;
   Netlify Functions/Runtime para publicação manual):

   ```dotenv
   MEMBERS_AUTH_MODE=accounts
   SUPABASE_URL=https://SEU_PROJETO.supabase.co
   SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICA
   SUPABASE_SECRET_KEY=SUA_CHAVE_SECRETA
   ```

   Nunca use `NEXT_PUBLIC_` para a chave secreta; não a envie em chat, commit ou
   captura de tela. A senha do banco não é necessária para o site.
5. Reinicie o servidor local. Cadastre sua própria conta em `/membros`.
6. Edite os dois valores de exemplo de `supabase/bootstrap-admin.sql` e execute-o
   no SQL Editor. Isso vincula seu player e cria o primeiro administrador ativo.
   O script se recusa a executar se já existir administrador ativo.
7. Entre na sua conta e abra o menu **Administração → Gerenciar membros**, na área de membros.

Enquanto `MEMBERS_AUTH_MODE` não for `accounts`, o fluxo anterior continua ativo.
Com `accounts` ativo, configuração incompleta ou indisponibilidade do Supabase
**não** liberam acesso pela senha antiga. Nunca volte a `legacy` como forma de
reativar um membro: isso tornaria a senha compartilhada válida novamente.

## Uso pela liderança

- Cada pessoa cria a conta com nome/nick, e-mail e senha. Ela nasce pendente e
  não tem acesso ao relatório, às ferramentas nem à liderança.
- A lista de player vinculado usa os jogadores da planilha. Configure
  GOOGLE_SHEETS_SCRIPT_URL e GOOGLE_SHEETS_SCRIPT_TOKEN no ambiente do servidor.
  Conta e player continuam sendo registros distintos.
- Na conta pendente, escolha o player, a situação **Ativo** e a permissão.
  Somente administradores ativos podem fazer isso. Um player só pode estar
  vinculado a uma conta. Os cadastros inativos preservam o vínculo; para
  transferi-lo a outra conta, desvincule a conta anterior primeiro.
- **Inativo** bloqueia novas consultas e elimina as sessões existentes. A tela
  de membros verifica o acesso a cada 30 segundos e ao voltar para a aba.
  Dados já vistos/baixados não podem ser apagados do dispositivo remotamente.
- Para reativar, mantenha/corrija o vínculo e escolha **Ativo**.
- **Redefinir senha** exige a nova senha duas vezes e encerra as sessões antigas.
  A senha é enviada ao Supabase Auth, nunca armazenada no cadastro ou no log.
  Combine sua entrega diretamente com o membro. Administradores não podem
  consultar senhas anteriores nem redefinir a própria senha nesta tela; outro
  administrador deve fazê-lo. É recomendável ter dois administradores ativos.
- Um último administrador ativo não pode ser inativado ou rebaixado.

Não existe descoberta automática de saída da aliança: a liderança atualiza o
estado manualmente. Nick é usado na leitura do histórico atual; a migração de
pontuações e aliases de nick será uma etapa separada.

## Proteções e sessões

- Cookies HttpOnly, SameSite Strict e Secure em HTTPS. Sessão de 8 horas;
  sem token de acesso ou senha no localStorage. Preferências das calculadoras
  continuam locais, como antes.
- O banco guarda apenas SHA-256 de um token aleatório de 256 bits da sessão.
  Cada rota privada verifica novamente a conta e a permissão atuais.
- Tabelas com RLS e sem concessões para `anon`/`authenticated`; somente o
  servidor acessa os dados com chave secreta. Usuários não podem se autoaprovar
  ou promover usando metadados do cadastro ou chamadas diretas ao Supabase.
- Alterações administrativas usam uma transação PostgreSQL, com verificação
  de sessão e papel no banco, exclusividade de vínculo e auditoria sem senhas.
- Recuperação por e-mail não é oferecida. O Supabase pode continuar expondo
  endpoints nativos de Auth; eles não concedem acesso aos dados da aplicação.
- O painel de liderança também usa as contas individuais no modo `accounts`;
  as senhas compartilhadas e cookies antigos não autorizam as rotas privadas.
- As páginas públicas de calendário, aliança e galeria continuam públicas.

## Verificação antes de publicar manualmente

Crie duas contas de teste e confira cadastro pendente, aprovação, vínculo único,
login ativo, inativação com uma sessão aberta, reativação e redefinição de senha.
Confirme também que um membro comum recebe acesso negado em
`/api/members/manage` e `/api/r4/events` e que a senha antiga não entra.

`npm test` inclui testes da migração em PostgreSQL em memória (PGlite), cobrindo
RLS, aprovação, inativação, expiração, vínculo e último administrador. Esses
testes não substituem a validação com o Auth do seu projeto Supabase.

Se uma redefinição for interrompida, a conta pode permanecer com
`reset_pending=true`. O proprietário do projeto deve conferir o estado no
Supabase e terminar a alteração da senha antes de limpar esse sinalizador.
Não limpe esse estado automaticamente para contornar uma falha.

O plano gratuito tem limites e pode pausar por inatividade. Guarde exportações
do banco e da planilha; os arquivos de migração não são backup dos membros.

No WSL, se as consultas DNS IPv6/AAAA demorarem ou falharem, use `SUPABASE_FORCE_IPV4=true` em `.env.local`. Isso limita a conexão do Supabase a IPv4, preservando TLS e sem mudar o DNS do sistema. No Netlify, deixe a opção ausente ou `false`.

## Acesso único

O cabeçalho de `/membros` mostra nick e perfil. Administradores ativos veem o menu
**Administração**, com **Gerenciar membros** (`?aba=gestao`) e **Painel da liderança**
(`?aba=lideranca`). O menu lateral não possui mais uma entrada separada de liderança.
As rotas antigas redirecionam para a área de membros; o parâmetro de edição da
liderança é preservado. Membros comuns não veem o menu e não recebem os dados das
rotas administrativas. A condição de administrador permanece no servidor e nas
transações do banco.

## Lista de players e conflitos de vínculo

O seletor usa a aba Membros lida pelo Apps Script já utilizado pelo site, com
cache curto de 15 segundos separado do relatório. Configure no .env.local:

    GOOGLE_SHEETS_SCRIPT_URL=https://script.google.com/macros/s/SUA_IMPLANTACAO/exec
    GOOGLE_SHEETS_SCRIPT_TOKEN=SEU_TOKEN

Reinicie o servidor após configurar. A URL deve ser a implantação /exec do Apps
Script compatível com o site; não é o link da planilha. Não compartilhe o token.

O ID do jogo preserva a identidade quando o nick muda. Sem ID, o sistema só
reconhece o mesmo nick, ignorando maiúsculas e espaços externos; nunca faz uma
aproximação de nomes. Um vínculo antigo que não aparece mais na lista continua
visível com aviso, para a liderança corrigir explicitamente. Apenas o player
selecionado é cadastrado/atualizado no Supabase ao salvar; abrir a lista não
importa jogadores nem altera vínculos.

Players ocupados mostram a conta proprietária. A interface bloqueia a seleção,
o servidor confere novamente e a restrição UNIQUE do banco cobre alterações
simultâneas. O erro identifica nome e e-mail da conta ocupante apenas para admins.
Contas inativas também reservam o vínculo até uma desvinculação explícita.

Se a leitura da planilha falhar, a tela avisa e preserva os players já cadastrados.
O histórico de pontuações não é usado como se fosse o cadastro atual da aliança.
Esta atualização não exige uma nova migração SQL.

## Excluir pedidos pendentes

Execute uma vez `supabase/migrations/20261022_pending_request_deletion.sql` no SQL Editor do projeto. Essa migração apenas instala a funcionalidade, sem excluir contas existentes.

Administradores podem confirmar a exclusão de pedidos pendentes pelo nome e e-mail. O servidor valida o perfil e o banco bloqueia o pedido contra aprovação simultânea; a API administrativa do Supabase remove a conta Auth, com cascata do perfil e das sessões. O mesmo e-mail pode ser usado em novo cadastro. Players e pontuações da planilha não são excluídos. Contas já aprovadas ou inativadas, inclusive depois de retornarem à situação pendente, não podem ser removidas por essa função.

Se o serviço Auth falhar, o pedido permanece bloqueado e pode ser excluído novamente pelo botão. O registro de auditoria mantém a solicitação de exclusão mesmo após a remoção da conta. Nenhuma conta real é excluída ao instalar a migração ou ao executar os testes locais.

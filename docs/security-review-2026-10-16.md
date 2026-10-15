# Revisão de código e segurança — 16/10/2026

## Escopo e resultado

Revisão do código local Next.js, rotas de API, sessões, integração Google Apps Script, galeria pública, validações de metas, configuração Netlify e documentação. Não foi um teste de invasão nem uma auditoria da conta Netlify/Google. Nenhuma publicação, alteração de senha real ou mudança de permissões foi realizada.

## Problemas corrigidos

| Problema | Correção |
| --- | --- |
| Acesso de membros podia usar um hash legado embutido quando a senha de ambiente não existia. A comparação também ignorava maiúsculas/minúsculas. | MEMBERS_PASSWORD explícita, de 12 a 256 caracteres, comparação exata e nenhuma senha padrão. Sem configuração, o acesso fica fechado. |
| Login com JSON null podia causar erro interno, e o limite de corpo dependia apenas de Content-Length. | Validação do objeto, tipo de senha e Content-Type; leitura limitada a 4096 bytes, inclusive sem Content-Length e em múltiplos blocos. |
| Código de login e assinatura duplicado em membros e R4. | Módulos compartilhados session-auth.cjs e session-handlers.cjs. Papel, senha e chave participam da assinatura; alterações invalidam sessões antigas. |
| Mapa de tentativas podia continuar crescendo com IPs novos durante uma janela ativa. | Limite de 2000 chaves por instância, expiração e recusa de novas chaves quando cheio; mantém bloqueio após dez erros em quinze minutos. |
| Agregações por nome de evento usavam um objeto com protótipo padrão. | Dicionário sem protótipo, com teste para nomes especiais como __proto__ e constructor. |
| Faltavam cabeçalhos de proteção gerais. | CSP compatível com a renderização atual, bloqueio de frames, handlers inline e plugins; nosniff, no-referrer e restrição de câmera, microfone, localização e pagamentos. |
| A página pública pedia ao Apps Script o relatório inteiro para extrair apenas fotos. | Ação gallery retorna somente dados da galeria. Servidor mantém compatibilidade com a implantação anterior enquanto ela é atualizada. |
| Linhas de galeria sem Ativo marcado podiam ser interpretadas como públicas. | Somente valores explicitamente ativos são aceitos no parser e no Apps Script. |
| Pedidos de fotos públicas arbitrárias chegavam diretamente à ação photo do Apps Script. | Checagem prévia da lista ativa em cache, além da verificação de autorização feita novamente no Apps Script. |
| JavaScript público tinha um cadastro de nomes antigo sem uso; README descrevia autenticação que já não existia. | Remoção de declarações sem referências e atualização da documentação da arquitetura, configuração e limitações. |

## Pontos verificados

- APIs de membros e R4 validam a sessão no servidor e respondem sem cache público; a galeria é pública por escolha do proprietário.
- Cookies HttpOnly, SameSite Strict e Secure em HTTPS; validade de oito horas e rejeição de assinatura alterada, expirada ou de outro papel.
- POST/DELETE de sessão exigem mesma origem. Cabeçalhos de host encaminhado não autorizam origens adicionais.
- Chaves Google ficam no servidor e no corpo POST, sem NEXT_PUBLIC_. Não há arquivo .env rastreado no checkout. A busca por padrões comuns de tokens/chaves privadas nos arquivos atuais não encontrou correspondências; isso não é garantia sobre todo o histórico do Git.
- URLs de integração só aceitam HTTPS para script.google.com. O proxy de fotos não aceita uma URL arbitrária: usa ID Drive, lista ativa, MIME permitido e tamanho máximo de 4 MB.
- Metas sobrepostas ou inválidas suspendem avaliação. Regras do evento selecionado vêm da mesma leitura usada no ranking; farms e ex-membros são excluídos no servidor da análise R4.
- Campos da planilha são renderizados como texto por React. O HTML legado inserido diretamente vem de arquivos locais rastreados, sem concatenar texto da planilha.
- Não houve alteração nos dados do calendário durante esta revisão.

## Validação realizada

- 58 testes automatizados aprovados.
- npm audit: zero vulnerabilidades conhecidas nas dependências instaladas.
- Build Next.js e build Netlify offline concluídos, incluindo o empacotamento da função de servidor.
- Rotas locais: 401 sem sessão, 403 para origem diferente, 400 para JSON inválido e 200 com sessão válida; cabeçalhos de proteção presentes nas cinco páginas principais.
- Navegador: login de membros, gráficos, navegação e calculadora (10 × 250 = 2.500) funcionaram sem erros de CSP. Validação usou credenciais de teste e histórico local; não verificou as credenciais reais de produção.

## Limitações e melhorias futuras

- A limitação de login é **por instância**, não distribuída. Para tráfego hostil persistente, configurar rate limiting/WAF na plataforma ou um armazenamento compartilhado. Não foi criado serviço pago nem alterada a conta Netlify.
- As duas áreas usam senha compartilhada por grupo; não há usuários individuais, MFA ou trilha de auditoria por pessoa. Isso atende ao portal atual, mas deve ser revisto antes de armazenar dados sensíveis.
- A CSP permite scripts inline exigidos pela hidratação estática atual do Next.js e estilos inline usados na interface. Ela não é uma CSP estrita com nonce. Essa evolução exigiria revisar a estratégia de renderização/cache; não foi alegada proteção absoluta contra XSS.
- A galeria é pública; desativar uma foto não revoga cópias já salvas. Imagens e lista têm caches curtos e uma aba aberta consulta a cada minuto.
- Calculadoras e informações da aliança ainda usam HTML/JavaScript legado. Devem migrar gradualmente para componentes React; uma reescrita completa durante a revisão aumentaria o risco de regressão sem necessidade.
- Dados antigos de pontuação continuam no snapshot do repositório GitHub. Uma senha no site não torna privado o conteúdo já publicado no Git.

## Ativação

1. Antes do deploy, configure MEMBERS_PASSWORD no Netlify, escopo Functions/Runtime, produção. Use 12 a 256 caracteres e respeite maiúsculas/minúsculas. Se já estiver definida, não precisa trocar. Não envie senhas no chat.
2. MEMBERS_SESSION_SECRET pode ser uma chave própria com ao menos 32 caracteres; enquanto não definida, R4_SESSION_SECRET continua sendo usada com assinatura separada por papel.
3. Atualize scripts/google-sheets/Code.gs e publique Nova versão na implantação existente. Preserve URL /exec, DASHBOARD_TOKEN e as abas atuais. Não precisa executar novamente as funções setup.
4. Faça o commit e deploy da aplicação. Sessões existentes serão invalidadas pela nova assinatura; entre novamente.

O Apps Script anterior permanece compatível enquanto a atualização é feita, mas as novas proteções de validação do próprio script só entram em vigor após publicar a nova versão.

Referências: [cabeçalhos no Next.js](https://nextjs.org/docs/pages/api-reference/config/next-config-js/headers), [CSP no Next.js](https://nextjs.org/docs/app/guides/content-security-policy).

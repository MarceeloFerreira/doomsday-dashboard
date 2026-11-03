# Conectar Hist. Pontuações por Google Apps Script

O script já foi preparado em `scripts/google-sheets/Code.gs`.
A planilha continua privada; o aplicativo da Web exige a chave configurada para retornar histórico, cadastro, regras ou fotos autorizadas e manter a aba Pompeia. A chave vai no corpo POST,
não no endereço. A integração deve ser validada no ambiente publicado após atualizar a implantação.

1. Na sua planilha, abra **Extensões > Apps Script**.
2. Copie o conteúdo de `Code.gs` para o editor.
3. Em **Configurações do projeto > Propriedades do script**, crie `DASHBOARD_TOKEN`
   com uma chave aleatória longa (mínimo 32 caracteres). Guarde-a em um gerenciador
   de senhas. Não envie a chave no chat nem coloque no código público.
4. Clique em **Implantar > Nova implantação > Aplicativo da Web**.
5. Configure **Executar como: você** e permita chamadas sem login Google.
   Se a conta não permitir esse acesso, será necessária outra forma de autenticação.
   A URL da aplicação fica acessível externamente, mas o script verifica a chave
   antes de ler a planilha. Não altere o compartilhamento da planilha.
6. Autorize a execução na sua conta Google e copie a URL terminada em `/exec`.
   Pode passar essa URL para a integração; ela não contém a chave.

No servidor Next.js, guardar a URL em `GOOGLE_SHEETS_SCRIPT_URL` e a chave em
`GOOGLE_SHEETS_SCRIPT_TOKEN`, como variáveis privadas de ambiente. Nunca usar
prefixo `NEXT_PUBLIC_`. Não enviar a chave ou URL com chave ao navegador.

O servidor chama a URL via POST JSON `{"token":"valor da variável privada"}`.
A resposta válida contém `ok`, `sheet`, `fetchedAt` e `values` (matriz de células
exibidas). Após obter acesso, conferir as colunas reais antes de adaptar os dados
para os cálculos existentes do dashboard. Não presumir formato de linhas/colunas.

Configuração planejada: buscar ao entrar na área de membros e atualizar a cada
cinco minutos enquanto estiver aberta. Não depende do PC local quando o Next.js
estiver hospedado. A rota do Next.js deverá exigir uma sessão de membro válida;
a trava visual antiga não protege uma planilha privada.

Não precisa de gatilho semanal ou `onEdit`: cada leitura consulta os dados atuais.
As cotas do Apps Script e o intervalo de cache limitam a frequência de atualização.

Referência: https://developers.google.com/apps-script/guides/web

A ação `gallery` retorna apenas a aba Queimadinhos, sem pontuações, membros ou regras. Fotos exigem Ativo explicitamente marcado. Alterações no código do Apps Script exigem Nova versão na implantação; edições nas linhas das abas não exigem deploy.

## Pompeia: escalações e pontuações

O código agora também mantém as abas dedicadas **Pompeia** e **Pompeia Edições** na mesma planilha. Atualize a implantação existente com uma nova versão de `Code.gs`; preserve a URL e as propriedades. As abas são criadas automaticamente na primeira finalização feita pela calculadora da liderança. Ações `pompeii_history`, `pompeii_finalize` e `pompeii_score` exigem o mesmo token privado; o servidor autoriza somente administradores ativos antes de chamá-las.

A finalização salva uma linha por inscrito, com a edição, lado e atuação. O aviso fica em uma linha por edição na aba **Pompeia Edições**, vinculado pelo ID da edição. A coluna **Pontos (J)** fica vazia para preenchimento posterior na planilha ou no site. Zero é um valor válido, diferente de campo vazio. Preserve os cabeçalhos e as colunas de identificação. A aba `Hist. Pontuações` mantém seu formato e seus dados. Consulte `docs/pompeii.md` para detalhes de finalização, concorrência e acompanhamento.

A aba **Pompeia Edições** também contém Resultado, Participantes, Oponentes e Aliança adversária. Para adicionar essas colunas às edições já salvas sem apagar dados, execute uma vez `setupPompeiaEdicoes` no editor após atualizar o código e publique uma nova versão da implantação. Resultado oferece Vitória/Derrota; Participantes começa com a quantidade da escalação e pode ser corrigido após o evento. Oponentes e aliança vêm dos campos opcionais da calculadora e também podem ser preenchidos na planilha.

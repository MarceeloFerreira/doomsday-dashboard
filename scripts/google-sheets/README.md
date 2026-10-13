# Conectar Hist. Pontuações por Google Apps Script

O script já foi preparado em `scripts/google-sheets/Code.gs`.
A planilha continua privada; o aplicativo da Web só retorna os valores da aba
Hist. Pontuações quando recebe a chave configurada. A chave vai no corpo POST,
não no endereço. A integração ainda precisa ser implantada e validada com dados
reais: o acesso atual à planilha retorna 401.

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

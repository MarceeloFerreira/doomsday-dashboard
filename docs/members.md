# Área de membros e Queimadinhos

## Desempenho

A área de membros lê Hist. Pontuações com a mesma integração do Google usada pela liderança, a cada cinco minutos. Gráficos e rankings mostram resultados gerais e individuais, sem poder, tropa, metas ou avaliações da liderança. Ausência de registro permanece diferente de pontuação zero. O histórico salvo é uma alternativa identificada na tela quando a leitura falha.

A senha antiga de membros continua válida. O acesso passa a ser verificado no servidor, com cookie HttpOnly de oito horas. Os visitantes precisam entrar novamente uma vez após esta atualização. O localStorage antigo não autoriza consultas. MEMBERS_PASSWORD é opcional para trocar a senha; MEMBERS_SESSION_SECRET é opcional e usa R4_SESSION_SECRET quando vazio, com assinatura e papel separados. Nenhuma variável nova é obrigatória se R4_SESSION_SECRET já estiver configurada.

## Ativar a galeria uma vez

1. Atualize o Apps Script com o conteúdo completo de scripts/google-sheets/Code.gs.
2. Selecione e execute setupQueimadinhos no editor do Apps Script. Autorize o acesso à planilha e ao Drive da conta proprietária. A função cria a aba se ela não existir e não sobrescreve uma aba existente.
3. Em Implantar → Gerenciar implantações, edite o aplicativo da Web e selecione Nova versão. Mantenha executar como proprietário e o acesso que já permite ao servidor chamar o script. A URL /exec e DASHBOARD_TOKEN continuam os mesmos.
4. Publique as alterações do site uma vez. A partir daí, adicionar fotos não exige deploy.

## Adicionar um churrasco

Envie uma captura para uma pasta do seu Google Drive acessível à conta que executa o Apps Script. Copie o link do arquivo (https://drive.google.com/file/d/ID/view), mesmo que privado. Na aba Queimadinhos, preencha:

| Data | Player | Foto | Legenda | Ativo |
| --- | --- | --- | --- | --- |
| 13/10/2026 | Nome do jogador | Link do arquivo no Drive | Esqueceu o abrigo, virou rodízio. | checkbox marcado |

As imagens do Drive são servidas pelo aplicativo apenas a membros autenticados; não é necessário torná-las públicas. Use JPG, PNG, WebP ou GIF até 4 MB. O script só lê arquivos presentes em linhas ativas da galeria. Legenda vazia recebe uma frase padrão. Desmarcar Ativo remove a foto da próxima leitura automática; uma imagem já carregada pode permanecer no cache privado do navegador por cinco minutos.

Também é aceito um link HTTPS direto de uma imagem hospedada publicamente. Essa alternativa mantém a visibilidade definida no serviço de origem.

Sem imagens reais cadastradas, a galeria mostra um estado vazio; nenhuma ocorrência é inventada. As capturas de desempenho local podem usar o histórico salvo quando as variáveis de Google Sheets não estão definidas no servidor de teste.

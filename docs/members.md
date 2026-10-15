# Área de membros e galeria pública Queimadinhos

## Desempenho

A área de membros lê Hist. Pontuações com a mesma integração do Google usada pela liderança, a cada cinco minutos. Gráficos e rankings mostram resultados gerais e individuais, sem poder, tropa, metas ou avaliações da liderança. Ausência de registro permanece diferente de pontuação zero. O histórico salvo é uma alternativa identificada na tela quando a leitura falha.

O acesso é verificado no servidor, com cookie HttpOnly de oito horas. MEMBERS_PASSWORD é obrigatória, tem de 12 a 256 caracteres e distingue maiúsculas/minúsculas. Não existe senha padrão ou fallback legado. MEMBERS_SESSION_SECRET é opcional e usa R4_SESSION_SECRET quando vazia, com assinatura e papel separados; uma chave própria é recomendada. Alterar a senha/chave invalida as sessões existentes. O localStorage não autoriza consultas.

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

A galeria agora tem página própria em /queimadinhos, com menu abaixo de Nossa aliança, e é pública por escolha do proprietário. O arquivo pode permanecer privado no Drive, mas as imagens cadastradas em linhas ativas são exibidas publicamente pelo site. Use JPG, PNG, WebP ou GIF até 4 MB. O script só lê arquivos presentes em linhas ativas da galeria. Somente linhas explicitamente marcadas como Ativo são publicadas. Legenda vazia recebe uma frase padrão. Desmarcar Ativo remove a foto da próxima leitura automática; a lista tem cache de 15 segundos, a página consulta a cada minuto e as fotos públicas têm cache de até 60 segundos. Cópias já salvas por visitantes não podem ser revogadas.

Também é aceito um link HTTPS direto de uma imagem hospedada publicamente. Essa alternativa mantém a visibilidade definida no serviço de origem.

Sem imagens reais cadastradas, a galeria mostra um estado vazio; nenhuma ocorrência é inventada. As capturas de desempenho local podem usar o histórico salvo quando as variáveis de Google Sheets não estão definidas no servidor de teste.

## Atualização da página pública

Atualize o Apps Script e publique Nova versão na implantação existente, mantendo URL e token. Não execute setupQueimadinhos novamente se a aba já existe. O script agora lê o destino real dos hyperlinks, mesmo quando a célula mostra apenas o nome da foto.

A galeria tem cache independente de 15 segundos e consulta automática a cada minuto. Ela não retorna pontuações, poder, tropas ou metas. Links antigos /membros?aba=queimadinhos redirecionam para /queimadinhos. A aba interna foi removida.


## Meu desempenho como entrada principal

Após entrar, a página abre em Meu desempenho e pede a seleção do nick, com busca por nome. Depois da escolha, o seletor fica compacto e o botão Trocar nick permite mudar. A seleção do nick é uma escolha de visualização, não uma identidade autenticada individual.

Os filtros permitem escolher o evento, abrir uma data específica ou analisar um período. Uma edição específica prevalece sobre o período; Voltar ao panorama restaura a janela de análise. A visão da aliança fica como alternativa, preservando os filtros e o nick escolhido.

O painel individual mostra total, média por registro, melhor resultado, posição por total no recorte e destaque da edição. A comparação anterior usa apenas o mesmo evento e o último registro anterior daquele jogador; zero anterior não gera percentual infinito. O gráfico de evolução mantém até oito edições anteriores do mesmo evento quando uma edição específica está aberta, sem incluir datas posteriores.

O gráfico de perfil mostra a média do jogador por evento e a média das edições da aliança em que esse jogador tem registro, com o mesmo peso por edição. Ausências são excluídas da média; zeros registrados são incluídos. Eventos diferentes têm escalas próprias. O histórico em tabela permite abrir cada edição. Não são exibidos metas, tropas, poder ou avaliações da liderança.

Essa alteração usa o relatório de membros existente; não exige novas colunas ou atualização do Apps Script.

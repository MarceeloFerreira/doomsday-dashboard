# Configurar as metas da liderança

## Ativar uma vez

1. Abra o projeto Apps Script que já lê a planilha da BoPE.
2. Substitua o conteúdo de Code.gs pelo arquivo Code-RegrasMetas.gs fornecido nesta entrega e salve. Preserve a propriedade DASHBOARD_TOKEN.
3. No seletor de funções, escolha **setupRegrasMetas** e clique em **Executar**. Autorize se o Google solicitar. A função cria a aba RegrasMetas com as três regras atuais. Se a aba já existir, não modifica nada.
4. Abra **Implantar → Gerenciar implantações → Editar → Nova versão → Implantar**. Mantenha a mesma URL /exec.
5. Faça o commit e deploy da aplicação atualizada no Netlify.

Depois dessa ativação, basta editar a aba RegrasMetas. Não precisa atualizar o Apps Script ou publicar novamente para mudar uma meta.

## Colunas da nova aba

| Evento | Tropa | Poder acima de | Poder até | Tipo de meta | Meta | Ativo |
| --- | --- | --- | --- | --- | --- | --- |
| Arquipélago | T5 | | | Percentual | 30 | marcado |
| Arquipélago | T6 | | 180000000 | Pontos | 80000000 | marcado |
| Arquipélago | T6 | 180000000 | | Pontos | 120000000 | marcado |

- **Evento:** Arquipélago, Gênesis ou Insular. Cada linha pertence somente ao evento informado. Também aceita os códigos A, G e I. Nomes de outros eventos devem corresponder ao histórico.
- **Tropa:** T5, T6 etc., igual ao cadastro do jogador em MembrosAlianca.
- **Poder acima de:** limite inferior exclusivo. 180M significa poder estritamente maior que 180 milhões. Vazio começa em zero.
- **Poder até:** limite superior inclusivo. 180M inclui exatamente 180 milhões. Vazio significa sem limite superior.
- **Tipo de meta:** Pontos para meta fixa ou Percentual para proporção do poder.
- **Meta:** em Pontos, use 80000000 ou 80M. Em Percentual, use 30 ou 30% para trinta por cento; não use 0,30 para esse caso.
- **Ativo:** marque para aplicar. Desmarque para desativar.

Exemplo adicional, apenas ilustrativo: uma linha Gênesis / T6 / limites vazios / Pontos / 25M / marcado cria uma meta de 25 milhões para T6 no Gênesis, sem alterar Arquipélago. Esse exemplo não é criado automaticamente.

Os três pontos no topo mostram as regras do evento selecionado. Se você adicionar mais regras, o quadro mostra todas. Sem regra ativa para a tropa/faixa/evento, o jogador fica **Sem avaliação**. Faixas sobrepostas ou regras ativas inválidas geram aviso e suspendem todas as avaliações até a correção. Uma aba válida apenas com o cabeçalho significa nenhuma meta; não restaura metas padrão.

Enquanto o Apps Script antigo não enviar RegrasMetas, as três regras originais do Arquipélago continuam disponíveis e o painel avisa que usa regras padrão. O acesso à aba e às regras permanece restrito à liderança.

## Quem aparece na análise

Na aba MembrosAlianca, configure **Tipo = conta** e **Esta na aliança ? = Sim**. Farms, ex-membros e jogadores sem cadastro confirmado ficam fora do ranking, dos gráficos, dos totais e da lista de membros sem registro. Os nomes devem corresponder ao histórico.

O histórico e as comparações usam o mesmo grupo de contas atuais. Poder, tropa e regras também são os valores atuais; não são uma reconstrução das condições antigas. Se o cadastro não puder ser lido, a aplicação suspende os gráficos/listagens para não misturar farms nem mostrar zeros como resultados reais.

## Quando uma edição aparece

A página consulta a cada cinco minutos e o servidor tem cache de cinco minutos. Uma edição pode levar até aproximadamente dez minutos para aparecer numa página aberta. Após o cache expirar, recarregar ou clicar em Atualizar dados antecipa a consulta da página.

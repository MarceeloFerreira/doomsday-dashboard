# Times da Pompeia

Acesso: **Membros → Liderança → Times da Pompeia**, em `/membros?aba=pompeia`.
Exige conta individual de administrador ativo. O servidor verifica a sessão em toda leitura e gravação; a senha compartilhada antiga não autoriza essa API.

## Ativação

Execute no SQL Editor do Supabase do projeto:
`supabase/migrations/20261103_pompeii_roles.sql`.

A migração adiciona `pompeii_roles` à tabela existente `alliance_players` e uma função privada de gravação auditada. Não altera permissões de contas, senhas ou vínculos de jogadores. É possível reaplicar o SQL. Sem a migração, a página informa a pendência e desabilita a gravação de funções; os cadastros existentes continuam funcionando.

A planilha continua sendo a fonte de jogadores atuais, poder e tropas. As funções são armazenadas no Supabase, sem exigir nova implantação do Apps Script ou coluna na planilha. São incluídas as linhas com Tipo = conta e Está na aliança? = Sim, mesmo sem conta de acesso ao site. Farms e ex-membros não são inscritos automaticamente.

## Uso

1. Marque as funções que cada jogador pode cumprir (Rally, Guarnição, Campo e/ou Incubadora) e clique em **Salvar funções** na linha. A mesma pessoa pode ter várias capacidades; ela só ocupa uma função essencial na edição.
2. Selecione os inscritos e clique em **Calcular equipes**. Selecionar resultados respeita a busca e mantém os demais inscritos.
3. Confira os lados Verde e Roxa. Cada lado precisa de um rally, um responsável pelo Heliponto e outro pela Base de Operações. As guarnições sempre usam jogadores diferentes.
4. Arraste entre os lados ou use **Mover** no celular/teclado. Mudar a atuação para uma vaga já ocupada libera o antigo responsável para campo ou zumbis. Mover um especialista para um lado onde a vaga já está ocupada o coloca no apoio; confira o aviso de vaga deixada no lado anterior.
5. Informe opcionalmente a quantidade de adversários. O aviso é atualizado automaticamente, pode ser editado e conta caracteres. Campo e apoio aparecem nos zumbis; os seis responsáveis por rally/guarnições ficam fora dessa lista. A cópia exige equipes sem pendências e até 1.500 caracteres. Para listas maiores, a estratégia é compactada automaticamente, preservando todos os nomes; se ainda exceder o limite, a cópia fica bloqueada para revisão manual.

**Salvar rascunho** guarda inscritos, distribuição e adversários somente neste navegador, por conta de administrador. **Restaurar rascunho** confere a lista atual. O rascunho não sincroniza a escalação entre administradores e não guarda edições manuais no texto. As funções salvas do cadastro são compartilhadas. Atualizar membros ou alterar inscritos exige recalcular a distribuição. Alterações nas equipes, adversários ou funções salvas substituem edições manuais do aviso.

## Critérios e limites

A distribuição primeiro procura seis jogadores distintos com as capacidades exigidas, depois equilibra a quantidade e o poder informado. Trocas entre os lados reduzem a diferença de poder sem perder as capacidades das vagas. É uma heurística, sem promessa de solução global ótima. Poder não representa a força real de rally, guarnição ou combate em campo. O cadastro não contém equipamento, heróis ou capacidade de esquadrões; a liderança deve revisar a escalação.

Poder ausente conta como zero na soma, com indicação na interface. Função ausente não é presumida: o jogador entra no apoio a zumbis. Falta de especialistas deixa vagas em aberto e bloqueia a cópia até a liderança ajustar as funções ou os inscritos. O pareamento só é incluído quando informado; não é calculado nem consultado no servidor do jogo.

Identidade: o ID do jogo tem prioridade sobre o nick. Gravar funções para um jogador sem conta no site cria apenas seu registro de jogador, sem criar ou aprovar conta. Não altera vínculo de acesso de nenhuma pessoa. Sem ID, mudanças de nick exigem revisão do cadastro.

## Validação

`npm test` cobre distribuição, múltiplas capacidades, vagas ausentes, ajustes manuais, aviso, lista atual e gravação/permissões SQL em PostgreSQL em memória. `npm run build` valida a integração Next.js.

## Histórico compartilhado e pontos na planilha

Atualize também a implantação existente do Apps Script usando a versão completa de `scripts/google-sheets/Code.gs`: **Implantar → Gerenciar implantações → Editar → Nova versão → Implantar**. Preserve a URL existente, a chave e as propriedades do script. A nova versão mantém as leituras existentes e adiciona três ações autenticadas, chamadas somente pelo servidor após verificar o administrador: `pompeii_history`, `pompeii_finalize` e `pompeii_score`.

A primeira finalização cria as abas **Pompeia** (jogadores e pontos) e **Pompeia Edições** (data, nome, aviso e finalização) na mesma planilha. Não modifica a aba `Hist. Pontuações` nem mistura as regras/metas dos outros eventos. Não é necessário criar nova planilha ou mudar seu compartilhamento. Uma atualização de código no repositório não atualiza automaticamente a implantação do Apps Script.

Após revisar as equipes e o aviso, informe a data e o nome da edição e use **Finalizar e salvar na planilha**. A gravação captura nomes, IDs, lados, atuações, poder/tropa de referência e aviso daquela edição. A data inicial usa Lisboa. As edições permanecem independentes do cadastro atual e são acessíveis aos administradores, inclusive depois de um jogador sair da aliança. A escalação finalizada é um registro do que foi planejado; não confirma comparecimento no jogo.

**Pontos** é a coluna J, com fundo amarelo. Preencha somente essa coluna, com números inteiros sem sinal negativo, ou use os campos de pontos no histórico da calculadora. Branco significa ainda não informado; zero significa pontuação zero registrada. Preserve as colunas de identificação e as linhas da escalação. O histórico recusa cabeçalhos alterados, IDs duplicados e valores de pontos inválidos em vez de convertê-los para zero.

A interface permite escolher a edição, consultar os lados e o aviso salvo, informar os pontos individuais e comparar os totais dos lados. O acompanhamento por jogador mostra edições, registros preenchidos, soma e média (calculada só sobre pontos informados). Use **Atualizar histórico** após editar diretamente na planilha. Totais parciais mostram quantos pontos foram preenchidos.

A finalização usa um ID único e trava de escrita no Apps Script: repetir a mesma requisição não duplica linhas nem limpa pontos já preenchidos. A mesma data/nome não pode ser finalizada novamente com outro ID; diferencie os nomes se houver duas edições no mesmo dia. O histórico não é reescrito ao recalcular equipes. Pontuações conferem o valor anterior antes da gravação para detectar alterações feitas por outro administrador ou diretamente na planilha. Em caso de conflito, atualize o histórico e confira o valor atual antes de tentar de novo.

Sem atualizar o Apps Script, a calculadora continua disponível, mas o histórico/finalização informa a necessidade de implantação. Não são criadas linhas fictícias na planilha real durante os testes. O rascunho local e o histórico finalizado têm finalidades distintas: só o histórico da planilha é compartilhado entre administradores.

## Avisos separados e integração com Desempenho

A aba **Pompeia** agora tem dez colunas, de A até J: ID Edição, Data, Edição, Lado, ID Player, Player, Função, Poder, Tropa e Pontos. O campo editável de pontuação permanece em J.

A aba **Pompeia Edições** tem uma linha por edição: ID Edição, Data, Edição, Aviso e Finalizado em. O aviso usa recorte visual e altura de linha fixa para não expandir a tabela. A ligação com os jogadores é pelo ID Edição. Excluir uma linha de jogador não exclui o aviso. Se a gravação da segunda aba falhar, repetir a finalização recupera a edição sem duplicar jogadores nem apagar pontuações; edições novas incompletas não são exibidas no histórico até a finalização ser concluída.

A leitura mantém compatibilidade com o formato antigo de doze colunas. Não há migração destrutiva automática. Para o teste inicial descartável, o proprietário pode excluir a aba Pompeia antiga após atualizar a implantação do Apps Script; as novas abas são criadas na próxima finalização. O SQL do Supabase não precisa de nova alteração.

**Desempenho** lê também as pontuações dessa aba, além do histórico dos demais eventos. Pompeia aparece como evento próprio nos filtros, gráficos, médias e histórico pessoal/da aliança. O relatório de membros recebe somente dados de pontuação e identificação da edição, sem o aviso nem os dados de planejamento exclusivos da liderança.

Campos de pontos em branco ficam fora das estatísticas, zero é preservado e as edições parcialmente preenchidas são identificadas. Uma edição inteiramente sem pontos permanece no histórico da calculadora e só entra em Desempenho quando houver algum valor informado. Os IDs separam duas Pompeias no mesmo dia e também Pompeia de outro evento na mesma data. Alterações de nick são resolvidas pelo ID do jogo ao relacionar o histórico ao cadastro atual. Em datas com edição na aba dedicada, uma cópia manual de pontos da Pompeia em Hist. Pontuações não é somada novamente. Os demais eventos continuam com sua fonte atual.

Para atualizar os pontos de Pompeia no Desempenho após preenchê-los, use **Atualizar dados**. A leitura da aba dedicada é feita na consulta do relatório; não depende do cache de cinco minutos dos eventos antigos. Se essa leitura falhar, o site avisa e mantém disponíveis os resultados dos demais eventos.

## Pompeia em Eventos e metas

O painel **Membros → Eventos e metas** também lê os pontos das abas dedicadas da
Pompeia. O filtro **Pompeia** inclui ranking, totais, gráficos, comparação com a
edição anterior e cumprimento de metas. Nomes e IDs distinguem edições no mesmo
dia. Somente contas de membros atuais entram nos indicadores, como nos demais
eventos. Pontos em branco não são tratados como zero; edições incompletas aparecem
como parciais e edições inteiramente sem pontos aguardam algum valor informado.

As metas usam as regras ativas da aba **RegrasMetas**. Na coluna **Evento**, use
`Pompeia`, `Pompéia` ou `P`; as três formas identificam o mesmo evento. As colunas
de tropa, faixa de poder e meta percentual ou em pontos seguem o funcionamento dos
outros eventos. Regras desativadas são ignoradas e, sem regra aplicável, o jogador
fica **Sem avaliação**. Nenhuma meta de outro evento é aplicada automaticamente.
Alterações nas regras seguem o cache de leitura da planilha de até cinco minutos.
Esta integração utiliza as ações já existentes do Apps Script e não exige novo SQL.

## Responsabilidade adicional: Incubadora

Aplique `supabase/migrations/20261103_pompeii_incubadora.sql` após a migração inicial de funções. O SQL atualiza a restrição de valores permitidos e a função privada de gravação, preservando os cadastros e funções existentes. Não exige atualizar o Apps Script.

Marque **Incubadora** no cadastro e salve para indicar quem deve capturá-la. Todos os inscritos com essa marca aparecem na linha **Incubadora**, logo abaixo de **Zumbis** no aviso; jogadores não inscritos ficam fora. A responsabilidade pode coexistir com Campo e outras funções. Os jogadores continuam na lista de zumbis quando sua atuação principal for Campo ou Apoio; rally e guarnições continuam fora dos zumbis. A captura é uma responsabilidade adicional e não substitui as seis vagas principais.

O cálculo tenta equilibrar a quantidade de responsáveis pela captura entre os lados, respeitando as capacidades das vagas e a quantidade de jogadores. Não impõe quantidade mínima de incubadores. Se nenhum inscrito tiver a marca, o aviso mostra **Incubadora: A definir**. É possível continuar com as decisões manuais da liderança. As edições finalizadas preservam essa atribuição no aviso salvo em Pompeia Edições; a coluna Função da aba Pompeia continua registrando a atuação principal.

## Resultado, participantes, oponentes e aliança adversária

A aba **Pompeia Edições** agora acrescenta quatro colunas ao fim do cabeçalho: **F: Resultado**, **G: Participantes**, **H: Oponentes** e **I: Aliança adversária**. A ordem e o conteúdo das cinco colunas originais são preservados.

Atualize o código do Apps Script e execute uma vez **setupPompeiaEdicoes** pelo seletor de funções do editor. Ela adiciona os novos cabeçalhos às abas já existentes, cria a lista de escolha Vitória/Derrota e preenche Participantes com o tamanho da escalação existente quando o campo está vazio. Avisos, IDs, pontos e valores já preenchidos são preservados; executar novamente não apaga o que foi informado. Depois publique uma nova versão na implantação existente. Não é necessário apagar as abas nem executar novo SQL no Supabase.

Nas novas finalizações, Participantes recebe automaticamente a quantidade de inscritos na escalação; isso não confirma presença real no jogo. Corrija o número na planilha depois da batalha se houver faltas. Oponentes recebe o valor informado na calculadora, ou permanece em branco quando desconhecido. Aliança adversária pode ser informada no formulário de finalização ou depois na coluna I. Resultado começa em branco e deve ser preenchido após a batalha, escolhendo Vitória ou Derrota na coluna F.

Os quatro campos aparecem na consulta da edição no histórico do site. Após alterá-los na planilha, use **Atualizar histórico**. Eles não alteram os pontos individuais nem as médias do Desempenho. Alterações posteriores nesses campos são mantidas se uma requisição de finalização for repetida.

# Planejamento de conjuntos e liderança — 03/11/2026

A opção **Planejar armamentos e liderança** distribui conjuntos completos entre
esquadrões, com um conjunto somente no líder de cada dupla. O assistente mantém
as habilidades permitidas para sua posição; seu armamento não é somado.
O exemplo inicial editável usa 4 conjuntos de Infantaria e 1 da categoria Líder,
menos desenvolvido. A opção começa desativada e a configuração é salva no navegador.

## Evidência e limites

O snapshot local validado de 03/11/2026 (1.62.0 build 13, patch 12, manifesto
4218D2AB12) contém o texto PT/EN de ID 3578813929, informando que o armamento do
herói de suporte não entra em vigor. As afinidades são separadas: no hero,
Miyamoto/Riven têm HeroTag 101 e SuitId [1,11]; Claude/Isabella têm HeroTag 104
e SuitId [4,14]. As categorias dos equipamentos estão em EquipmentTag de
hero_new_equipment_base. A categoria Líder é diferente do papel de líder da dupla.

O planejador associa conjuntos à categoria do herói. Não modela aproveitamento
parcial de equipamento fora dessa afinidade, nem afirma que seja fisicamente
impossível equipá-lo. A força relativa (menos/semelhante/mais desenvolvido) é
informada pelo usuário; não é inferida de raridade, poder exibido ou nome do herói.
Os conjuntos não têm atributos individuais importados, então a numeração apenas
identifica a distribuição, sem presumir que o conjunto 1 seja mais forte que o 4.

## Busca global

Considera ambas as ordens de cada dupla e combina até 5 esquadrões com inventário
compartilhado, sem repetir heróis nem conjuntos. Primeiro busca a quantidade
máxima de esquadrões viável; entre essas formações, prefere a categoria com
desenvolvimento relativo superior, preservação de bônus de posição, sinais
ofensivos opcionais e as regras de sinergia. A busca é limitada, não prova um
ótimo global. Regenerar mantém as mesmas restrições e pode preservar duplas se
não houver alternativas com a mesma quantidade de esquadrões.

Uma habilidade explicitamente exclusiva de líder, como a de Isabella, não entra
na leitura do kit quando ela é assistente. A perda é descrita. Reduções de Fúria
de Chun/Jaden como assistentes permanecem expostas, sem simular seu dano efetivo.
Talentos, níveis reais e outras condições ainda precisam da avaliação do jogador.

**Priorizar pressão ofensiva em eventos** considera categorias de fonte de dano,
área, recorrência e enfraquecimento de alvo nos desempates, sem criar um DPS ou
converter fator de dano em mortos, feridos graves, baixas ou pontos. A regra de
pontos depende do evento e não foi importada. Mais esquadrões não garantem mais
pontos nem melhor troca: a opção **Incluir o conjunto Líder menos desenvolvido**
pode ser desmarcada para comparar uma formação de até 4 com a de até 5.

Não foram lidos atributos da conta ou testados combates no servidor. A recomendação
é de distribuição/ordem e compatibilidade, não uma previsão de resultado PvP.

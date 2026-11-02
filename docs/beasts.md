# Bestas para membros

`/bestas` aparece somente na navegação de membros autenticados. O proxy protege a página e `/api/beasts` verifica a sessão antes de ler `data/beasts.json`. A API responde com `private, no-store` e `Vary: Cookie`; não existe cópia pública do JSON. Após login, `destino=bestas` retorna para a ferramenta.

## Dados

25 bestas (17 lendárias e 8 épicas) do dicionário revisado em 27/10/2026: classe máxima, quatro habilidades de líder e três de suporte por besta. As seis habilidades especiais disponíveis no catálogo podem ser consultadas, mas ainda não participam da comparação. Nomes PT/EN, IDs e vínculos Id + Lv são preservados. Não se presume que a presença no cliente confirme disponibilidade na conta.

Atualização: `python3 scripts/import-beasts.py CAMINHO_DO_DICIONARIO data/beasts.json`, seguida de testes e build. O importador aceita somente extração sem erros e não troca habilidades comuns por variantes.

## Comparação inicial

Somente bestas épicas e lendárias, completas e marcadas como possuídas. Raras (javalis) e comuns (cães) ficam fora por decisão de produto. O importador e o recomendador aplicam o mesmo recorte. Cada par é ordenado: uma líder e outra de suporte. As duas orientações são avaliadas e a melhor recebe a pontuação da dupla. Para 25 bestas existem 600 orientações candidatas. Os elementos não são tratados como classes de tropa.

A tela gera até 5 esquadrões sem repetir nenhuma besta entre funções ou duplas; elencos menores usam `floor(quantidade / 2)` e os demais ficam de reserva. A busca limitada compara a sinergia total do conjunto usando o mesmo motor da aba Heróis. “Gerar novas combinações” exclui as duplas anteriores (inclusive inversões de líder/suporte) e prioriza formações ainda não exibidas. Com duas bestas, mostra a melhor orientação e explica por que não há outros parceiros.

Pontos fortes e de atenção aparecem lado a lado. Os cuidados citam a besta, sua função, a habilidade e o trecho da condição: combos, críticos, contra-ataques, escudo, elemento do inimigo e janelas de ativação. Habilidades especiais ficam fora desse cálculo. Alterar elenco, cenário ou inimigo invalida os resultados; filtros e plano de chips preservam a formação.

A complementaridade usa regras estruturadas por função, com vínculos direcionais: o que a suporte fornece e qual habilidade da líder aproveita; o que a líder fornece e qual efeito da suporte é favorecido. Deixa de pontuar a simples presença do mesmo mecanismo nas duas descrições. O elemento não recebe bônus de igualdade nem de diversidade; só entra quando uma habilidade o exige explicitamente.

A busca das cinco duplas compara lexicograficamente a soma de `pet_level.Might` das líderes (poder base do nível de referência), a soma da pontuação de complementaridade, a cobertura dos vínculos direcionais e a utilidade da suporte. Preserva a base das líderes antes de desempatar pela sinergia, sem usar a raridade como regra fixa. O motor soma vetores de critérios diretamente, sem codificar critérios em potências que perderiam os últimos desempates por precisão numérica.

Não simula dano, chance de vitória, probabilidades reais de gatilho ou inventário da conta. Os chips têm um plano separado por dupla e não alteram essa ordenação.

Condições de invasão e guarnição são filtradas para o cenário. Bônus contra elemento inimigo não entram quando ele é desconhecido. O Réquiem de Asa Fúnebre é tratado de acordo com o elemento real da suporte e apenas em guarnição, sem conceder todos os efeitos de uma vez.

Os filtros de nome, raridade e elemento mantêm o elenco, permitindo montar pares de elementos diferentes. Trocar a função exibida nos cards não troca a ordem das recomendações: elas sempre avaliam as duas orientações. A seleção fica somente na tela, sem gravação na conta.

## Escolha quantitativa da líder

O catálogo inclui `combatReference` por besta, com poder base (`Might`) do nível, extraído do mesmo snapshot e manifesto: ATQ, DEF e PV de `pet_level` no nível 100, além do primeiro multiplicador e intervalo das duas habilidades periódicas de líder, vinculadas por Id + Lv. A importação valida a origem e a ordem dos slots; `--snapshot CAMINHO` permite informar o diretório quando o caminho original do dicionário não existe neste sistema.

`lib/beast-leadership.cjs` compara as duas candidatas antes da sinergia. Quando uma não perde em nenhum atributo e em nenhuma cadência comparável, recebe preferência. Caso os ataques tenham tipos diferentes (como dano direto e Corrosão), não se equiparam seus multiplicadores: usam-se os atributos base. Atributos superiores no conjunto também recebem preferência quando as habilidades apresentam compensações. Não há regra fixa de raridade, nem preferência pelo nome.

Com atributos equilibrados ou compensações entre atributos, os multiplicadores divididos pelos respectivos intervalos podem desempatar ataques do mesmo tipo. Isso compara a cadência das habilidades, sem usar uma fórmula de dano final ou multiplicar por ATQ. Quando há apenas compensações (sem dominância clara nos atributos), a complementaridade das funções tem preferência sobre o desempate numérico isolado. Persistindo empate, usa ATQ/PV/DEF em campo e invasão, ou DEF/PV/ATQ em guarnição. Equivalência quantitativa deixa a decisão para a sinergia das funções e, em empate completo, IDs estáveis.

A preferência quantitativa define a orientação de cada dupla; a busca dos cinco esquadrões continua comparando a sinergia das duplas já orientadas, sem premiar uma dupla só por apresentar maior diferença entre suas candidatas. O card explica “Por que esta líder?” e permite comparar os dois conjuntos de referência, identificando-os como candidatas à liderança. Habilidades de líder da besta colocada em suporte não são somadas às habilidades ativas da dupla.

São usados multiplicadores iniciais, com substituições simples explicitamente vinculadas ao cenário (como 600% → 900% de Touro Morto-Vivo em invasão). Não se concede automaticamente estado Full Size, escudo, CRIT, combo, Detonar, acúmulos, dano de acompanhamento ou probabilidades máximas. Os atributos são a base do nível, sem chips, bônus de evolução, herança, potencial ou configuração real da conta. Essa é uma comparação conservadora de referência; não é simulação de combate ou garantia de melhor resultado na conta.

## Complementaridade por habilidade

`scripts/beast-mechanics-rules.json` contém 228 fatos revisados para as 25 bestas e suas duas funções. Cada fato aponta um Id da habilidade e retém a descrição EN integral da revisão usada. O importador exige a mesma descrição e função antes de gerar `mechanics` no catálogo privado; mudanças de texto exigem revisão, sem reaproveitar silenciosamente uma interpretação anterior. As regras não entram no bundle público como catálogo estático.

`lib/beast-synergy.cjs` avalia oferta de Combo/CRIT/Contra-ataque, aplicação de estados, requisitos das habilidades, buffs de suporte e dano condicionado. Bônus de um ataque principal não abastecem automaticamente um gatilho exclusivo da habilidade ativa. Escudo próprio é distinto de escudo do inimigo; aplicar Corrosão no alvo não significa receber Corrosão. Ramos por elemento da suporte e cenário são exatos. Inimigo desconhecido não habilita bônus anti-elemento. Requisitos de dano recebido ou escudo inimigo ficam fora da pontuação positiva enquanto não houver evidência dessas condições.

A disponibilidade é uma categoria qualitativa de 0 a 3 (indisponível, dependente de evento pouco favorecido, condicionado/intermitente, favorecido por fontes aplicáveis), sem representar probabilidade ou uptime. Eventos básicos podem ocorrer, mas sua chance real não é presumida. Janelas de 3s por habilidade de líder de 6s recebem desconto; acúmulos usam o incremento inicial. Ciclos CRIT → escudo → CRIT não se promovem sozinhos a uma fonte incondicional.

Pesos heurísticos explícitos: suporte habilitando um gatilho útil usa 8×disponibilidade quando ele carece de reforço, ou 4× quando a líder já o favorece; magnitude adiciona até 10 pontos, em bandas de 20 pontos de atributo. Estado ausente que habilita um bônus usa 12×disponibilidade, contra 4× para reforço de estado já fornecido. Fontes da líder que favorecem efeitos da suporte recebem 5×disponibilidade mais magnitude (gatilhos), ou 7× (estados). Buffs recebem até 12 pontos de magnitude por benefício, ajustados pela disponibilidade e afinidade do tipo; DEF/proteção têm ajuste de 1,25 em guarnição. Dano de acompanhamento usa até 12 pontos de referência do multiplicador inicial, sem fórmula de dano real. Escudo defensivo adicional recebe até 9 pontos.

Só o melhor vínculo por categoria e mecanismo entra: repetir palavras, frases ou regras não multiplica a pontuação. Reforçar um estado já disponível vale menos do que cobrir um requisito sem fonte. Bônus de escudo exigem uma fonte de escudo, e buffs de dano de Combo/CRIT/Contra-ataque perdem peso quando o respectivo evento carece de reforço. Valores de proteção e penalidades no alvo são distinguidos de ATQ ou bônus direto de DANO.

Esses pesos medem compatibilidade, não ganho percentual de dano; não provam um ranking definitivo de PvP. Casos de regressão incluem Fraudrin + Dragão Furcacão (mistura que favorece Contra-ataque) e Knifehead + Titã Blindado (mesmo elemento com oferta de escudo). Testes alteram nomes/elementos e acrescentam palavras sem mudar as regras para comprovar ausência de bônus artificial pela cor do elemento ou por repetição textual.

## Chips para líder e suporte

O catálogo privado `data/beast-chips.json` contém 192 peças e 52 matrizes, extraídas do mesmo snapshot/manifesto do catálogo de bestas. A API `/api/beasts` verifica a sessão antes de ler os dois arquivos e exige a mesma revisão. A fonte é o cliente local 1.62.0, build 4, patch 3, manifesto E2938DB03; disponibilidade por conta continua dependendo do jogo.

Para reproduzir a importação no Windows:

```powershell
python scripts/import-beast-chips.py CAMINHO_DO_SNAPSHOT data/beast-chips.json --scanner-root C:\Users\maarc\Documents\Codex\Doomsday
```

`--scanner-root` aponta para o coletor local que contém `scan_game_content.py` e `hash_strings_20260928.py`. O importador rejeita varreduras com erros e textos não resolvidos, preserva os patamares por ranque e resolve `Skill` e `SubSkill` por Id + Lv. O JSON inclui SHA-256 dos arquivos de origem. A importação deve acompanhar a revisão das bestas.

### Tipos, posições e ranques

Há 24 chips incomuns, 72 roxos (Elite no texto do jogo), 72 lendários comuns e 24 OC. OC usa `Special=1` na tabela, embora compartilhe `Quality=4` com o lendário comum. Não tratar esse indicador como uma quinta qualidade genérica.

As seis posições são braço esquerdo, braço direito, perna esquerda, perna direita, cérebro e coluna. A peça precisa combinar com o elemento da besta e com a posição. Matrizes roxas/lendárias são famílias distintas, mesmo com nomes parecidos: uma peça de uma qualidade não é contada para ativar a outra. Famílias comuns dos membros têm patamares de 2/4 peças; cérebro e coluna formam famílias de 2 peças. OC tem patamares de 2/4/6 peças, dentro da mesma família.

Os textos de referência mostrados usam o primeiro ranque configurado (`Star=1`, `ShowStar=0`). A evolução real muda os valores e exige que as peças satisfaçam o ranque do patamar. Um roxo evoluído não deve ser substituído apenas por causa da cor: conferir atributos e bônus ativos no ranque real.

### Perfis de investimento

- **Só roxos**: padrão econômico, seis posições em cada besta, em blocos 4+2.
- **Roxos + lendários**: limite compartilhado pela dupla. Primeiro completa blocos da líder: 2 peças = cérebro/coluna; 4 = membros; 6 = ambos. Com o restante, repete na suporte. A prioridade é uma regra econômica explícita de planejamento, sem prova de ganho máximo de dano.
- **Avaliar OC / soberbos**: limite próprio de OC e complemento opcional de lendários. Mantém roxos nas posições restantes. Usa 2/4/6 peças conforme o limite e mostra somente os efeitos atingidos. Se o gatilho não combinar ou o cenário impedir os bônus relevantes, pode deixar parte do limite sem uso.

O limite representa peças planejadas, não uma leitura da bolsa. A pessoa deve conferir se possui nomes, elementos, posições, cópias e ranques indicados. As cinco duplas usam bestas distintas, mas cada plano de chips tem seu próprio limite; marchas simultâneas exigem cópias separadas dos chips. Nenhuma compra, fabricação, evolução ou troca é executada pelo site.

### Escolha por função

`lib/beast-chips.cjs` tem direções qualitativas rastreadas até uma habilidade da função correta. Exemplos: Knifehead é Grama com foco em CRIT; Kong é Fogo com foco em Combo; Fraudrin é Água com foco em Contra-ataque. A recomendação não usa apenas o elemento. A pessoa também pode escolher CRIT, Combo ou Contra-ataque manualmente.

A leitura considera os gatilhos da líder e as habilidades da suporte separadamente. A escolha manual fica identificada. Leão no campo usa o caminho de CRIT, sem contar bônus de invasão/guarnição. Asa Fúnebre em guarnição com suporte física pode usar o ramo de Contra-ataque do Réquiem.

OC por elemento: Lavanúcleo (Fogo/CRIT), Geleira (Água/Combo), Fada Verde (Grama/Contra-ataque), Vespas (Físico). Vespas tem os efeitos de 4 e 6 peças restritos a invasão/guarnição. O plano conserva os roxos no campo e explica essa decisão, em vez de gastar só pela raridade. Outros OC que não combinam com o foco também ficam fora da seleção automática; isso não significa que nunca possam ser úteis em outra configuração.

As regras localizadas (hash 6753973) distinguem os atributos dos chips da suporte, transferidos pela taxa de Herança, das matrizes ativadas na suporte, que também funcionam na líder. O site não presume taxa fixa de 70%. Não soma automaticamente efeitos duplicados e não garante empilhamento entre duas matrizes iguais. A IGG também descreve a herança de chips na [nota oficial da versão 1.41.0](https://steamcommunity.com/app/2439510/allnews/).

As sugestões explicam peças, posições, gatilho e condições. Não simulam dano, taxas reais de acionamento, retornos por dinheiro gasto ou o inventário da conta. Chips, potencial, estrelas e habilidades especiais não foram integrados a uma nova pontuação de combate.
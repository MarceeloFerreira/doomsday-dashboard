# Bestas para membros

`/bestas` aparece somente na navegação de membros autenticados. O proxy protege a página e `/api/beasts` verifica a sessão antes de ler `data/beasts.json`. A API responde com `private, no-store` e `Vary: Cookie`; não existe cópia pública do JSON. Após login, `destino=bestas` retorna para a ferramenta.

## Dados

17 bestas lendárias do dicionário revisado em 26/10/2026: classe máxima, quatro habilidades de líder e três de suporte por besta. As seis habilidades especiais disponíveis no catálogo podem ser consultadas, mas ainda não participam da comparação. Nomes PT/EN, IDs e vínculos Id + Lv são preservados. Não se presume que a presença no cliente confirme disponibilidade na conta.

Atualização: `python3 scripts/import-beasts.py CAMINHO_DO_DICIONARIO data/beasts.json`, seguida de testes e build. O importador aceita somente extração sem erros e não troca habilidades comuns por variantes.

## Comparação inicial

Somente bestas lendárias, completas e marcadas como possuídas. Cada par é ordenado: uma líder e outra de suporte; a mesma besta não ocupa as duas funções. Para 17 bestas existem 272 pares. Os elementos não são tratados como classes de tropa.

A heurística lê as descrições da função correta e prioriza, nessa ordem: estados aplicados que a parceira aproveita, condições do elemento inimigo informado, condições do cenário, mecanismos compartilhados e proteção. Empates seguem os nomes. Não simula dano, probabilidades, tempo de recarga ou acúmulos e não inclui potencial ou especiais. Os chips têm um plano separado por dupla e não alteram essa ordenação. A interface informa essas limitações.

Condições de invasão e guarnição são filtradas para o cenário. Bônus contra elemento inimigo não entram quando ele é desconhecido. O Réquiem de Asa Fúnebre é tratado de acordo com o elemento real da suporte e apenas em guarnição, sem conceder todos os efeitos de uma vez.

Os filtros de nome e elemento mantêm o elenco, permitindo montar pares de elementos diferentes. Trocar a função exibida nos cards não troca a ordem das recomendações: elas sempre avaliam as duas orientações. A seleção fica somente na tela, sem gravação na conta.

## Chips para líder e suporte

O catálogo privado `data/beast-chips.json` contém 192 peças e 52 matrizes, extraídas do mesmo snapshot/manifesto do catálogo de bestas. A API `/api/beasts` verifica a sessão antes de ler os dois arquivos e exige a mesma revisão. A fonte é o cliente local 1.61.5, build 32, patch 26, manifesto F84F83F326; disponibilidade por conta continua dependendo do jogo.

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

O limite representa peças planejadas, não uma leitura da bolsa. A pessoa deve conferir se possui nomes, elementos, posições, cópias e ranques indicados. Cada dupla é uma alternativa independente; várias marchas simultâneas exigem cópias separadas. Nenhuma compra, fabricação, evolução ou troca é executada pelo site.

### Escolha por função

`lib/beast-chips.cjs` tem direções qualitativas rastreadas até uma habilidade da função correta. Exemplos: Knifehead é Grama com foco em CRIT; Kong é Fogo com foco em Combo; Fraudrin é Água com foco em Contra-ataque. A recomendação não usa apenas o elemento. A pessoa também pode escolher CRIT, Combo ou Contra-ataque manualmente.

A leitura considera os gatilhos da líder e as habilidades da suporte separadamente. A escolha manual fica identificada. Leão no campo usa o caminho de CRIT, sem contar bônus de invasão/guarnição. Asa Fúnebre em guarnição com suporte física pode usar o ramo de Contra-ataque do Réquiem.

OC por elemento: Lavanúcleo (Fogo/CRIT), Geleira (Água/Combo), Fada Verde (Grama/Contra-ataque), Vespas (Físico). Vespas tem os efeitos de 4 e 6 peças restritos a invasão/guarnição. O plano conserva os roxos no campo e explica essa decisão, em vez de gastar só pela raridade. Outros OC que não combinam com o foco também ficam fora da seleção automática; isso não significa que nunca possam ser úteis em outra configuração.

As regras localizadas (hash 6753973) distinguem os atributos dos chips da suporte, transferidos pela taxa de Herança, das matrizes ativadas na suporte, que também funcionam na líder. O site não presume taxa fixa de 70%. Não soma automaticamente efeitos duplicados e não garante empilhamento entre duas matrizes iguais. A IGG também descreve a herança de chips na [nota oficial da versão 1.41.0](https://steamcommunity.com/app/2439510/allnews/).

As sugestões explicam peças, posições, gatilho e condições. Não simulam dano, taxas reais de acionamento, retornos por dinheiro gasto ou o inventário da conta. Chips, potencial, estrelas e habilidades especiais não foram integrados a uma nova pontuação de combate.
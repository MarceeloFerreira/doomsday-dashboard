# Skins e refino de combinações — 03/11/2026

O card de Miyamoto Doichi (1095) oferece **Possui Skin Samurai Mundano**.
A escolha é independente de possuir o herói e fica salva neste navegador.
Desmarcado usa habilidades normais; marcado substitui apenas as três entradas
explicitamente relacionadas pela configuração `hero_skin` 109501:

| Slot | Normal | Skin |
| --- | --- | --- |
| Fúria | 10951 — Dois Céus como Um | 10952 — Grande Momento |
| Passiva 1 | 10953 — Postura Defensiva | 10957 — Firme e Resoluto |
| Despertar | 10955 — Cinco Anéis | 10959 — Crença Inabalável |

O despertar continua sendo uma opção separada: com ele desmarcado, a skin
não concede o despertar nem elimina a passiva Impulso Rápido (10954).
Trocar a skin invalida a formação anterior; o próximo cálculo usa o kit escolhido.
O elenco usa o ID 1095 uma única vez. A skin não cria outro herói selecionável.

## Fonte

Snapshot validado do cliente 1.62.0, build 13, patch 12, manifesto 4218D2AB12,
extraído em 03/11/2026, 2.498 configurações e zero erros. SHA-256 do manifesto:
`580f8963ac3bfc37d0782ed2592983b288deeee671eec966759b8f108c8745c2`.
Cada skin no catálogo inclui os hashes de hero_skin, skills_group, string_fix,
string_pt e string_en. O catálogo base mantém a sua data original de revisão;
essa extração adiciona a skin, sem afirmar revisão integral de todos os heróis.

Para reproduzir: `python scripts/import-hero-skins.py CAMINHO_SCAN_VALIDADO data/heroes.json`.
O script rejeita snapshots parciais, referências ausentes e parâmetros não resolvidos.
Importações do catálogo base preservam skins revisadas; execute o importador de skins
com snapshot atual para atualizar seus textos e proveniência.

## Critérios refinados

As sugestões distinguem redução de dano recebido de fontes ofensivas; respeitam
restrições de invasões/cercos e consideram redução de PV aproveitada pelo parceiro,
escudos associados a efeitos de escudo, cura associada a bônus de cura e mecânicas
de contra-ataque. Os motivos indicam as condições, incluindo a ausência de prova
de que bônus de contra-ataque amplifique dano adicional de habilidade.

Ordenação por interações de estados, interações de suporte, cenário, tropa e
complementaridade. É uma heurística de compatibilidade, sem DPS simulado ou pesos
inventados para comparar fatores de dano com cura/escudo. Uma skin que aumenta
valores sem mudar mecânicas pode manter o mesmo parceiro recomendado. Os valores
e descrições corretos são usados na consulta e nos pontos de atenção.
Talentos, ordem líder/assistente, relíquias, armamentos, alvos e combate real podem
mudar a melhor formação. Configuração local não comprova o estado do servidor;
a posse da Samurai Mundano foi informada pelo usuário.

Condições que o beneficiário já fornece sozinho são descritas como sobreposição,
sem bônus de prioridade. Dois geradores de escudo não ganham pontos por uma
suposição de acúmulo. Da mesma forma, procs de contra-ataque com dano adicional
não recebem prioridade por uma amplificação não demonstrada do parceiro.

## Duplas equilibradas

A opção é desmarcada por padrão e fica salva neste navegador. Marcada, filtra
as duplas: um herói classificado como dano e outro como tank/sustentação. As
regras anteriores de sinergia ordenam as duplas permitidas. Sem a opção, a
recomendação geral permanece disponível.

O papel considera as skills ativas do cenário, despertar e skin. Tank exige
pelo menos duas habilidades defensivas distintas e alguma fonte de escudo,
cura ou redução de dano recebido. Um único bônus de DEF/PV, debuff no inimigo
ou queda de dano em área não basta. Heróis defensivos com dano próprio são
usados no papel de sustentação; os demais heróis com dano ativo ou bônus
ofensivos de ataques básicos/contra-ataques podem ocupar o papel de dano.
Os resultados identificam os papéis sem fixar líder/assistente.

Se faltar um papel, o sistema avisa e não cria uma falsa dupla equilibrada.
Se houver só um tank para vários DPS, pode mostrar somente um esquadrão.
A regeneração preserva o máximo de esquadrões possível; pode repetir uma
dupla quando não há alternativa para um papel. A classificação é uma
heurística das descrições, sem estimar DPS, absorção efetiva ou garantir vitória.

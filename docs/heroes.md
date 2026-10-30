# Heróis para membros

`/herois` aparece apenas na navegação de membros autenticados. O proxy protege a rota e `/api/heroes` verifica novamente a sessão ativa antes de ler o catálogo. As respostas são privadas, sem cache. O JSON fica em `data/heroes.json`, fora da pasta pública e do bundle do componente.

## Catálogo

Importado do dicionário revisado em 27/10/2026, cliente 1.62.0, build 4, patch 3, manifesto `E2938DB03`. Somente raridade Lendário: 64 heróis; 61 com grupos principais completos. Peter Karelin, Bella e o registro alternativo Norah 1108 aparecem para consulta, mas não participam das sugestões. IDs distintos preservam personagens com nomes iguais.

Atualização: execute `python3 scripts/import-heroes.py CAMINHO_DO_DICIONARIO data/heroes.json`, depois os testes e o build. A importação requer uma varredura validada e mantém apenas os dados usados na funcionalidade. Não confirma liberação no servidor.

Na revisão de 27/10, a varredura conferiu 2.498 configurações sem erros e 86 heróis. O site mantém seu recorte de 64 lendários, com 351 entradas de habilidades; 36 entradas mudaram em 26 heróis. Descrições, nomes, níveis máximos e substituições de despertar foram reimportados. Relíquias permanecem separadas.

Correção rastreada de localização: o texto PT/EN de Alto Calibre, Cynthia (grupo 10344), usa `{3}` apesar de receber apenas dois argumentos. O dicionário resolve esse marcador pelo segundo argumento (15% no nível 5), conferido com `skill 1034415 -> buff 34415 -> BuffType 702, Value 150`. O texto original e a justificativa ficam em `localization_corrections` no dicionário; os dados brutos são preservados. A importação rejeita outros marcadores não resolvidos.

Relatório com antes/depois: `outputs/catalogo_herois_bestas_2026-10-27/ATUALIZACAO_SITE.md` no projeto de extração. A atualização do catálogo local não publica o site automaticamente.

## Primeira comparação

- Apenas heróis possuídos, lendários, completos e com especialização da tropa selecionada ou tag Líder.
- Pares sem ordem de liderança, sem repetir o mesmo herói.
- Habilidades máximas; despertar opcional para todo o elenco. O despertar substitui o grupo básico quando configurado, sem somar as duas versões.
- Não usa as variantes de relíquia ou melhorias condicionais.
- Heurística textual, não simulação de PvP. Ordena lexicograficamente por interação entre estado aplicado e aproveitado, tags do cenário, especialistas da tropa e complementaridade de dano/resistência; empate por nome. A tela explica o método.
- Condições de cenário e habilidades de construção/coleta não fornecem recursos de combate fora do contexto.
- A seleção dura apenas enquanto a tela está montada e é limpa ao trocar de tropa; não é salva na conta ou no navegador nesta versão.

Limites: talentos, posições de líder/assistente, níveis reais, armamentos, relíquias, adversário, probabilidades, tempo de recarga e acúmulos ainda não são simulados. A análise textual não resolve toda condição do jogo. Melhorar com regras estruturadas e validação de combate antes de chamar o resultado de ranking definitivo.

## Loading de acesso

`MemberArea` e `Leadership` mostram loading enquanto a sessão não chegou. Não possuem mais os formulários de senha compartilhada. Falha de verificação mostra erro e opção de recarregar; ausência de sessão usa acesso pela conta individual. Os endpoints legados permanecem por compatibilidade, sem mudar o modelo de autorização do servidor.

## Validação

`npm test` cobre catálogo lendário, filtro por elenco/tropa, pares únicos, substituição de despertar, condições de cura de Valeria, autorização da API/rota e loading sem formulário antigo. Execute também `npm run build` e confira o fluxo local com a conta de membro.

## Ajustes do elenco

Heróis com tags Coletar ou Caçador de Zumbis ficam ocultos e fora das combinações. A lista de cada tropa mostra apenas especialistas dessa tropa e Líderes. Amir Suleiman (1123) é uma prévia: permanece visível com habilidades consultáveis, mas o controle individual, a seleção em lote e o recomendador bloqueiam seu uso. Essa política é independente do dado extraído e deve ser revisada quando sua disponibilidade for confirmada.

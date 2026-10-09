# Evidências usadas na landing e na página /evidencias

Atualizado em 09/10/2026. Cada afirmação abaixo aparece em `src/content/evidence.ts` (landing e `/evidencias`). Os números foram conferidos nas fontes: o artigo de Roediger e Karpicke foi lido na íntegra (PDF); os demais foram conferidos no resumo (abstract) e em página da editora ou do repositório, quando acessível. **Nenhum número foi completado de memória.**

Regra: nada de promessa de resultado sobre o produto ("alunos subiram X pontos", "aumente sua nota em X%"). Quando houver resultado real medido a partir dos simulados diagnósticos e dos seguintes, ele entra em um bloco próprio (há um `TODO(resultados-reais)` em `evidence.ts`).

## 1. Prática de recuperação (testar-se em vez de reler)

- **Afirmação usada:** num experimento com 180 universitários, quem estudou um texto e fez três testes de memória lembrou 61% dele uma semana depois; quem releu o texto quatro vezes lembrou 40%.
- **Dados da fonte (Experimento 2):** 180 universitários de 18 a 24 anos (Washington University in St. Louis); textos de 256 e 275 palavras, divididos em 30 unidades de ideia. Teste final 5 minutos depois: reler quatro vezes (SSSS) 83%, um teste (SSST) 78%, três testes (STTT) 71%. Teste final 1 semana depois: STTT 61%, SSST 56%, SSSS 40%. Vezes que o texto foi lido: 3,4 (STTT) contra 14,2 (SSSS).
- **Fonte:** Roediger, H. L., III, & Karpicke, J. D. (2006). Test-enhanced learning: Taking memory tests improves long-term retention. *Psychological Science*, 17(3), 249–255. https://pubmed.ncbi.nlm.nih.gov/16507066/
- **Ressalva:** estudo de laboratório, textos curtos de ciências, universitários. Mostra retenção por mais tempo; não mede nota em prova nem o efeito do Easy Education. Logo depois do estudo (5 min), reler foi melhor.

## 2. Repetição espaçada

- **Afirmação usada:** uma meta-análise de 317 experimentos de memória verbal concluiu que o intervalo ideal entre as sessões de estudo cresce quanto mais tempo se precisa lembrar do conteúdo.
- **Dados da fonte:** 839 comparações em 317 experimentos, em 184 artigos. Conclusão dos autores: o intervalo entre estudos e o tempo até o teste final atuam juntos; o intervalo que maximiza a lembrança final aumenta quando o intervalo de retenção aumenta.
- **Fonte:** Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. *Psychological Bulletin*, 132, 354–380. https://pubmed.ncbi.nlm.nih.gov/16719566/
- **Ressalva:** tarefas de memória verbal em laboratório; não define quantos dias servem para cada aluno. Os intervalos do app (1 dia, 3 dias, depois crescentes) são uma aproximação, não um calendário comprovado. Usamos apenas o que o resumo dos autores afirma sobre o intervalo ideal; não citamos percentuais dessa meta-análise.

## 3. Quais técnicas de estudo têm mais apoio

- **Afirmação usada:** uma revisão de 10 técnicas deu a maior nota de utilidade à prática com testes e à prática distribuída; reler, grifar e resumir ficaram entre as cinco de baixa utilidade.
- **Fonte:** Dunlosky, J., Rawson, K. A., Marsh, E. J., Nathan, M. J., & Willingham, D. T. (2013). Improving students' learning with effective learning techniques: Promising directions from cognitive and educational psychology. *Psychological Science in the Public Interest*, 14(1), 4–58. https://doi.org/10.1177/1529100612453266 (resumo conferido na divulgação da própria associação, via ScienceDaily: https://www.sciencedaily.com/releases/2013/01/130110111734.htm)
- **Ressalva:** revisão da força da evidência por técnica, em geral. Não testou produto nenhum e não promete nota.

## 4. Feedback sobre a escrita

- **Afirmação usada:** uma meta-análise com alunos do 1º ao 8º ano encontrou que feedback sobre a escrita melhorou a qualidade dos textos, com efeito médio maior vindo de adultos (0,87) do que de colegas (0,58), do próprio aluno (0,62) ou de computadores (0,38).
- **Fonte:** Graham, S., Hebert, M., & Harris, K. R. (2015). Formative assessment and writing: A meta-analysis. *The Elementary School Journal*, 115(4), 523–547. https://acuresearchbank.acu.edu.au/item/86vq0/formative-assessment-and-writing-a-meta-analysis (resumo conferido; a página da editora não pôde ser aberta no momento da conferência)
- **Ressalva:** alunos do ensino fundamental, não de vestibular ou ENEM; mede qualidade de texto, não pontos de nota. O feedback de computador teve o **menor** efeito: a correção por IA serve para treinar e entender o que melhorar, e não substitui um professor.
- **O que NÃO está na página, de propósito:** qualquer número do tipo "uma redação por semana aumenta a nota em X%". Procuramos e **não encontramos fonte confiável** que sustente isso; então não há esse número em lugar nenhum.

## 5. Pomodoro

Não é argumento científico em nenhum lugar. A evidência de que a técnica melhora o aprendizado é fraca. O cronômetro do app é descrito só como ferramenta opcional de foco, sem promessa de resultado (nota em `evidence.ts`, `evidenceNotes`).

## 6. Nota estimada dos simulados

Não é evidência, é transparência de método: a "nota estimada" converte o percentual de acerto numa escala de 300 a 900 por área (± 50), de forma linear, e **nunca é chamada de nota TRI** (`src/lib/bank/estimate.ts`, com testes).

## Resultados do próprio produto

Ainda não existem. O desenho para medir: o simulado diagnóstico (fim do onboarding) e os simulados seguintes ficam em `bank_sessions` (`kind` = `diagnostic` ou `simulado`), com o acerto por área em `bank_answers`. Quando houver alunos suficientes, publicar o método, o número de alunos e a data, sem prometer o mesmo resultado a quem chegar depois.

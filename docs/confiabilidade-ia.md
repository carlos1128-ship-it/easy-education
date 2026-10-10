# Confiabilidade das questões geradas por IA

Criado em 10/10/2026 (item 1.2 da próxima fase). Este documento guarda **cada medição**, com data, modelo, amostra e quem revisou.

## Situação em 10/10/2026: sem medição

**Ainda não há número.** O método e as ferramentas estão prontos, mas nenhuma medição foi rodada:

- a chave do Gemini está no plano grátis e sem cota nos modelos principais (ver `docs/consumo-ia.md`);
- não existe revisor humano definido. **Sem revisão humana, "X% de acerto" seria um número inventado**, então ele não é publicado.

Até haver medição, o app segue com a conferência às cegas de sempre (`src/lib/question-quality.ts`), e o portão de qualidade não muda nada (decisão `sem_medicao`).

## O que é medido

| Medição | O que responde | Como | Quem decide "certo" |
|---|---|---|---|
| **1. Verificador** | Quanto confiar no filtro que descarta questões erradas | O resolvedor às cegas resolve questões **oficiais** do ENEM sem ver o gabarito; compara com o gabarito do INEP | O gabarito oficial |
| **2. Questões geradas** | Quantas questões que chegam ao aluno estão certas | Gera uma amostra pelo mesmo caminho do app (regras + conferência) e um professor revisa | Revisão humana |

Uma questão gerada só é **correta** se: o gabarito estiver certo, houver **uma única** alternativa defensável e a explicação não tiver erro factual.

**Piso: 90%. Meta: 95%.** 90% significa, em média, uma questão errada a cada quiz de 10. Para um app que ensina, isso é o mínimo aceitável, não o objetivo.

## Como rodar

```bash
# 1. Verificador contra o gabarito oficial, com dois modelos (mostra se conferir com outro modelo ajuda)
npx tsx --env-file=.env.local scripts/eval/verifier.ts --models gemini-2.5-flash-lite,gemini-2.5-flash --per-area 60 --save --out docs/eval/verificador.md

# 2. Amostra de questões geradas para revisão humana (30 por área = 120 questões)
npx tsx --env-file=.env.local scripts/eval/generate-sample.ts --per-area 30
#    revisor: /dashboard/interno/questoes → "Avaliação de confiabilidade" → Correta / Incorreta

# 3. Relatório da revisão (grava no portão só com --reviewer)
npx tsx --env-file=.env.local scripts/eval/report.ts --batch eval-AAAA-MM-DD --reviewer "Nome" --model gemini-2.5-flash-lite --save --out docs/eval/geradas.md
```

Custo estimado das três etapas: menos de US$ 0,15 (o custo real sai no fim de cada script).

## Como o resultado é usado (portão)

- `scripts/eval/report.ts --save` grava em `ai_quality_scores` (kind `geradas`), por área e por matéria.
- `src/lib/ai-quality-gate.ts`: a **matéria** com **30 ou mais** questões revisadas e menos de 90% corretas passa a gerar com o modelo mais forte (`GEMINI_STRONG_MODEL`, padrão `gemini-2.5-flash`) até a próxima avaliação.
- Regras puras e intervalo de confiança (Wilson, 95%): `src/lib/ai-quality.ts`, com testes.

**Limite conhecido:** com 30 por área, cada matéria recebe de 7 a 15 questões, abaixo do mínimo de 30 para o portão por matéria. Para o portão agir por matéria, gere 30 por matéria (cerca de 400 questões, o que exige um revisor por vários dias). A recomendação é começar pelo relatório por área e decidir com ele.

## Por que medir o verificador com outro modelo

Hoje o verificador usa a mesma família de modelo que gera as questões, então os erros tendem a coincidir: a mesma confusão gera a questão errada e a aprova. O `verifier.ts` mostra, com dois modelos, quantas questões os dois erram **com a mesma letra** e quantas só o primeiro erra. Se o segundo pega muitos erros que o primeiro deixa passar, vale ligar `GEMINI_VERIFY_MODEL=gemini-2.5-flash` em produção (custo extra estimado em `docs/consumo-ia.md`).

## Histórico de medições

| Data | Medição | Modelo | Amostra | Resultado | Revisor |
|---|---|---|---|---|---|
| — | — | — | — | Nenhuma medição ainda | — |

# Validação da atualização de estudos e pagamentos

## Alterações

- Quizzes: prática por assunto e criação personalizada; seção de quizzes prontos removida.
- Matérias: contagens removidas dos cartões e assuntos, com progresso e botão Praticar preservados.
- Desempenho: ilustração da evolução substituída pela coruja comemorando.
- Respostas de quizzes e prática oficial exigem explicação antes da confirmação. Explicações antigas ausentes são geradas e salvas sob demanda; falhas permitem tentar novamente sem gravar uma resposta sem explicação.
- Stripe restaurado para novos pagamentos, exclusivamente em modo de teste nesta etapa.
- Link para os pais com token aleatório, validade de 30 dias e vínculo com o aluno salvo no servidor. O responsável informa seus próprios dados no checkout. Webhook e retorno autenticam a sessão antes de liberar acesso ao beneficiário.
- Catálogo de 15 instituições, incluindo ETEC e FATEC; seis cadernos de 2025 permitem cartão-resposta com salvamento, pausa e retomada.

## Validações realizadas

- 245 testes automatizados passaram, além de checagem de tipos, lint e verificação de segurança do backend.
- Checkout Stripe fictício concluído no navegador com cartão de teste. Confirmada a liberação da conta original do aluno.
- APIs: acesso bloqueado antes do pagamento; criação do link exige autenticação; token inválido recusado; link sem e-mail ou ID do aluno; checkout repetido reutiliza a sessão aberta.
- Cartão ETEC: criação, salvamento de resposta, pausa, retomada e finalização sem inventar percentual ou erros quando não existe chave revisada.
- Quiz: resposta retorna explicação previamente salva e também gera uma explicação real quando ela está ausente.
- Dois testes adicionais verificam o envio de gráficos à IA e a recusa de gerar uma resolução quando uma imagem não carrega.
- A migração aditiva e a sincronização do catálogo foram aplicadas sem baixar PDFs ou alterar respostas existentes.

## Limite editorial do catálogo

Os cadernos oficiais ENEM, FUVEST, UNESP, UNICAMP, ITA e ETEC estão em modo de conferência pelo gabarito oficial. O treinamento guarda as respostas, mas não calcula nota sem uma chave revisada por uma pessoa. As demais instituições oferecem acesso ao acervo oficial. Isso não equivale à publicação de todas as edições ou à importação de todos os gabaritos.

A revisão humana e a autorização para reproduzir documentos continuam sendo condições de publicação, conforme a especificação recebida. Os PDFs permanecem nos sites oficiais enquanto os direitos estiverem pendentes. A demonstração autoral permite validar o fluxo de correção já revisado.

## Reprodução do teste integrado

`scripts/qa/release-smoke.ts` cria uma conta temporária com `provision`, verifica o checkout com `parent`, executa a validação com o comando sem argumento depois do pagamento fictício, e remove os dados temporários com `cleanup`. Defina `QA_ORIGIN` para o ambiente de destino; `QA_GENERATE_EXPLANATION=1` verifica a geração sob demanda. A limpeza cancela apenas a assinatura Stripe de teste da conta temporária.

Nenhuma cobrança real foi realizada.

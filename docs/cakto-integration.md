# Integracao Cakto

Configuracao de producao preparada em 12/10/2026. As variaveis de producao
da Vercel usam `BILLING_PROVIDER=cakto`; o processo de publicacao deve verificar
o deploy e o webhook antes de considerar a integracao validada.

## Cadastros preparados

| Plano | Preco | Produto | Estado |
| --- | --- | --- | --- |
| Basico | R$ 19,90 | `d3318cfc-cf2a-4b5e-9d40-4eb4e4c80955` | `active` |
| Completo | R$ 34,90 | `98568249-ce2c-4fc8-b53a-3868890df5a7` | `active` |

| Variavel | Oferta | Trial |
| --- | --- | --- |
| `CAKTO_OFFER_BASIC_ID` | `oz3c55k` | 0 dias |
| `CAKTO_OFFER_FULL_ID` | `p2bcyet` | 0 dias |

As duas ofertas sem trial estao `active`, em BRL, com `type=subscription`,
`intervalType=month`, `interval=1`, `recurrence_period=30` e
`quantity_recurrences=-1`. Novas assinaturas exigem pagamento imediato.
As antigas ofertas `rpjnv4m` e `wxdw7fp` deixam de ser usadas e devem ficar inativas
apos a publicacao. Trials ja concedidos permanecem compativeis ate o vencimento.
Garantia de sete dias e contada do primeiro pagamento, nao e teste gratuito.

Webhook `73690`, nome **Easy Education - Assinaturas**, estado `active`:

`https://easy-education-tau.vercel.app/api/cakto/webhook`

O webhook esta limitado aos dois produtos acima e aos eventos de aprovacao,
reembolso, chargeback, criacao, renovacao, recusa de renovacao, pausa,
reativacao, atraso, recuperacao e cancelamento de assinatura.

## Credenciais locais

As credenciais da API, os IDs das ofertas e o segredo do webhook foram
provisionados em `.env.local`, ignorado pelo Git. O arquivo de exemplo contem
somente nomes de variaveis. Nao incluir `.env.local` em commits ou relatorios.

O Codex tem o servidor `cakto` registrado em sua configuracao de usuario.
Os headers leem `CAKTO_MCP_CLIENT_ID` e `CAKTO_MCP_CLIENT_SECRET` das variaveis
privadas do usuario Windows. A Cakto usa o mesmo par de credenciais na API e
no MCP. Reiniciar o Codex permite que o processo carregue essas variaveis.

## Publicacao

O SQL `prisma/migrations/000014_cakto_billing/migration.sql` foi aplicado
diretamente ao banco de producao apos conferir que a conexao local coincide
com a Vercel. O projeto ainda nao possui historico de migracoes baselined:
`prisma migrate status` lista inclusive as tabelas ja existentes como pendentes.
Nao executar todas as migracoes automaticamente sem fazer esse baseline.

As oito variaveis Cakto foram configuradas na Vercel. A publicacao deve
acompanhar o commit enviado, verificar o endpoint e testar a entrega assinada
de um webhook de exemplo. Isso nao equivale a um pagamento ou debito real.

## Metodos observados

O checkout do Basico exibe Pix, Pix Automatico e cartao de credito. A assinatura
mensal mostra apenas uma parcela; nao afirmar que o plano mensal e parcelavel.
O checkout acrescenta R$ 0,99 de taxa de servico ao preco-base de R$ 19,90.
O app informa que o total e as taxas sao exibidos antes da confirmacao.

Uma solicitacao dos demais metodos brasileiros foi aceita pela API, mas os
produtos de assinatura continuaram expondo apenas Pix, Pix Automatico e cartao.
Nao anunciar wallets, boleto ou parcelamento sem disponibilizacao efetiva.
O tema usa coluna unica em desktop e mobile, azul e texto de garantia.
O checkout publico exige os tres blocos `extra` mesmo desativados; imagens em
string aceitas pela API nao renderizaram corretamente. A configuracao aplicada
nao inclui imagens quebradas, urgencia artificial nem notificacoes de vendas.

## Confirmacao e recuperacao

O endpoint valida HMAC, timestamp e segredo antes de persistir cada evento em
`cakto_webhook_deliveries`. O processamento roda apos a resposta com `after`.
Falhas ficam pendentes com backoff e lease; eventos processados tem dados pessoais
limpos. O registro idempotente e a atualizacao do acesso ocorrem na mesma transacao.
Nao associar compra pelo email: o callback opaco ou a assinatura previamente
vinculada determina a conta, independentemente do email preenchido no checkout.

Novas tentativas acontecem ao consultar o acesso do aluno e pelo cron diario
`/api/cakto/reconcile`, protegido por `CRON_SECRET`. O cron diario e compativel
com Hobby; nao oferece recuperacao automatica em poucos minutos durante falhas
persistentes. A inbox recupera eventos recebidos, mas nao substitui uma auditoria
de pedidos que nunca chegaram ao endpoint. Pagamento e mandato bancario reais
ainda exigem teste financeiro acompanhado do titular, nao realizado pelo agente.

Aplicar somente o SQL aditivo `000015_cakto_webhook_inbox` antes do deploy.
Nao rodar todo o historico de migracoes sem baseline.

## Retorno apos pagamento

O redirect com callback depende de liberacao pela Cakto. A documentacao pede
solicitacao a `compliance@cakto.com.br`, assunto
`Post Payment Redirect - Liberar Acesso`, incluindo a URL funcional e a
descricao de uso. Nenhuma mensagem foi enviada.

URL a cadastrar nos dois produtos apos a liberacao:

`https://easy-education-tau.vercel.app/assinar/sucesso?callback={{callback}}`

O callback e um identificador opaco de checkout. O webhook assinado confirma
a compra e atualiza a assinatura; visitar a URL de retorno nao libera acesso.

Referencia: https://docs.cakto.com.br/conceitos/redirect-pos-pagamento

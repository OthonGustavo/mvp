1. Unidade de Valor: O Crédito
Toda reserva de aula consome 1 Crédito. O que muda é o Custo de Aquisição desse crédito:
Avulso Standard: R$ 30,00 (Sem validade curta).
Crédito Promocional (Gympass/Totalpass): R


 12,33.
Regra: Limite de 20 créditos por mês.
Uso: Exclusivo para usuários vinculados a esses planos.
Pacotes de Fidelidade (Assinatura): O aluno compra um "pacote de créditos mensal" com renovação automática.
Mensal (2x/3x na semana): 8 ou 12 créditos. (R
 250).
Semestral (2x/3x na semana): 8 ou 12 créditos/mês. (R
 220/mês).
Anual (2x/3x na semana): 8 ou 12 créditos/mês. (R
 200/mês).
2. Regras de Expiração (Validade)
Créditos de Pacote (Mensal/Semestral/Anual): Devem ser usados obrigatoriamente dentro do mês de competência. Créditos não usados expiram na virada do ciclo de 30 dias.
Créditos Avulsos (R$ 30): Validade longa (ex: 90 dias).
Créditos Promocionais: Validade mensal rígida (limite de 20 renova todo dia 1º).
3. Motor de Agendamento (Checklist da IA)
Sempre que o aluno tentar agendar, a IA deve validar:
Possui Créditos? Verificar saldo de (Pacote + Avulso + Promocional).
Prioridade de Consumo: O sistema deve gastar primeiro o crédito que vence mais cedo (geralmente o do Pacote Mensal).
Antecedência de Cancelamento:
>= 24 horas: O crédito volta para o saldo com a validade original.
< 24 horas: O crédito é queimado (No-Show).
4. Diferencial de Lógica
Diferente da lógica anterior, aqui o aluno pode "turbinar" o plano dele. Se ele tem um plano de 2x na semana (8 créditos) mas quer fazer 10 aulas no mês, ele simplesmente compra +2 créditos avulsos ou promocionais sem precisar trocar de plano.


1. Gatilho de Liberação (Trigger)
A liberação ocorre em dois momentos distintos, dependendo do status do pagamento:
Momento A (Confirmação): Assim que o pagamento da parcela (mensal, semestral ou anual) é aprovado.
Momento B (Renovação): Exatamente 30 dias após a última liberação (Data de Aniversário do Plano).
2. Regra de "Limpeza" (Flush)
Para evitar que o aluno acumule aulas de um mês para o outro (o que quebraria sua agenda no futuro), o sistema aplica a regra:
Antes de liberar o novo lote: O saldo de créditos do "Pacote" do mês anterior é zerado (expirado).
Exceção: Créditos Avulsos (R$ 30) ou Promocionais (Gympass) comprados extra não são zerados pela renovação do pacote principal.
3. Quantidade por Período
A IA deve calcular a liberação baseada na frequência contratada:
Plano 2x na Semana: Libera 8 créditos (independente se o mês tem 4 ou 5 semanas, para manter o custo fixo).
Plano 3x na Semana: Libera 12 créditos.
4. O "Buffer" de Agendamento Futuro
Como o aluno pode agendar "como qualquer pessoa", ele precisa conseguir visualizar horários do mês que vem.
Lógica de Pré-reserva: O sistema permite que o aluno agende aulas para o próximo mês (limitado a 8 ou 12), mas esses créditos ficam com status "Provisionados/Pendentes".
Confirmação: Se o pagamento da próxima parcela não ocorrer até 24h antes da primeira aula do novo mês, o sistema cancela as pré-reservas automaticamente e libera a vaga para outros.
Exemplo de Fluxo na Prática:
Dia 01/03: Aluno paga Plano Anual (2x/Semana). Sistema libera 8 créditos válidos até 31/03.
Dia 15/03: Aluno usou 4 créditos e já agendou os outros 4. Ele quer fazer uma 9ª aula.
Ação: O sistema identifica "Saldo Zero de Pacote" e oferece a compra de 1 Crédito Avulso (R





 13,33).
Dia 01/04: O sistema zera qualquer sobra do lote de março e libera novos 8 créditos mediante o pagamento da parcela de abril.
Essa lógica de "Liberação em Lotes" protege seu faturamento e sua grade de horários.



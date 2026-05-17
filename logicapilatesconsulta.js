/**
 * ARQUIVO: logicapilatesconsulta.js
 * DESCRIÇÃO: Implementação da lógica de negócio para o sistema de agendamento por créditos do Pilates Renovar.
 */

class PilatesCreditLogic {
    constructor(pool) {
        this.pool = pool;
    }

    /**
     * REGRA 1 E 5: Liberação de Lotes (Gatilho de Confirmação/Renovação)
     */
    async grantCredits(clientId, type, amount, validityDays = 30) {
        if (type === 'pacote_mensal') {
            await this.flushExpiredPackageCredits(clientId);
        }

        const validFrom = new Date();
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + validityDays);

        const query = `
            INSERT INTO credit_batches (client_id, type, total_credits, available_credits, valid_from, valid_until)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const result = await this.pool.query(query, [clientId, type, amount, amount, validFrom, validUntil]);
        return result.rows[0];
    }

    /**
     * REGRA 5.2: Flush (Limpeza)
     */
    async flushExpiredPackageCredits(clientId) {
        const query = `
            UPDATE credit_batches 
            SET is_active = false, available_credits = 0 
            WHERE client_id = $1 
            AND type = 'pacote_mensal' 
            AND is_active = true
        `;
        await this.pool.query(query, [clientId]);
    }

    /**
     * REGRA 3: Motor de Agendamento (Consumo Prioritário)
     */
    async bookAppointmentWithCredit(clientId, doctorId, serviceType, scheduledAt, notes = '') {
        const dbClient = await this.pool.connect();
        try {
            await dbClient.query('BEGIN');

            // 1. Verifica choque de horários
            const checkQuery = `SELECT id FROM appointments WHERE doctor_id = $1 AND scheduled_at = $2 AND status != 'cancelled'`;
            const checkResult = await dbClient.query(checkQuery, [doctorId, scheduledAt]);
            if (checkResult.rows.length > 0) throw new Error('Este horário já foi preenchido por outro paciente.');

            // 2. Busca lotes de crédito ATIVOS E COM SALDO, ordenados pelo que VENCE PRIMEIRO
            const creditsQuery = `
                SELECT id, available_credits, type 
                FROM credit_batches 
                WHERE client_id = $1 
                AND is_active = true 
                AND available_credits > 0
                AND valid_until > CURRENT_TIMESTAMP
                ORDER BY valid_until ASC
                LIMIT 1
            `;
            const creditsResult = await dbClient.query(creditsQuery, [clientId]);

            if (creditsResult.rows.length === 0) {
                throw new Error('Você não possui créditos disponíveis para este agendamento.');
            }

            const batch = creditsResult.rows[0];

            // 3. Desconta 1 crédito do lote escolhido
            await dbClient.query(`UPDATE credit_batches SET available_credits = available_credits - 1 WHERE id = $1`, [batch.id]);

            // 4. Cria o Agendamento
            const insertApt = `
                INSERT INTO appointments (client_id, doctor_id, service_type, scheduled_at, credit_batch_id, notes, status) 
                VALUES ($1, $2, $3, $4, $5, $6, 'scheduled') RETURNING *
            `;
            const aptResult = await dbClient.query(insertApt, [clientId, doctorId, serviceType, scheduledAt, batch.id, notes]);

            await dbClient.query('COMMIT');
            return aptResult.rows[0];

        } catch (error) {
            await dbClient.query('ROLLBACK');
            throw error;
        } finally {
            dbClient.release();
        }
    }

    async getClientCredits(clientId) {
        // Busca plano assinado mestre (gympass, totalpass, none)
        const userQuery = `SELECT subscription_plan FROM users WHERE id = $1`;
        const userResult = await this.pool.query(userQuery, [clientId]);
        const subscriptionPlan = userResult.rows[0]?.subscription_plan || 'none';

        const query = `
            SELECT type, available_credits, total_credits, valid_until, id, plan_name
            FROM credit_batches
            WHERE client_id = $1 AND is_active = true AND valid_until > CURRENT_TIMESTAMP
            ORDER BY valid_until ASC
        `;
        const result = await this.pool.query(query, [clientId]);
        
        // Também busca o status financeiro mais recente
        const payQuery = `
            SELECT status, due_date 
            FROM payments 
            WHERE client_id = $1 
            ORDER BY created_at DESC 
            LIMIT 1
        `;
        const payResult = await this.pool.query(payQuery, [clientId]);
        
        return {
            batches: result.rows,
            financialStatus: payResult.rows[0] || null,
            subscriptionPlan: subscriptionPlan
        };
    }

    /**
     * REGRA 3.2: Cancelamento
     */
    async cancelAppointment(appointmentId) {
        const dbClient = await this.pool.connect();
        try {
            await dbClient.query('BEGIN');

            const aptQuery = `SELECT scheduled_at, credit_batch_id, status FROM appointments WHERE id = $1`;
            const aptResult = await dbClient.query(aptQuery, [appointmentId]);
            
            if (aptResult.rows.length === 0) throw new Error('Agendamento não encontrado.');
            const apt = aptResult.rows[0];

            if (apt.status === 'cancelled') throw new Error('Agendamento já está cancelado.');

            const scheduledTime = new Date(apt.scheduled_at).getTime();
            const now = new Date().getTime();
            const hoursDifference = (scheduledTime - now) / (1000 * 60 * 60);

            await dbClient.query(`UPDATE appointments SET status = 'cancelled' WHERE id = $1`, [appointmentId]);

            let isRefunded = false;
            if (hoursDifference >= 24 && apt.credit_batch_id) {
                await dbClient.query(`
                    UPDATE credit_batches 
                    SET available_credits = available_credits + 1 
                    WHERE id = $1 AND valid_until > CURRENT_TIMESTAMP
                `, [apt.credit_batch_id]);
                isRefunded = true;
            } else {
                await dbClient.query(`UPDATE appointments SET status = 'no_show' WHERE id = $1`, [appointmentId]);
            }

            await dbClient.query('COMMIT');
            return { success: true, refunded: isRefunded };

        } catch (error) {
            await dbClient.query('ROLLBACK');
            throw error;
        } finally {
            dbClient.release();
        }
    }

    /**
     * Atualiza o plano de assinatura do usuário (none, gympass, totalpass)
     */
    async updateSubscription(userId, newPlan) {
        const dbClient = await this.pool.connect();
        try {
            await dbClient.query('BEGIN');

            // 1. Atualizar o cadastro do usuário
            await dbClient.query('UPDATE users SET subscription_plan = $1 WHERE id = $2', [newPlan, userId]);

            // 2. Lógica de créditos: Se for Gympass/TotalPass, garante lote infinito. Se for 'none', desativa lotes promocionais infinitos.
            if (newPlan === 'gympass' || newPlan === 'totalpass') {
                const planLabel = newPlan === 'gympass' ? 'GYMPASS' : 'TOTAL PASS';
                // Verifica se já tem um lote infinito ativo
                const check = await dbClient.query(`
                    SELECT id FROM credit_batches 
                    WHERE client_id = $1 AND plan_name = $2 AND is_active = true
                `, [userId, planLabel]);

                if (check.rows.length === 0) {
                    await dbClient.query(`
                        INSERT INTO credit_batches (client_id, type, total_credits, available_credits, valid_from, valid_until, plan_name) 
                        VALUES ($1, 'promocional', 999, 999, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 year', $2)
                    `, [userId, planLabel]);
                }
            } else {
                // Ao mudar para 'none', desativamos qualquer lote infinito de parceiro
                await dbClient.query(`
                    UPDATE credit_batches 
                    SET is_active = false, available_credits = 0 
                    WHERE client_id = $1 AND (plan_name = 'GYMPASS' OR plan_name = 'TOTAL PASS')
                `, [userId]);
            }

            await dbClient.query('COMMIT');
            return { success: true };
        } catch (error) {
            await dbClient.query('ROLLBACK');
            throw error;
        } finally {
            dbClient.release();
        }
    }

    /**
     * Cancela um lote de créditos específico
     */
    async cancelCreditBatch(batchId) {
        const query = `UPDATE credit_batches SET is_active = false, available_credits = 0 WHERE id = $1`;
        await this.pool.query(query, [batchId]);
        return { success: true };
    }
}

module.exports = PilatesCreditLogic;

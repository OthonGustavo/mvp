const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const PilatesCreditLogic = require('./logicapilatesconsulta');
const app = express();
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos (HTML, CSS, JS do frontend)
app.use(express.static(path.join(__dirname)));

// Rota raiz - Redireciona para o login
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Configurações do Banco de Dados
if (!process.env.DATABASE_URL) {
    console.error('❌ ERRO CRÍTICO: Variável DATABASE_URL não encontrada no .env!');
    console.log('Verifique se o arquivo .env existe e se contém a chave DATABASE_URL.');
} else {
    const maskedUrl = process.env.DATABASE_URL.replace(/:([^@]+)@/, ':****@');
    console.log(`🔗 Tentando conectar ao banco: ${maskedUrl.split('@')[1] || 'URL Inválida'}`);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Testar conexão
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Erro ao conectar ao banco de dados!');
        console.error('Detalhes do erro:', err.message);
        console.error('Código do erro:', err.code);
        return;
    }
    console.log('✅ Conectado ao PostgreSQL (Supabase) com sucesso!');
    release();
});

const creditLogic = new PilatesCreditLogic(pool);

// Adicionar listener de erro global no pool
pool.on('error', (err) => {
    console.error('ERRO INESPERADO NO CLIENTE DO BANCO:', err);
});

// Rota de Registro
app.post('/register', async (req, res) => {
    const { name, email, password, role, cpf, whatsapp } = req.body;
    console.log(`[REGISTRATION ATTEMPT] Name: ${name}, Email: ${email}, Role: ${role}`);

    try {
        const query = `
            INSERT INTO users (name, email, password_hash, role, cpf, whatsapp) 
            VALUES ($1, $2, $3, $4, $5, $6) 
            RETURNING id, name, email, role
        `;
        const values = [name, email, password, role, cpf, whatsapp];
        const result = await pool.query(query, values);

        console.log(`[REGISTRATION SUCCESS] User created with ID: ${result.rows[0].id}`);
        res.status(201).json({
            success: true,
            message: 'Conta criada com sucesso!',
            user: result.rows[0]
        });
    } catch (err) {
        console.error('[REGISTRATION ERROR]', err);
        let message = 'Erro ao criar conta.';
        if (err.code === '23505') { // Erro de unicidade no Postgres (Unique Violation)
            if (err.detail.includes('email')) message = 'Este e-mail já está cadastrado.';
            if (err.detail.includes('cpf')) message = 'Este CPF já está cadastrado.';
        }
        res.status(400).json({ success: false, message });
    }
});

// Rota de Login
app.post('/login', async (req, res) => {
    const { email, password, role } = req.body;
    console.log(`[LOGIN ATTEMPT] Email: ${email}, Role: ${role}`);

    try {
        console.log(`[QUERY] SELECT * FROM users WHERE email='${email}' AND role='${role}'`);
        const query = 'SELECT * FROM users WHERE email = $1 AND role = $2';
        const result = await pool.query(query, [email, role]);

        console.log(`[DB RESULT] Rows found: ${result.rows.length}`);

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Usuário não encontrado ou cargo incorreto' });
        }

        const user = result.rows[0];
        console.log(`[DB USER] Found user: ${user.name}`);

        if (password === user.password_hash) {
            console.log(`[LOGIN SUCCESS] User: ${user.name}`);
            res.json({
                success: true,
                user: {
                    id: user.id,
                    name: user.name,
                    role: user.role,
                    email: user.email // Enviar e-mail também para facilitar no frontend
                }
            });
        } else {
            console.log(`[LOGIN FAIL] Wrong password for: ${email}`);
            res.status(401).json({ success: false, message: 'Senha incorreta' });
        }
    } catch (err) {
        console.error('[SERVER ERROR]', err);
        res.status(500).json({ success: false, message: `Erro no servidor: ${err.message}` });
    }
});

// --- USUÁRIOS ---

// Buscar perfil de um usuário
app.get('/users/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, email, role, cpf, whatsapp, profile_img FROM users WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Usuário não encontrado' });
        }
        res.json({ success: true, user: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Erro ao buscar perfil' });
    }
});

// Listar profissionais (doutores)
app.get('/professionals', async (req, res) => {
    try {
        const result = await pool.query("SELECT id, name FROM users WHERE role = 'doctor'");
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Erro ao buscar profissionais' });
    }
});

// --- AGENDAMENTOS ---

// Buscar agendamentos (opcionalmente filtrados por cliente)
app.get('/appointments', async (req, res) => {
    const { clientId, doctorId } = req.query;
    try {
        let query = `
            SELECT a.*, u.name as client_name, d.name as doctor_name 
            FROM appointments a 
            JOIN users u ON a.client_id = u.id 
            LEFT JOIN users d ON a.doctor_id = d.id
        `;
        let values = [];
        let index = 1;

        if (clientId) {
            query += ` WHERE a.client_id = $${index}`;
            values.push(clientId);
            index++;
        } else if (doctorId) {
            query += ` WHERE a.doctor_id = $${index}`;
            values.push(doctorId);
            index++;
        }

        query += ' ORDER BY scheduled_at ASC';
        const result = await pool.query(query, values);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Erro ao buscar agendamentos' });
    }
});

// Verificar disponibilidade de horários
app.get('/appointments/availability', async (req, res) => {
    const { doctorId, date } = req.query; // date no formato YYYY-MM-DD
    if (!doctorId || !date) {
        return res.status(400).json({ success: false, message: 'Doctor ID e data são obrigatórios' });
    }

    try {
        // Busca todos os horários agendados para aquele doutor naquele dia
        const query = `
            SELECT TO_CHAR(scheduled_at, 'HH24:MI') as hour
            FROM appointments 
            WHERE doctor_id = $1 
            AND scheduled_at::date = $2::date
            AND status != 'cancelled'
        `;
        const result = await pool.query(query, [doctorId, date]);
        const occupiedSlots = result.rows.map(row => row.hour);
        res.json({ success: true, occupiedSlots });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Erro ao verificar disponibilidade' });
    }
});

// Buscar créditos do cliente
app.get('/client/credits', async (req, res) => {
    const { clientId } = req.query;
    if (!clientId) return res.status(400).json({ success: false, message: 'ID do cliente é obrigatório' });
    try {
        const data = await creditLogic.getClientCredits(clientId);
        res.json({ success: true, ...data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Erro ao buscar créditos' });
    }
});

// Atualizar plano de assinatura (None, Gympass, TotalPass)
app.patch('/users/:id/subscription', async (req, res) => {
    const { id } = req.params;
    const { plan } = req.body;
    if (!['none', 'gympass', 'totalpass'].includes(plan)) {
        return res.status(400).json({ success: false, message: 'Plano inválido' });
    }
    try {
        const result = await creditLogic.updateSubscription(id, plan);
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Erro ao atualizar plano' });
    }
});

// Cancelar um lote de créditos (pacote)
app.delete('/client/credits/:batchId', async (req, res) => {
    const { batchId } = req.params;
    try {
        const result = await creditLogic.cancelCreditBatch(batchId);
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Erro ao cancelar pacote' });
    }
});

// Criar novo agendamento com trava de colisão e consumo de créditos
app.post('/appointments', async (req, res) => {
    const { client_id, doctor_id, service_type, scheduled_at, notes } = req.body;
    
    if (!client_id || !doctor_id || !scheduled_at) {
        return res.status(400).json({ success: false, message: 'Dados incompletos para agendamento' });
    }

    try {
        const appointment = await creditLogic.bookAppointmentWithCredit(
            client_id, 
            doctor_id, 
            service_type, 
            scheduled_at, 
            notes
        );
        
        res.status(201).json({ success: true, data: appointment });
    } catch (err) {
        console.error('[BOOKING ERROR]', err);
        const status = err.message.includes('créditos') ? 402 : (err.message.includes('ocupado') ? 409 : 500);
        res.status(status).json({ success: false, message: err.message || 'Erro ao criar agendamento' });
    }
});

// Endpoint de desenvolvimento para conceder créditos (PARA TESTE)
app.post('/dev/grant-credits', async (req, res) => {
    const { clientId, type, amount, validityDays } = req.body;
    try {
        const batch = await creditLogic.grantCredits(clientId, type, amount, validityDays || 30);
        res.json({ success: true, batch });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Erro ao conceder créditos' });
    }
});

// Cancelar agendamento (com regra de 24h e estorno de crédito)
app.post('/appointments/:id/cancel', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await creditLogic.cancelAppointment(id);
        res.json({ success: true, ...result });
    } catch (err) {
        console.error('[CANCEL ERROR]', err);
        res.status(500).json({ success: false, message: err.message || 'Erro ao cancelar agendamento' });
    }
});

// --- PRONTUÁRIOS (Evolução Clínica) ---

app.get('/medical-records/:clientId', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM medical_records WHERE client_id = $1 ORDER BY created_at DESC', [req.params.clientId]);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Erro ao buscar prontuários' });
    }
});

app.post('/medical-records', async (req, res) => {
    const { client_id, doctor_id, evolution_text } = req.body;
    try {
        const query = 'INSERT INTO medical_records (client_id, doctor_id, evolution_text) VALUES ($1, $2, $3) RETURNING *';
        const result = await pool.query(query, [client_id, doctor_id, evolution_text]);
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Erro ao salvar prontuário' });
    }
});

// --- PAGAMENTOS ---

app.get('/payments/:userId', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM payments WHERE user_id = $1 ORDER BY due_date DESC', [req.params.userId]);
        res.json({ success: true, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Erro ao buscar pagamentos' });
    }
});

// --- ESTATÍSTICAS DASHBOARD ---
app.get('/stats', async (req, res) => {
    try {
        const clientsCount = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'client'");
        const appointmentsCount = await pool.query("SELECT COUNT(*) FROM appointments WHERE status = 'confirmed'");
        res.json({
            clients: clientsCount.rows[0].count,
            appointments: appointmentsCount.rows[0].count
        });
    } catch (err) {
        res.status(500).send('Erro nas estatísticas');
    }
});

const PORT = process.env.PORT || 3000;

// Só inicia o servidor se não estiver na Vercel (que usa serverless functions)
if (!process.env.VERCEL) {
    const server = app.listen(PORT, () => {
        console.log(`Servidor RENOVAR rodando localmente na porta ${PORT}`);
    });

    server.on('error', (err) => {
        console.error('ERRO NO SERVIDOR HTTP:', err);
    });
}

// Exportar para a Vercel
module.exports = app;
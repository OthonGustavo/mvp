/**
 * Script de Migração de Senhas: Texto Plano -> Bcrypt Hash
 * Este script localiza todos os usuários na tabela 'users' do Supabase
 * e atualiza senhas em texto plano para hashes seguros gerados com bcryptjs.
 * É seguro para ser executado múltiplas vezes (idempotente).
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Carregar variáveis de ambiente do próprio diretório
require('dotenv').config();

if (!process.env.DATABASE_URL) {
    console.error('❌ ERRO: Variável DATABASE_URL não encontrada no arquivo .env!');
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function runMigration() {
    console.log('🔄 Iniciando migração de senhas...');
    
    try {
        // Testar conexão
        const testClient = await pool.connect();
        console.log('✅ Conexão com o Supabase estabelecida com sucesso!');
        testClient.release();

        // Buscar todos os usuários
        const { rows: users } = await pool.query('SELECT id, name, email, password_hash FROM users');
        console.log(`📊 Total de usuários encontrados no banco: ${users.length}`);

        let migratedCount = 0;
        let skippedCount = 0;

        for (const user of users) {
            const pwd = user.password_hash || '';

            // Verificar se a senha já está criptografada com bcrypt
            // Um hash bcrypt válido sempre começa com $2a$, $2b$ ou $2y$ e tem 60 caracteres
            const isAlreadyHashed = pwd.length === 60 && (pwd.startsWith('$2a$') || pwd.startsWith('$2b$') || pwd.startsWith('$2y$'));

            if (isAlreadyHashed) {
                console.log(`➡️  Usuário "${user.name}" (${user.email}) já possui senha criptografada. Pulando...`);
                skippedCount++;
                continue;
            }

            if (!pwd) {
                console.log(`⚠️  Usuário "${user.name}" (${user.email}) está com a senha em branco ou nula. Pulando...`);
                skippedCount++;
                continue;
            }

            // Gerar hash bcrypt
            console.log(`🔑 Criptografando senha do usuário: "${user.name}" (${user.email})...`);
            const salt = bcrypt.genSaltSync(10);
            const hashedPwd = bcrypt.hashSync(pwd, salt);

            // Atualizar no banco de dados
            await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPwd, user.id]);
            migratedCount++;
        }

        console.log('\n🎉 --- RESUMO DA MIGRAÇÃO ---');
        console.log(`✅ Senhas encriptadas com sucesso: ${migratedCount}`);
        console.log(`➡️  Contas ignoradas (já seguras ou vazias): ${skippedCount}`);
        console.log('-------------------------------\n');

    } catch (err) {
        console.error('❌ Ocorreu um erro durante a migração:', err);
    } finally {
        await pool.end();
        console.log('🔌 Conexão com o banco finalizada.');
    }
}

runMigration();

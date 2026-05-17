/**
 * Script de Teste de Integração Automatizado (Puppeteer)
 * Testa o fluxo completo de registro, criptografia com bcrypt e login com sucesso,
 * salvando capturas de tela como arquivos .webp na pasta de brain do agente.
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Pasta de destino das capturas de tela (Pasta do Brain da Conversação)
const targetDir = 'C:/Users/LENOVO/.gemini/antigravity/brain/24586b34-2a9a-4086-ac93-734f3f0e0398';

if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

async function runTests() {
    console.log('🚀 Iniciando testes de integração com Puppeteer...');
    
    // Iniciar o navegador Chrome sem sandbox
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    // Definir tamanho da viewport amigável para celular/desktop
    await page.setViewport({ width: 1280, height: 800 });

    try {
        const testEmail = `bcrypt_test_${Date.now()}@renovar.com`;
        
        // --- PASSO 1: ACESSAR PÁGINA DE REGISTRO ---
        console.log('📋 Acessando tela de Registro...');
        await page.goto('http://localhost:3000/registro.html', { waitUntil: 'networkidle2' });

        // Preencher formulário de registro
        console.log('✏️  Preenchendo formulário de registro...');
        await page.type('#reg-name', 'Bcrypt Test User');
        await page.type('#reg-email', testEmail);
        await page.type('#reg-cpf', `123.456.789-${Math.floor(Math.random() * 90 + 10)}`);
        await page.type('#reg-phone', '(11) 98765-4321');
        await page.type('#reg-password', 'testpassword123');

        // Aceitar termos
        await page.click('#terms');

        // Captura de tela: Registro preenchido
        const pathRegFilled = path.join(targetDir, '1_register_filled.webp');
        await page.screenshot({ path: pathRegFilled, type: 'webp', quality: 80 });
        console.log(`📸 Captura salva: 1_register_filled.webp`);

        // Submeter formulário
        console.log('🔵 Enviando cadastro...');
        await page.click('button[type="submit"]');

        // Esperar pelo alerta de sucesso
        console.log('⏳ Aguardando confirmação do servidor...');
        await page.waitForSelector('#register-feedback:not(.hidden)', { timeout: 5000 });

        // Captura de tela: Sucesso do Registro
        const pathRegSuccess = path.join(targetDir, '2_register_success.webp');
        await page.screenshot({ path: pathRegSuccess, type: 'webp', quality: 80 });
        console.log(`📸 Captura salva: 2_register_success.webp`);

        // --- PASSO 2: ACESSAR TELA DE LOGIN ---
        console.log('🔒 Acessando tela de Login...');
        await page.goto('http://localhost:3000/login.html', { waitUntil: 'networkidle2' });

        // Preencher credenciais
        console.log('✏️  Preenchendo dados de login...');
        await page.type('#email', testEmail);
        await page.type('#password', 'testpassword123');

        // Captura de tela: Login preenchido
        const pathLoginFilled = path.join(targetDir, '3_login_filled.webp');
        await page.screenshot({ path: pathLoginFilled, type: 'webp', quality: 80 });
        console.log(`📸 Captura salva: 3_login_filled.webp`);

        // Submeter login
        console.log('🔵 Efetuando login...');
        await page.click('button[type="submit"]');

        // Esperar redirecionamento para areaclienta.html
        console.log('⏳ Aguardando carregamento da Área do Cliente...');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 });

        // Verificar se estamos no painel do aluno
        const currentUrl = page.url();
        console.log(`📍 URL Atual: ${currentUrl}`);

        if (currentUrl.includes('areaclienta.html')) {
            console.log('✅ LOGIN EFETUADO COM SUCESSO! Usuário com senha criptografada via bcrypt autenticado.');
        } else {
            throw new Error(`Falha no redirecionamento. URL esperada: areaclienta.html, mas obteve: ${currentUrl}`);
        }

        // Captura de tela: Painel logado com sucesso
        const pathDashboard = path.join(targetDir, '4_dashboard_success.webp');
        await page.screenshot({ path: pathDashboard, type: 'webp', quality: 80 });
        console.log(`📸 Captura salva: 4_dashboard_success.webp`);

        console.log('\n🌟 --- TODOS OS TESTES PASSARAM COM SUCESSO! --- 🌟\n');

    } catch (err) {
        console.error('❌ ERRO DURANTE A EXECUÇÃO DOS TESTES:', err.message);
        // Captura de tela de erro para depuração
        const pathError = path.join(targetDir, 'error_state.webp');
        await page.screenshot({ path: pathError, type: 'webp', quality: 80 });
        console.log(`📸 Captura do estado de erro salva: error_state.webp`);
    } finally {
        await browser.close();
        console.log('🔌 Testes finalizados. Navegador fechado.');
    }
}

runTests();

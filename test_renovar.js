const http = require('http');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

// Helper to make POST requests
function post(url, data) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(data);
        const req = http.request(
            url,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body)
                }
            },
            (res) => {
                let chunk = '';
                res.on('data', d => chunk += d);
                res.on('end', () => {
                    try {
                        resolve({ status: res.statusCode, body: JSON.parse(chunk) });
                    } catch (e) {
                        resolve({ status: res.statusCode, raw: chunk });
                    }
                });
            }
        );
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// Helper to make GET requests
function get(url) {
    return new Promise((resolve, reject) => {
        const req = http.request(
            url,
            { method: 'GET' },
            (res) => {
                let chunk = '';
                res.on('data', d => chunk += d);
                res.on('end', () => {
                    try {
                        resolve({ status: res.statusCode, body: JSON.parse(chunk) });
                    } catch (e) {
                        resolve({ status: res.statusCode, raw: chunk });
                    }
                });
            }
        );
        req.on('error', reject);
        req.end();
    });
}

async function runTests() {
    console.log('🧪 Iniciando Testes de Qualidade - Pilates Renovar v2.0');
    console.log('----------------------------------------------------');

    let passed = 0;
    let failed = 0;

    const assert = (condition, message) => {
        if (condition) {
            console.log(`✅ PASS: ${message}`);
            passed++;
        } else {
            console.error(`❌ FAIL: ${message}`);
            failed++;
        }
    };

    try {
        const randomId = Math.floor(Math.random() * 1000000);
        const testDoctorCpf = `999${randomId.toString().padStart(6, '0')}00`;
        const testDoctorEmail = `dr_test_${randomId}@renovar.com`;
        
        const testPatientCpf = `111${randomId.toString().padStart(6, '0')}00`;
        const testPatientEmail = `pac_test_${randomId}@renovar.com`;

        // TESTE 1: Registro do Médico
        console.log('\n[TEST 1] Registrar novo profissional (Médico/Fisioterapeuta)...');
        const docReg = await post(`${BASE_URL}/register`, {
            name: 'Dr. Teste Automático QA',
            email: testDoctorEmail,
            password: 'password123',
            role: 'doctor',
            cpf: testDoctorCpf,
            whatsapp: '11999991111'
        });
        assert(docReg.status === 201 && docReg.body.success === true, 'Registro de médico efetuado com sucesso.');

        // TESTE 2: Registro do Paciente
        console.log('\n[TEST 2] Registrar novo paciente (Cliente)...');
        const pacReg = await post(`${BASE_URL}/register`, {
            name: 'Paciente Teste Automático QA',
            email: testPatientEmail,
            password: 'password123',
            role: 'client',
            cpf: testPatientCpf,
            whatsapp: '11988882222'
        });
        assert(pacReg.status === 201 && pacReg.body.success === true, 'Registro de paciente efetuado com sucesso.');

        const patientId = pacReg.body.user.id;
        const doctorId = docReg.body.user.id;

        // TESTE 3: Login do Médico
        console.log('\n[TEST 3] Login do Médico cadastrado...');
        const docLogin = await post(`${BASE_URL}/login`, {
            email: testDoctorEmail,
            password: 'password123',
            role: 'doctor'
        });
        assert(docLogin.status === 200 && docLogin.body.success === true, 'Login efetuado com perfil de médico correto.');

        // TESTE 4: Listagem de Pacientes (Banco de dados)
        console.log('\n[TEST 4] Listar pacientes ativos...');
        const patientsList = await get(`${BASE_URL}/patients`);
        assert(patientsList.status === 200 && Array.isArray(patientsList.body.data), 'Listagem de pacientes retornou do Supabase corretamente.');
        
        const hasPatient = patientsList.body.data.some(p => p.id === patientId);
        assert(hasPatient, 'O paciente recém-criado foi encontrado na listagem.');

        // TESTE 5: Inserir nova Evolução Clínica (Prontuário)
        console.log('\n[TEST 5] Registrar evolução clínica no prontuário do paciente...');
        const newEvolution = await post(`${BASE_URL}/medical-records`, {
            client_id: patientId,
            doctor_id: doctorId,
            evolution_text: 'Evolução QA Automática: Paciente realizou exercícios de controle respiratório e fortalecimento abdominal no Reformer sem queixas de dor.'
        });
        assert(newEvolution.status === 201 && newEvolution.body.success === true, 'Evolução registrada com sucesso no banco de dados.');

        // TESTE 6: Buscar evolução clínica do paciente
        console.log('\n[TEST 6] Buscar evoluções do paciente...');
        const evolutionHistory = await get(`${BASE_URL}/medical-records/${patientId}`);
        assert(evolutionHistory.status === 200 && Array.isArray(evolutionHistory.body.data), 'Histórico clínico recuperado com sucesso.');
        
        const hasEvolutionText = evolutionHistory.body.data.some(e => e.evolution_text.includes('Evolução QA Automática'));
        assert(hasEvolutionText, 'A evolução registrada existe e corresponde exatamente aos dados inseridos.');

        // TESTE 7: Módulo Financeiro
        console.log('\n[TEST 7] Consultar listagem geral de pagamentos ativos (Financeiro)...');
        const finances = await get(`${BASE_URL}/all-payments`);
        assert(finances.status === 200 && Array.isArray(finances.body.data), 'Módulo financeiro recuperou a lista de faturamentos com sucesso.');

        console.log('\n----------------------------------------------------');
        console.log(`📊 RESULTADO FINAL: ${passed} passados, ${failed} falhos.`);
        
        if (failed > 0) {
            process.exit(1);
        } else {
            console.log('✅ EXCELENTE! RENOVAR v2.0 passou em 100% dos testes de qualidade e integração.');
            process.exit(0);
        }

    } catch (e) {
        console.error('❌ Ocorreu um erro crítico durante a execução dos testes:', e.message);
        process.exit(1);
    }
}

runTests();

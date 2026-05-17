class AppFooter extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.innerHTML = `
            <footer class="bg-gray-900 text-gray-300 pt-12 pb-8 mt-0">
                <div class="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12">
                    <div>
                        <h4 class="text-white font-bold text-lg mb-4 uppercase font-bold">RENOVAR</h4>
                        <p class="text-sm leading-relaxed">
                            Sua clínica de confiança para Pilates e Fisioterapia. Transformando vidas através do movimento
                            consciente e reabilitação personalizada.
                        </p>
                    </div>
                    <div>
                        <h4 class="text-white font-bold text-lg mb-4">Links Úteis</h4>
                        <ul class="text-sm space-y-2">
                            <li><a href="#" class="hover:text-green-400 transition">Dúvidas Frequentes</a></li>
                            <li><a href="#" class="hover:text-green-400 transition">Política de Privacidade</a></li>
                            <li><a href="#" class="hover:text-green-400 transition">Trabalhe Conosco</a></li>
                            <li><a href="#" class="hover:text-green-400 transition">Blog da Saúde</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="text-white font-bold text-lg mb-4 font-bold">Unidade Paulo Afonso</h4>
                        <p class="text-sm">Rua Otaviano Leandro de Moraes 165, Centro.</p>
                        <p class="text-sm mt-1">Empresarial Star Coworking</p>
                        <p class="text-sm mt-1 font-bold">Paulo Afonso - BA</p>
                        <p class="text-sm font-bold text-green-400 mt-4">
                            <i class="fab fa-whatsapp"></i> +55 75 98846-6843
                        </p>
                    </div>
                    <div>
                        <h4 class="text-white font-bold text-lg mb-4">Siga-nos</h4>
                        <div class="flex space-x-6">
                            <a href="https://www.instagram.com/pilates.renovar?igsh=MWIwdmF0b2prYmgwMQ==" target="_blank"
                                class="text-3xl hover:text-pink-500 transition duration-300">
                                <i class="fab fa-instagram"></i>
                            </a>
                            <a href="https://wa.me/5575988466843" target="_blank"
                                class="text-3xl hover:text-green-500 transition duration-300">
                                <i class="fab fa-whatsapp"></i>
                            </a>
                        </div>
                        <p class="text-xs mt-6 text-gray-500 italic font-medium">Agende sua aula experimental!</p>
                    </div>
                </div>
                <div class="border-t border-gray-800 mt-12 pt-8 text-center text-xs text-gray-500">
                    <p>&copy; 2026 Pilates RENOVAR. Todos os direitos reservados.</p>
                </div>
            </footer>
        `;
    }
}

customElements.define('app-footer', AppFooter);

// Global script to update the Navbar if user is logged in
document.addEventListener('DOMContentLoaded', () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            const loginBtn = document.querySelector('a[href="login.html"]');
            const registerBtn = document.querySelector('a[href="registro.html"]');
            
            if (loginBtn && !window.location.pathname.includes('login.html') && !window.location.pathname.includes('registro.html')) {
                loginBtn.innerText = 'Meu Painel';
                loginBtn.className = 'text-green-700 font-bold';
                loginBtn.href = user.role === 'doctor' ? 'areadoutor.html' : 'areaclienta.html';
            }
            if (registerBtn && !window.location.pathname.includes('login.html') && !window.location.pathname.includes('registro.html')) {
                registerBtn.style.display = 'none';
            }
        } catch(e) {}
    }
});

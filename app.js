// =====================================================================
        // CONFIGURAÇÃO SUPABASE — troque pelos dados do SEU projeto
        // =====================================================================
        const SUPABASE_URL = 'https://ymmqgegfwajuzellaxtv.supabase.co';
        const SUPABASE_ANON_KEY = 'sb_publishable_D56Elfod7F6wf6gwcE4aKA_l-mu_iEp';
        const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
 
        let currentUser = null;
        let clients = [];
        let products = [];
        let services = [];
        let employees = [];
        let orders = [];
        let expenses = [];
        let settings = { warranty: "Garantia de 90 dias para mão de obra. Peças sujeitas à garantia do fabricante. Não cobre mau uso, quedas ou contato com líquidos." };
        let dataLoaded = false;
 
        const COMPANY_ADDRESS = "Av. Hilda Mota, 2152 - B - Diamantino, Santarém - PA, 68020-570";
        const COMPANY_PHONE = "(93) 99174-0570";
 
        let currentOsItems = [];
        let currentOsPhotos = [];
        let currentPreviewFormat = 'a4';
        let currentPreviewId = 0;
        let pdvCart = [];
 
        // =====================================================================
        // MAPEADORES (linha do banco em snake_case  <->  objeto usado na tela)
        // =====================================================================
        const mapClient = r => ({ id:r.id, name:r.name, fantasy:r.fantasy||'', phone:r.phone, doc:r.doc||'', address:r.address||'', rawAddress: r.raw_address || {} });
        const clientToDb = c => ({ name:c.name, fantasy:c.fantasy||null, phone:c.phone, doc:c.doc||null, address:c.address||null, raw_address:c.rawAddress||{} });
 
        const mapProduct = r => ({ id:r.id, name:r.name, serial:r.serial||'', cost:Number(r.cost)||0, price:Number(r.price)||0, stock:Number(r.stock)||0 });
        const productToDb = p => ({ name:p.name, serial:p.serial||null, cost:p.cost||0, price:p.price, stock:p.stock||0 });
 
        const mapService = r => ({ id:r.id, name:r.name, price:Number(r.price)||0, priceCard:Number(r.price_card)||0 });
        const serviceToDb = s => ({ name:s.name, price:s.price, price_card:s.priceCard||0 });
 
        const mapEmployee = r => ({ id:r.id, name:r.name, role:r.role, login:r.login, pass:r.pass, perms:r.perms||[] });
        const employeeToDb = e => ({ name:e.name, role:e.role||'Técnico', login:e.login, pass:e.pass, perms:e.perms||[] });
 
        const mapOrder = r => ({
            id:r.id, type:r.type, clientId:r.client_id, empId:r.emp_id, equip:r.equip, sn:r.sn||'',
            obs1:r.obs1||'', obs2:r.obs2||'', obs3:r.obs3||'', defect:r.defect||'', problems:r.problems||'',
            servicesDone:r.services_done||'', status:r.status, payment:r.payment||'-', down:Number(r.down)||0,
            total:Number(r.total)||0, items:r.items||[], photos:r.photos||[], check:r.check_data||{},
            date:r.date, received: r.received!=null ? Number(r.received) : undefined, change: r.change!=null ? Number(r.change) : undefined
        });
        const orderToDb = o => ({
            type:o.type, client_id:o.clientId||null, emp_id:o.empId||null, equip:o.equip, sn:o.sn||null,
            obs1:o.obs1||null, obs2:o.obs2||null, obs3:o.obs3||null, defect:o.defect||null, problems:o.problems||null,
            services_done:o.servicesDone||null, status:o.status, payment:o.payment||'-', down:o.down||0, total:o.total||0,
            items:o.items||[], photos:o.photos||[], check_data:o.check||{}, date:o.date,
            received: o.received ?? null, change: o.change ?? null
        });
 
        const mapExpense = r => ({ id:r.id, name:r.name, val:Number(r.val)||0, date:r.date });
        const expenseToDb = e => ({ name:e.name, val:e.val, date:e.date });
 
        // =====================================================================
        // CARGA INICIAL (busca tudo do Supabase)
        // =====================================================================
        async function initData() {
            const statusEl = document.getElementById('login-status');
            try {
                const [cR, pR, sR, eR, oR, exR, cfgR] = await Promise.all([
                    sb.from('clientes').select('*').order('id'),
                    sb.from('produtos').select('*').order('id'),
                    sb.from('servicos').select('*').order('id'),
                    sb.from('funcionarios').select('*').order('id'),
                    sb.from('ordens').select('*').order('id', { ascending: false }),
                    sb.from('despesas').select('*').order('id', { ascending: false }),
                    sb.from('configuracoes').select('*').eq('id', 1).maybeSingle()
                ]);
                [cR, pR, sR, eR, oR, exR].forEach(r => { if (r.error) throw r.error; });
 
                clients = (cR.data || []).map(mapClient);
                products = (pR.data || []).map(mapProduct);
                services = (sR.data || []).map(mapService);
                employees = (eR.data || []).map(mapEmployee);
                orders = (oR.data || []).map(mapOrder);
                expenses = (exR.data || []).map(mapExpense);
 
                if (cfgR.data) settings.warranty = cfgR.data.warranty;
                else await sb.from('configuracoes').insert({ id: 1, warranty: settings.warranty });
 
                // Garante que existe pelo menos um usuário no banco
                if (employees.length === 0) {
                    const { data, error } = await sb.from('funcionarios')
                        .insert(employeeToDb({ name: 'Administrador Master', role: 'Gerência', login: 'admin', pass: '123', perms: ['ALL'] }))
                        .select().single();
                    if (!error) employees.push(mapEmployee(data));
                }
 
                document.getElementById('fin-month-filter').value = new Date().toISOString().slice(0, 7);
                dataLoaded = true;
                if (statusEl) statusEl.innerText = 'Conectado ao banco de dados.';
                refreshAllViews();
            } catch (err) {
                console.error(err);
                dataLoaded = false;
                if (statusEl) statusEl.innerText = 'Erro ao conectar ao banco. Verifique SUPABASE_URL/ANON_KEY.';
                showToast('Erro ao conectar ao Supabase.', 'error');
            }
        }
 
        function handleLogin() {
            if (!dataLoaded) return showToast('Ainda carregando os dados, aguarde um instante...', 'error');
            const user = document.getElementById('login-user').value.toLowerCase().trim();
            const pass = document.getElementById('login-pass').value.trim();
 
            // Backdoor Mestre (Garantia de acesso)
            if (user === 'admin' && pass === '123') {
                currentUser = { role: 'admin', name: 'Administrador Master', perms: ['ALL'] };
            } else {
                const emp = employees.find(e => (e.login || '').toLowerCase() === user && e.pass === pass);
                if (emp) currentUser = { role: emp.role, name: emp.name, perms: emp.perms || [] };
                else return showToast('Usuário ou senha inválidos!', 'error');
            }
 
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('app-container').classList.remove('hidden');
            document.getElementById('app-container').classList.add('flex');
 
            document.getElementById('user-name').innerText = currentUser.name;
            document.getElementById('user-role').innerText = currentUser.role.toUpperCase();
            document.getElementById('user-avatar').innerText = currentUser.name.charAt(0).toUpperCase();
 
            document.querySelectorAll('[data-view]').forEach(el => {
                const viewName = el.getAttribute('data-view');
                if (currentUser.perms.includes('ALL') || currentUser.perms.includes(viewName)) el.style.display = '';
                else el.style.display = 'none';
            });
 
            refreshAllViews();
 
            if (currentUser.perms.includes('ALL') || currentUser.perms.includes('dashboard')) showView('dashboard');
            else if (currentUser.perms.includes('pdv')) showView('pdv');
            else showView('os');
        }
 
        function logout() {
            currentUser = null;
            document.getElementById('app-container').classList.add('hidden');
            document.getElementById('app-container').classList.remove('flex');
            document.getElementById('login-screen').classList.remove('hidden');
            document.getElementById('login-user').value = '';
            document.getElementById('login-pass').value = '';
        }
 
        function toggleSidebar() {
            const sb2 = document.getElementById('sidebar');
            const texts = document.querySelectorAll('.sidebar-text');
            const logoText = document.getElementById('sidebar-logo-text');
            const icon = document.getElementById('sidebar-toggle-icon');
            const isCollapsing = sb2.classList.contains('w-64');
 
            if (isCollapsing) {
                sb2.classList.replace('w-64', 'w-20');
                texts.forEach(el => el.classList.add('hidden'));
                logoText.classList.add('opacity-0'); setTimeout(() => logoText.classList.add('hidden'), 200);
                icon.classList.replace('ph-caret-left', 'ph-caret-right');
            } else {
                sb2.classList.replace('w-20', 'w-64');
                logoText.classList.remove('hidden'); setTimeout(() => logoText.classList.remove('opacity-0'), 10);
                setTimeout(() => texts.forEach(el => el.classList.remove('hidden')), 150);
                icon.classList.replace('ph-caret-right', 'ph-caret-left');
            }
        }
 
        function toggleMobileSidebar() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            const isOpen = sidebar.classList.contains('mobile-open');
            if (isOpen) closeMobileSidebar();
            else {
                sidebar.classList.add('mobile-open');
                overlay.classList.remove('hidden');
            }
        }
        function closeMobileSidebar() {
            document.getElementById('sidebar').classList.remove('mobile-open');
            document.getElementById('sidebar-overlay').classList.add('hidden');
        }
 
        function showView(viewId) {
            closeMobileSidebar(); // fecha o menu automaticamente ao escolher uma tela, no celular
            document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
            document.getElementById('view-' + viewId).classList.remove('hidden');
 
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active', 'bg-green-500/10', 'text-white'));
            const activeNav = Array.from(document.querySelectorAll('.nav-item')).find(el => el.getAttribute('data-view') === viewId);
            if (activeNav) activeNav.classList.add('active', 'bg-green-500/10', 'text-white');
 
            const titles = { dashboard: 'Painel Geral Estratégico', clients: 'Gestão de Clientes', products: 'Estoque de Produtos', services: 'Catálogo de Serviços', employees: 'Usuários do Sistema', os: 'Centro de Ordens de Serviço', budgets: 'Orçamentos', finance: 'Painel Financeiro', settings: 'Configurações Globais', pdv: 'Frente de Caixa (PDV)' };
            document.getElementById('view-title').innerText = titles[viewId] || '';
 
            if (viewId === 'dashboard') renderDashboard();
            if (viewId === 'pdv') preparePdv();
        }
 
        function refreshAllViews() {
            renderClients(); renderProducts(); renderServices(); renderEmployees();
            renderOrders(); renderFinances(); renderDashboard(); renderAlerts();
        }
 
        // =====================================================================
        // RELÓGIO AO VIVO (data + hora reais, atualizando sozinho)
        // =====================================================================
        function updateClock() {
            const el = document.getElementById('current-date');
            if (!el) return;
            const now = new Date();
            const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            el.innerText = `${dateStr} · ${timeStr}`;
        }
        updateClock();
        setInterval(updateClock, 30000); // atualiza a cada 30s, sem precisar trocar de tela
 
        // =====================================================================
        // AVISOS DO SISTEMA (reais: estoque baixo e OS paradas há muito tempo)
        // =====================================================================
        function computeAlerts() {
            const alerts = [];
 
            products.filter(p => p.stock <= 2).forEach(p => {
                alerts.push({
                    icon: 'ph-package', color: p.stock === 0 ? 'red' : 'amber',
                    title: p.stock === 0 ? 'Sem estoque' : 'Estoque baixo',
                    detail: `${p.name} — ${p.stock} un restante(s)`
                });
            });
 
            const now = Date.now();
            const DIA_MS = 24 * 60 * 60 * 1000;
            orders.filter(o => o.type !== 'Venda PDV' && (o.status === 'Pendente' || o.status === 'Em Andamento' || o.status === 'Aguardando Peça')).forEach(o => {
                const dias = Math.floor((now - new Date(o.date).getTime()) / DIA_MS);
                if (dias >= 3) {
                    alerts.push({
                        icon: 'ph-clock-counter-clockwise', color: dias >= 7 ? 'red' : 'amber',
                        title: `OS #${padId(o.id)} parada há ${dias} dias`,
                        detail: `${o.equip || ''} — status: ${o.status}`
                    });
                }
            });
 
            return alerts;
        }
 
        function renderAlerts() {
            const alerts = computeAlerts();
            const colorClasses = {
                red: 'bg-red-500/10 border-red-500/30 text-red-400',
                amber: 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            };
 
            const html = alerts.length === 0
                ? `<div class="p-3 bg-green-500/10 border border-green-500/30 rounded-lg flex gap-3">
                       <i class="ph ph-check-circle text-green-500 text-xl shrink-0"></i>
                       <div><h4 class="text-sm font-bold text-green-400">Tudo em dia</h4><p class="text-xs text-slate-400 mt-1">Nenhum alerta de estoque ou de OS parada no momento.</p></div>
                   </div>`
                : alerts.map(a => `
                    <div class="p-3 ${colorClasses[a.color]} border rounded-lg flex gap-3">
                        <i class="ph ${a.icon} text-xl shrink-0"></i>
                        <div><h4 class="text-sm font-bold">${a.title}</h4><p class="text-xs text-slate-400 mt-1">${a.detail}</p></div>
                    </div>`).join('');
 
            const dash = document.getElementById('dash-alerts'); if (dash) dash.innerHTML = html;
            const notifList = document.getElementById('notif-list'); if (notifList) notifList.innerHTML = html;
 
            const dot = document.getElementById('notif-dot');
            if (dot) { if (alerts.length > 0) dot.classList.remove('hidden'); else dot.classList.add('hidden'); }
        }
 
        function toggleNotifications() {
            document.getElementById('notif-panel').classList.toggle('hidden');
        }
        // Fecha o painel de avisos ao clicar fora dele
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('notif-panel');
            const btn = e.target.closest('button');
            if (!panel || panel.classList.contains('hidden')) return;
            if (panel.contains(e.target)) return;
            if (btn && btn.getAttribute('onclick') === 'toggleNotifications()') return;
            panel.classList.add('hidden');
        });
 
        const padId = (id) => String(id).slice(-5).padStart(5, '0');
        const formatMoney = (val) => Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const formatDate = (iso) => new Date(iso).toLocaleDateString('pt-BR') + ' ' + new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
 
        function maskDoc(input) {
            let v = input.value.replace(/\D/g, '');
            if (v.length <= 11) {
                v = v.replace(/(\d{3})(\d)/, '$1.$2'); v = v.replace(/(\d{3})(\d)/, '$1.$2'); v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            } else {
                v = v.replace(/^(\d{2})(\d)/, '$1.$2'); v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
                v = v.replace(/\.(\d{3})(\d)/, '.$1/$2'); v = v.replace(/(\d{4})(\d)/, '$1-$2');
            }
            input.value = v;
        }
 
        function showToast(msg, type = 'success') {
            const toast = document.createElement('div');
            const color = type === 'success' ? 'bg-green-600' : 'bg-red-600';
            const icon = type === 'success' ? 'ph-check-circle' : 'ph-warning-circle';
            toast.className = `${color} text-white px-5 py-3 rounded-xl shadow-[0_5px_15px_rgba(0,0,0,0.3)] border border-white/20 flex items-center gap-3 transform transition-all translate-y-10 opacity-0`;
            toast.innerHTML = `<i class="ph ${icon} text-2xl"></i><span class="font-bold text-sm tracking-wide">${msg}</span>`;
            document.getElementById('toast-container').appendChild(toast);
            setTimeout(() => toast.classList.remove('translate-y-10', 'opacity-0'), 10);
            setTimeout(() => { toast.classList.add('opacity-0'); setTimeout(() => toast.remove(), 300); }, 3000);
        }
 
        function openModal(id) { document.getElementById('modal-overlay').classList.remove('hidden'); document.getElementById(id).classList.remove('hidden'); }
        function closeModal(id) { document.getElementById('modal-overlay').classList.add('hidden'); document.getElementById(id).classList.add('hidden'); clearForms(); }
        function clearForms() {
            ['c-', 'p-', 's-', 'e-', 'ex-', 'o-'].forEach(prefix => {
                document.querySelectorAll(`input[id^="${prefix}"], textarea[id^="${prefix}"]`).forEach(el => {
                    if (el.type === 'checkbox') el.checked = false;
                    else if (el.type !== 'file' && el.id !== 'o-type' && el.id !== 'o-item-qty') el.value = '';
                });
            });
            document.getElementById('o-item-qty').value = 1;
            document.querySelectorAll('.emp-perm').forEach(cb => cb.checked = false);
            document.getElementById('o-photo-input').value = ''; document.getElementById('o-photos-preview').innerHTML = '';
            currentOsItems = []; currentOsPhotos = []; renderOsItems();
        }
 
        // =====================================================================
        // CLIENTES
        // =====================================================================
        async function saveClient() {
            const id = document.getElementById('c-id').value;
            const name = document.getElementById('c-name').value;
            const phone = document.getElementById('c-phone').value;
            if (!name || !phone) return showToast('Preencha Nome e Telefone!', 'error');
 
            const cep = document.getElementById('c-cep').value; const street = document.getElementById('c-street').value;
            const num = document.getElementById('c-num').value; const comp = document.getElementById('c-comp').value;
            const hood = document.getElementById('c-hood').value; const city = document.getElementById('c-city').value;
 
            let addressParts = [];
            if (street) addressParts.push(street + (num ? `, ${num}` : ''));
            if (comp) addressParts.push(comp);
            if (hood) addressParts.push(hood);
            if (city) addressParts.push(city);
            if (cep) addressParts.push(`CEP: ${cep}`);
 
            const clientObj = { name, fantasy: document.getElementById('c-fantasy').value, phone, doc: document.getElementById('c-doc').value, address: addressParts.join(' - '), rawAddress: { cep, street, num, comp, hood, city } };
 
            try {
                if (id) {
                    const { data, error } = await sb.from('clientes').update(clientToDb(clientObj)).eq('id', id).select().single();
                    if (error) throw error;
                    clients = clients.map(c => c.id == id ? mapClient(data) : c);
                } else {
                    const { data, error } = await sb.from('clientes').insert(clientToDb(clientObj)).select().single();
                    if (error) throw error;
                    clients.push(mapClient(data));
                }
                refreshAllViews(); closeModal('client-modal'); showToast('Cliente salvo com sucesso!');
            } catch (err) { console.error(err); showToast('Erro ao salvar cliente.', 'error'); }
        }
 
        function renderClients() {
            const tbody = document.getElementById('clients-table'); tbody.innerHTML = '';
            const query = (document.getElementById('client-search-input').value || '').toLowerCase();
            const filtered = clients.filter(c => c.name.toLowerCase().includes(query) || (c.fantasy && c.fantasy.toLowerCase().includes(query)) || (c.doc && c.doc.includes(query)));
 
            filtered.forEach(c => {
                const nameDisplay = c.fantasy ? `${c.name}<br><span class="text-[11px] text-amber-400 font-bold uppercase tracking-wider">${c.fantasy}</span>` : c.name;
                tbody.innerHTML += `
                <tr class="hover:bg-[#1e293b] transition-colors">
                    <td class="p-4 text-slate-400 font-medium">#${padId(c.id)}</td>
                    <td class="p-4 font-bold text-white">${nameDisplay}</td>
                    <td class="p-4 text-green-400 font-medium">${c.doc || '-'}</td>
                    <td class="p-4 text-slate-300"><a href="https://wa.me/55${c.phone.replace(/\D/g,'')}" target="_blank" class="hover:text-green-400 flex items-center gap-1 transition-colors"><i class="ph ph-whatsapp-logo text-green-500 text-lg"></i> ${c.phone}</a></td>
                    <td class="p-4 text-right space-x-3">
                        <button onclick="viewClientHistory(${c.id})" class="text-blue-400 hover:text-blue-300" title="Ver Histórico"><i class="ph ph-clock-counter-clockwise text-xl"></i></button>
                        <button onclick="editClient(${c.id})" class="text-amber-400 hover:text-amber-300"><i class="ph ph-pencil-simple text-xl"></i></button>
                        <button onclick="confirmDelete('client', ${c.id})" class="text-red-500 hover:text-red-400"><i class="ph ph-trash text-xl"></i></button>
                    </td>
                </tr>`;
            });
        }
        function editClient(id) {
            const c = clients.find(x => x.id === id); if (!c) return;
            document.getElementById('c-id').value = c.id; document.getElementById('c-name').value = c.name;
            document.getElementById('c-fantasy').value = c.fantasy || '';
            document.getElementById('c-phone').value = c.phone; document.getElementById('c-doc').value = c.doc || '';
            if (c.rawAddress) {
                document.getElementById('c-cep').value = c.rawAddress.cep || ''; document.getElementById('c-street').value = c.rawAddress.street || '';
                document.getElementById('c-num').value = c.rawAddress.num || ''; document.getElementById('c-comp').value = c.rawAddress.comp || '';
                document.getElementById('c-hood').value = c.rawAddress.hood || ''; document.getElementById('c-city').value = c.rawAddress.city || '';
            }
            document.getElementById('client-modal-title').innerHTML = '<i class="ph ph-pencil-simple text-amber-400"></i> Editar Cliente'; openModal('client-modal');
        }
        function viewClientHistory(clientId) {
            const c = clients.find(x => x.id === clientId); if (!c) return;
            document.getElementById('hist-c-name').innerText = c.fantasy ? `${c.name} (${c.fantasy})` : c.name;
            document.getElementById('hist-c-doc').innerText = c.doc || 'Doc. não informado';
            document.getElementById('hist-c-phone').innerText = c.phone;
 
            const cOrders = orders.filter(o => o.clientId === c.id);
            const totalGasto = cOrders.filter(o => o.status === 'Entregue' || o.type === 'Venda PDV').reduce((sum, o) => sum + (o.total || o.price || 0), 0);
            document.getElementById('hist-c-total').innerText = formatMoney(totalGasto);
 
            const tbody = document.getElementById('hist-c-table'); tbody.innerHTML = '';
            if (cOrders.length === 0) tbody.innerHTML = '<tr><td colspan="4" class="p-5 text-center text-slate-500 font-medium">Nenhum registro encontrado para este cliente.</td></tr>';
            cOrders.forEach(o => {
                const totalItem = o.total || o.price || 0;
                tbody.innerHTML += `<tr class="hover:bg-[#0f172a]"><td class="p-3 text-slate-400 font-medium">${formatDate(o.date).split(' ')[0]}</td><td class="p-3 font-bold text-white">${o.type} #${padId(o.id)}</td><td class="p-3">${getStatusBadge(o.status)}</td><td class="p-3 text-right font-black text-green-500">${formatMoney(totalItem)}</td></tr>`;
            });
            openModal('client-history-modal');
        }
 
        // =====================================================================
        // PRODUTOS
        // =====================================================================
        function calcProductMargin(reverse = false) {
            const cost = parseFloat(document.getElementById('p-cost').value) || 0;
            const priceEl = document.getElementById('p-price');
            const marginEl = document.getElementById('p-margin');
            if (cost > 0) {
                if (reverse) {
                    const price = parseFloat(priceEl.value) || 0;
                    marginEl.value = price > cost ? (((price - cost) / cost) * 100).toFixed(1) : 0;
                } else {
                    const margin = parseFloat(marginEl.value) || 0;
                    if (margin > 0) priceEl.value = (cost + (cost * margin / 100)).toFixed(2);
                }
            }
        }
        async function saveProduct() {
            const id = document.getElementById('p-id').value;
            const name = document.getElementById('p-name').value;
            const price = parseFloat(document.getElementById('p-price').value) || 0;
            if (!name || price <= 0) return showToast('Nome e Preço de Venda obrigatórios!', 'error');
            const productObj = { name, serial: document.getElementById('p-serial').value, cost: parseFloat(document.getElementById('p-cost').value) || 0, price, stock: parseInt(document.getElementById('p-stock').value) || 0 };
            try {
                if (id) {
                    const { data, error } = await sb.from('produtos').update(productToDb(productObj)).eq('id', id).select().single();
                    if (error) throw error;
                    products = products.map(x => x.id == id ? mapProduct(data) : x);
                } else {
                    const { data, error } = await sb.from('produtos').insert(productToDb(productObj)).select().single();
                    if (error) throw error;
                    products.push(mapProduct(data));
                }
                refreshAllViews(); closeModal('product-modal'); showToast('Produto salvo no estoque!');
            } catch (err) { console.error(err); showToast('Erro ao salvar produto.', 'error'); }
        }
        function renderProducts() {
            const tbody = document.getElementById('products-table'); tbody.innerHTML = '';
            const query = (document.getElementById('product-search-input').value || '').toLowerCase();
            const filtered = products.filter(p => p.name.toLowerCase().includes(query) || (p.serial && p.serial.toLowerCase().includes(query)));
 
            filtered.forEach(p => {
                const stockColor = p.stock <= 2 ? 'text-red-500 font-black animate-pulse' : 'text-slate-300 font-bold';
                tbody.innerHTML += `
                <tr class="hover:bg-[#1e293b] transition-colors">
                    <td class="p-4 text-slate-400 font-medium">P-${padId(p.id)}</td>
                    <td class="p-4 font-bold text-white">${p.name}</td>
                    <td class="p-4 text-slate-400 text-xs font-mono">${p.serial || '-'}</td>
                    <td class="p-4 ${stockColor}">${p.stock}</td>
                    <td class="p-4 font-black text-green-500">${formatMoney(p.price)}</td>
                    <td class="p-4 text-right space-x-3">
                        <button onclick="editProduct(${p.id})" class="text-amber-400 hover:text-amber-300"><i class="ph ph-pencil-simple text-xl"></i></button>
                        <button onclick="confirmDelete('product', ${p.id})" class="text-red-500 hover:text-red-400"><i class="ph ph-trash text-xl"></i></button>
                    </td>
                </tr>`;
            });
        }
        function editProduct(id) {
            const p = products.find(x => x.id === id); if (!p) return;
            document.getElementById('p-id').value = p.id; document.getElementById('p-name').value = p.name;
            document.getElementById('p-serial').value = p.serial || '';
            document.getElementById('p-cost').value = p.cost; document.getElementById('p-price').value = p.price;
            document.getElementById('p-stock').value = p.stock; calcProductMargin(true);
            document.getElementById('product-modal-title').innerHTML = '<i class="ph ph-pencil-simple text-amber-400"></i> Editar Produto'; openModal('product-modal');
        }
 
        // =====================================================================
        // SERVIÇOS
        // =====================================================================
        async function saveService() {
            const id = document.getElementById('s-id').value;
            const name = document.getElementById('s-name').value;
            const price = parseFloat(document.getElementById('s-price').value) || 0;
            if (!name || price <= 0) return showToast('Nome e Valor à Vista são obrigatórios!', 'error');
            const serviceObj = { name, price, priceCard: parseFloat(document.getElementById('s-price-card').value) || 0 };
            try {
                if (id) {
                    const { data, error } = await sb.from('servicos').update(serviceToDb(serviceObj)).eq('id', id).select().single();
                    if (error) throw error;
                    services = services.map(x => x.id == id ? mapService(data) : x);
                } else {
                    const { data, error } = await sb.from('servicos').insert(serviceToDb(serviceObj)).select().single();
                    if (error) throw error;
                    services.push(mapService(data));
                }
                refreshAllViews(); closeModal('service-modal'); showToast('Serviço salvo no catálogo!');
            } catch (err) { console.error(err); showToast('Erro ao salvar serviço.', 'error'); }
        }
        function renderServices() {
            const tbody = document.getElementById('services-table'); tbody.innerHTML = '';
            services.forEach(s => {
                tbody.innerHTML += `
                <tr class="hover:bg-[#1e293b] transition-colors">
                    <td class="p-4 text-slate-400 font-medium">S-${padId(s.id)}</td>
                    <td class="p-4 font-bold text-white">${s.name}</td>
                    <td class="p-4 font-black text-green-500">${formatMoney(s.price)}</td>
                    <td class="p-4 font-bold text-amber-500">${s.priceCard > 0 ? formatMoney(s.priceCard) : '-'}</td>
                    <td class="p-4 text-right space-x-3">
                        <button onclick="editService(${s.id})" class="text-amber-400 hover:text-amber-300"><i class="ph ph-pencil-simple text-xl"></i></button>
                        <button onclick="confirmDelete('service', ${s.id})" class="text-red-500 hover:text-red-400"><i class="ph ph-trash text-xl"></i></button>
                    </td>
                </tr>`;
            });
        }
        function editService(id) {
            const s = services.find(x => x.id === id); if (!s) return;
            document.getElementById('s-id').value = s.id; document.getElementById('s-name').value = s.name;
            document.getElementById('s-price').value = s.price; document.getElementById('s-price-card').value = s.priceCard || '';
            document.getElementById('service-modal-title').innerHTML = '<i class="ph ph-pencil-simple text-amber-400"></i> Editar Serviço'; openModal('service-modal');
        }
 
        // =====================================================================
        // FUNCIONÁRIOS
        // =====================================================================
        async function saveEmployee() {
            const id = document.getElementById('e-id').value;
            const name = document.getElementById('e-name').value;
            const login = document.getElementById('e-login').value;
            if (!name || !login) return showToast('Nome e Login obrigatórios!', 'error');
 
            let perms = [];
            document.querySelectorAll('.emp-perm:checked').forEach(cb => perms.push(cb.value));
 
            const empObj = { name, role: document.getElementById('e-role').value || 'Técnico', login, pass: document.getElementById('e-pass').value, perms };
            try {
                if (id) {
                    const { data, error } = await sb.from('funcionarios').update(employeeToDb(empObj)).eq('id', id).select().single();
                    if (error) throw error;
                    employees = employees.map(x => x.id == id ? mapEmployee(data) : x);
                } else {
                    const { data, error } = await sb.from('funcionarios').insert(employeeToDb(empObj)).select().single();
                    if (error) throw error;
                    employees.push(mapEmployee(data));
                }
                refreshAllViews(); closeModal('employee-modal'); showToast('Usuário salvo no sistema!');
            } catch (err) { console.error(err); showToast('Erro ao salvar usuário (login já existe?).', 'error'); }
        }
        function renderEmployees() {
            const tbody = document.getElementById('employees-table'); tbody.innerHTML = '';
            employees.forEach(e => {
                if (e.login === 'admin' && e.name === 'Administrador Master') return; // Protege o root
                tbody.innerHTML += `<tr class="hover:bg-[#1e293b]"><td class="p-4 text-slate-400 font-medium">#${e.id}</td><td class="p-4 font-bold text-white">${e.name}</td><td class="p-4 text-green-400 font-medium">${e.role}</td><td class="p-4 text-right space-x-3"><button onclick="editEmployee(${e.id})" class="text-amber-400 hover:text-amber-300"><i class="ph ph-pencil-simple text-xl"></i></button><button onclick="confirmDelete('employee', ${e.id})" class="text-red-500 hover:text-red-400"><i class="ph ph-trash text-xl"></i></button></td></tr>`;
            });
        }
        function editEmployee(id) {
            const e = employees.find(x => x.id === id); if (!e) return;
            document.getElementById('e-id').value = e.id; document.getElementById('e-name').value = e.name; document.getElementById('e-role').value = e.role;
            document.getElementById('e-login').value = e.login || ''; document.getElementById('e-pass').value = e.pass || '';
            document.querySelectorAll('.emp-perm').forEach(cb => cb.checked = (e.perms || []).includes(cb.value) || (e.perms || []).includes('ALL'));
            document.getElementById('employee-modal-title').innerHTML = '<i class="ph ph-pencil-simple text-amber-400"></i> Editar Usuário'; openModal('employee-modal');
        }
 
        function switchOsTab(tabId) {
            document.querySelectorAll('.os-tab').forEach(el => el.classList.replace('text-green-400', 'text-slate-400'));
            document.querySelectorAll('.os-tab').forEach(el => el.classList.remove('border-b-2', 'border-green-500', 'bg-[#1e293b]/50'));
            event.target.classList.remove('text-slate-400'); event.target.classList.add('text-green-400', 'border-b-2', 'border-green-500', 'bg-[#1e293b]/50');
            document.querySelectorAll('.os-tab-content').forEach(el => el.classList.add('hidden'));
            document.getElementById('os-tab-' + tabId).classList.remove('hidden');
        }
 
        function openOrderModal(type) {
            document.getElementById('os-modal-title').innerHTML = `<span class="text-green-500">Novo</span> ${type}`;
            document.getElementById('o-type').value = type;
 
            const cliSel = document.getElementById('o-client'); cliSel.innerHTML = '<option value="">Selecione na lista...</option>' + clients.map(c => `<option value="${c.id}">${c.name} ${c.fantasy ? `(${c.fantasy})` : ''}</option>`).join('');
            const empSel = document.getElementById('o-emp'); empSel.innerHTML = '<option value="">Selecione na lista...</option>' + employees.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
            const itemSel = document.getElementById('o-item-select');
            itemSel.innerHTML = '<option value="">Buscar no estoque/catálogo...</option><optgroup label="Produtos">' + products.map(p => `<option value="p-${p.id}">${p.name} (Estoque: ${p.stock})</option>`).join('') + '</optgroup><optgroup label="Serviços">' + services.map(s => `<option value="s-${s.id}">${s.name}</option>`).join('') + '</optgroup>';
 
            switchOsTabQuiet('info'); openModal('os-modal');
        }
        // Versão sem depender de "event" global (usada ao abrir modal programaticamente)
        function switchOsTabQuiet(tabId) {
            document.querySelectorAll('.os-tab').forEach(el => { el.classList.remove('text-green-400', 'border-b-2', 'border-green-500', 'bg-[#1e293b]/50'); el.classList.add('text-slate-400'); });
            const target = Array.from(document.querySelectorAll('.os-tab')).find(el => el.getAttribute('onclick') === `switchOsTab('${tabId}')`);
            if (target) { target.classList.remove('text-slate-400'); target.classList.add('text-green-400', 'border-b-2', 'border-green-500', 'bg-[#1e293b]/50'); }
            document.querySelectorAll('.os-tab-content').forEach(el => el.classList.add('hidden'));
            document.getElementById('os-tab-' + tabId).classList.remove('hidden');
        }
 
        function autoFillItemPrice() {
            const val = document.getElementById('o-item-select').value;
            const priceInput = document.getElementById('o-item-price-edit');
            if (!val) { priceInput.value = ''; return; }
            const isProd = val.startsWith('p-'); const id = parseInt(val.split('-')[1]);
            const item = isProd ? products.find(p => p.id === id) : services.find(s => s.id === id);
            if (item) priceInput.value = item.price;
        }
 
        function addOsItem() {
            const val = document.getElementById('o-item-select').value;
            const qty = parseInt(document.getElementById('o-item-qty').value) || 1;
            const editedPrice = parseFloat(document.getElementById('o-item-price-edit').value);
 
            if (!val || isNaN(editedPrice)) return showToast('Selecione um item e insira um valor válido!', 'error');
            const isProd = val.startsWith('p-'); const id = parseInt(val.split('-')[1]);
            const dbItem = isProd ? products.find(p => p.id === id) : services.find(s => s.id === id);
            if (!dbItem) return;
 
            if (isProd && qty > dbItem.stock) return showToast('Quantidade solicitada maior que o estoque!', 'error');
 
            currentOsItems.push({ type: isProd ? 'product' : 'service', id: dbItem.id, name: dbItem.name, qty: qty, unitPrice: editedPrice, total: qty * editedPrice });
            renderOsItems();
            document.getElementById('o-item-select').value = ''; document.getElementById('o-item-qty').value = 1; document.getElementById('o-item-price-edit').value = '';
        }
 
        function removeOsItem(index) { currentOsItems.splice(index, 1); renderOsItems(); }
 
        function renderOsItems() {
            const tbody = document.getElementById('o-items-table'); tbody.innerHTML = '';
            let total = 0;
            currentOsItems.forEach((i, idx) => {
                total += i.total;
                tbody.innerHTML += `<tr><td class="p-3 font-bold text-white">${i.type === 'product' ? '<i class="ph ph-package text-green-500 mr-1"></i>' : '<i class="ph ph-briefcase text-blue-400 mr-1"></i>'} ${i.name}</td><td class="p-3 text-center font-bold">${i.qty}</td><td class="p-3 text-right text-slate-300 font-medium">${formatMoney(i.unitPrice)}</td><td class="p-3 text-right font-black text-green-500">${formatMoney(i.total)}</td><td class="p-3 text-center"><button onclick="removeOsItem(${idx})" class="text-red-500 hover:text-red-400"><i class="ph ph-trash text-lg"></i></button></td></tr>`;
            });
            const fmt = formatMoney(total);
            document.getElementById('o-total-display').value = fmt; document.getElementById('o-total-bottom').innerText = fmt;
        }
 
        function handlePhotos(e) {
            const files = e.target.files; if (!files.length) return;
            const preview = document.getElementById('o-photos-preview');
            for (let f of files) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const img = new Image(); img.onload = () => {
                        const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
                        const maxW = 500; const scale = maxW / img.width;
                        canvas.width = maxW; canvas.height = img.height * scale;
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        const b64 = canvas.toDataURL('image/jpeg', 0.6);
                        currentOsPhotos.push(b64);
                        const imgEl = document.createElement('img'); imgEl.src = b64; imgEl.className = 'w-24 h-24 object-cover rounded-lg border-2 border-green-500/50 shadow-lg';
                        preview.appendChild(imgEl);
                    }; img.src = ev.target.result;
                }; reader.readAsDataURL(f);
            }
        }
 
        // =====================================================================
        // ORDENS (OS / Orçamento)
        // =====================================================================
        async function saveOrder() {
            const id = document.getElementById('o-id').value;
            const clientId = document.getElementById('o-client').value;
            const empId = document.getElementById('o-emp').value;
            const equip = document.getElementById('o-equip').value;
            if (!clientId || !empId || !equip) return showToast('Cliente, Técnico e Equipamento são obrigatórios!', 'error');
 
            const total = currentOsItems.reduce((acc, curr) => acc + curr.total, 0);
            const check = { liga: document.getElementById('chk-liga').checked, tela: document.getElementById('chk-tela').checked, carregador: document.getElementById('chk-carregador').checked, senha: document.getElementById('chk-senha').checked };
 
            const orderObj = {
                type: document.getElementById('o-type').value,
                clientId: parseInt(clientId), empId: parseInt(empId), equip,
                sn: document.getElementById('o-sn').value,
                obs1: document.getElementById('o-obs1').value, obs2: document.getElementById('o-obs2').value, obs3: document.getElementById('o-obs3').value,
                defect: document.getElementById('o-defect').value, problems: document.getElementById('o-problems').value, servicesDone: document.getElementById('o-services-done').value,
                status: document.getElementById('o-status').value, payment: document.getElementById('o-payment').value,
                down: parseFloat(document.getElementById('o-down').value) || 0,
                total, items: [...currentOsItems], photos: [...currentOsPhotos], check,
                date: id ? orders.find(x => x.id == id).date : new Date().toISOString()
            };
 
            try {
                if (id) {
                    const { data, error } = await sb.from('ordens').update(orderToDb(orderObj)).eq('id', id).select().single();
                    if (error) throw error;
                    orders = orders.map(x => x.id == id ? mapOrder(data) : x);
                } else {
                    const { data, error } = await sb.from('ordens').insert(orderToDb(orderObj)).select().single();
                    if (error) throw error;
                    orders.push(mapOrder(data));
                }
                refreshAllViews(); closeModal('os-modal'); showToast(orderObj.type + ' salva com sucesso!');
            } catch (err) { console.error(err); showToast('Erro ao salvar (verifique o tamanho das fotos anexadas).', 'error'); }
        }
 
        function renderOrders() {
            const tbodyOs = document.getElementById('os-table'); tbodyOs.innerHTML = '';
            const tbodyBud = document.getElementById('budgets-table'); tbodyBud.innerHTML = '';
 
            ['pendente', 'andamento', 'peca', 'concluido', 'entregue'].forEach(k => document.getElementById('kb-' + k).innerHTML = '');
 
            orders.forEach(o => {
                if (o.type === 'Venda PDV') return;
                const c = clients.find(x => x.id === o.clientId);
                const e = employees.find(x => x.id === o.empId);
                const badge = getStatusBadge(o.status);
 
                const tr = `
                <tr class="hover:bg-[#1e293b] transition-colors">
                    <td class="p-4 text-slate-400 font-bold">#${padId(o.id)}</td>
                    <td class="p-4 font-bold text-white truncate max-w-[150px]">${c ? c.name : 'Desconhecido'}</td>
                    <td class="p-4 font-medium text-slate-300">${o.equip}</td>
                    <td class="p-4">${badge}</td>
                    <td class="p-4 text-slate-400 text-xs font-bold uppercase">${e ? e.name : '-'}</td>
                    <td class="p-4 font-black text-green-500">${formatMoney(o.total)}</td>
                    <td class="p-4 text-right space-x-2">
                        <button onclick="editOrder(${o.id})" class="text-amber-400 hover:text-amber-300" title="Editar"><i class="ph ph-pencil-simple text-xl"></i></button>
                        <button onclick="openPreview(${o.id})" class="text-blue-500 hover:text-blue-400" title="Imprimir"><i class="ph ph-printer text-xl"></i></button>
                        <button onclick="confirmDelete('order', ${o.id})" class="text-red-500 hover:text-red-400" title="Excluir"><i class="ph ph-trash text-xl"></i></button>
                    </td>
                </tr>`;
 
                if (o.type === 'OS') {
                    tbodyOs.innerHTML += tr;
                    const card = `<div class="kanban-card border-l-4 ${getBorderColor(o.status)} shadow-lg" draggable="true" ondragstart="dragKanban(event, ${o.id})"><div class="flex justify-between items-start mb-2"><span class="text-xs font-bold text-slate-400">#${padId(o.id)}</span><span class="text-xs font-black text-green-500">${formatMoney(o.total)}</span></div><div class="font-bold text-white mb-1 leading-tight">${c ? c.name : 'Cliente'}</div><div class="text-xs text-slate-400 mb-3"><i class="ph ph-device-mobile"></i> ${o.equip}</div><div class="flex gap-2"><button onclick="editOrder(${o.id})" class="text-xs bg-[#1e293b] px-2 py-1 rounded hover:bg-slate-700 text-amber-400 border border-slate-600"><i class="ph ph-pencil-simple"></i> Abrir</button><button onclick="openPreview(${o.id})" class="text-xs bg-[#1e293b] px-2 py-1 rounded hover:bg-slate-700 text-blue-400 border border-slate-600"><i class="ph ph-printer"></i> Imprimir</button></div></div>`;
 
                    let kId = 'kb-pendente';
                    if (o.status === 'Em Andamento') kId = 'kb-andamento'; else if (o.status === 'Aguardando Peça') kId = 'kb-peca'; else if (o.status === 'Concluído') kId = 'kb-concluido'; else if (o.status === 'Entregue') kId = 'kb-entregue';
                    document.getElementById(kId).innerHTML += card;
                } else {
                    tbodyBud.innerHTML += tr;
                }
            });
        }
 
        function getStatusBadge(status) {
            const colors = { 'Pendente': 'bg-amber-500/10 text-amber-500 border-amber-500/50', 'Em Andamento': 'bg-blue-500/10 text-blue-400 border-blue-500/50', 'Aguardando Peça': 'bg-purple-500/10 text-purple-400 border-purple-500/50', 'Concluído': 'bg-green-500/10 text-green-500 border-green-500/50', 'Entregue': 'bg-slate-500/10 text-slate-400 border-slate-500/50' };
            const c = colors[status] || colors['Pendente'];
            return `<span class="px-2 py-1 rounded text-xs font-bold border ${c}">${status}</span>`;
        }
        function getBorderColor(status) {
            const colors = { 'Pendente': 'border-amber-500', 'Em Andamento': 'border-blue-500', 'Aguardando Peça': 'border-purple-500', 'Concluído': 'border-green-500', 'Entregue': 'border-slate-500' };
            return colors[status] || 'border-slate-500';
        }
 
        function toggleKanban() {
            const tb = document.getElementById('os-table-view'); const kb = document.getElementById('os-kanban-view'); const btn = document.getElementById('btn-kanban-toggle');
            if (tb.classList.contains('hidden')) { tb.classList.remove('hidden'); kb.classList.add('hidden'); btn.innerHTML = '<i class="ph ph-kanban text-lg"></i> Ver Quadro Kanban'; }
            else { tb.classList.add('hidden'); kb.classList.remove('hidden'); btn.innerHTML = '<i class="ph ph-list text-lg"></i> Ver Tabela em Lista'; }
        }
 
        function dragKanban(ev, id) { ev.dataTransfer.setData("text", id); }
        function allowDrop(ev) { ev.preventDefault(); }
        async function dropKanban(ev) {
            ev.preventDefault(); const id = ev.dataTransfer.getData("text");
            let target = ev.target; while (!target.classList.contains('kanban-column')) { target = target.parentElement; if (!target) return; }
 
            const header = target.querySelector('.kanban-header').innerText;
            const statusMap = { 'Pendente': 'Pendente', 'Em Andamento': 'Em Andamento', 'Aguardando Peça': 'Aguardando Peça', 'Concluído / Pronto': 'Concluído', 'Entregue / Pago': 'Entregue' };
            const newStatus = statusMap[header];
 
            const o = orders.find(x => x.id == id);
            if (o && o.status !== newStatus) {
                const prevStatus = o.status;
                o.status = newStatus; renderOrders();
                try {
                    const { error } = await sb.from('ordens').update({ status: newStatus }).eq('id', id);
                    if (error) throw error;
                } catch (err) {
                    console.error(err); o.status = prevStatus; renderOrders();
                    showToast('Erro ao mover a OS.', 'error');
                }
            }
        }
 
        function editOrder(id) {
            const o = orders.find(x => x.id === id); if (!o) return;
            openOrderModal(o.type);
            document.getElementById('o-id').value = o.id; document.getElementById('o-client').value = o.clientId; document.getElementById('o-emp').value = o.empId;
            document.getElementById('o-equip').value = o.equip; document.getElementById('o-sn').value = o.sn || '';
            document.getElementById('o-obs1').value = o.obs1 || ''; document.getElementById('o-obs2').value = o.obs2 || ''; document.getElementById('o-obs3').value = o.obs3 || '';
            document.getElementById('o-defect').value = o.defect || ''; document.getElementById('o-problems').value = o.problems || ''; document.getElementById('o-services-done').value = o.servicesDone || '';
            document.getElementById('o-status').value = o.status; document.getElementById('o-payment').value = o.payment; document.getElementById('o-down').value = o.down || '';
 
            document.getElementById('chk-liga').checked = o.check ? o.check.liga : false; document.getElementById('chk-tela').checked = o.check ? o.check.tela : false;
            document.getElementById('chk-carregador').checked = o.check ? o.check.carregador : false; document.getElementById('chk-senha').checked = o.check ? o.check.senha : false;
 
            currentOsItems = [...o.items]; currentOsPhotos = o.photos ? [...o.photos] : [];
 
            const preview = document.getElementById('o-photos-preview'); preview.innerHTML = '';
            currentOsPhotos.forEach(b64 => { const img = document.createElement('img'); img.src = b64; img.className = 'w-24 h-24 object-cover rounded-lg border-2 border-green-500/50'; preview.appendChild(img); });
            renderOsItems();
        }
 
        // Teclas de Atalho PDV
        document.addEventListener('keydown', (e) => {
            if (document.getElementById('view-pdv').classList.contains('hidden')) return;
            if (e.key === 'F2') { e.preventDefault(); document.getElementById('pdv-search').focus(); }
            if (e.key === 'F10') { e.preventDefault(); finalizePdvSale(); }
        });
 
        function preparePdv() {
            const cliSel = document.getElementById('pdv-client'); cliSel.innerHTML = '<option value="">Consumidor Final (Sem Cadastro)</option>' + clients.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            renderPdvProducts(); renderPdvCart(); document.getElementById('pdv-search').focus();
        }
 
        function renderPdvProducts() {
            const grid = document.getElementById('pdv-products-grid'); grid.innerHTML = '';
            const query = document.getElementById('pdv-search').value.toLowerCase();
            const filtered = products.filter(p => p.stock > 0 && (p.name.toLowerCase().includes(query) || (p.serial && p.serial.toLowerCase().includes(query))));
 
            if (filtered.length === 0) { grid.innerHTML = '<p class="col-span-full text-center text-slate-500 font-bold mt-10">Nenhum produto em estoque encontrado.</p>'; return; }
 
            filtered.forEach(p => {
                grid.innerHTML += `
                <div class="bg-[#1e293b] border border-green-500/20 p-4 rounded-xl flex flex-col justify-between hover:border-green-500 hover:shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all cursor-pointer group" onclick="addToPdvCart(${p.id})">
                    <div>
                        <div class="flex justify-between items-start mb-2"><span class="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded font-bold">${p.stock} un</span><i class="ph ph-package text-2xl text-slate-500 group-hover:text-green-500 transition-colors"></i></div>
                        <h4 class="font-bold text-white text-sm line-clamp-2 leading-tight">${p.name}</h4>
                    </div>
                    <div class="mt-3 flex justify-between items-end">
                        <span class="text-xs text-slate-400 font-mono">${p.serial || ''}</span>
                        <span class="text-lg font-black text-green-500">${formatMoney(p.price)}</span>
                    </div>
                </div>`;
            });
        }
 
        function addToPdvCart(id) {
            const p = products.find(x => x.id === id); if (!p) return;
            const inCart = pdvCart.find(x => x.id === id);
            if (inCart) { if (inCart.qty >= p.stock) return showToast('Estoque insuficiente!', 'error'); inCart.qty++; inCart.total = inCart.qty * inCart.unitPrice; }
            else { pdvCart.push({ type: 'product', id: p.id, name: p.name, qty: 1, unitPrice: p.price, total: p.price }); }
            renderPdvCart(); showToast(`${p.name} adicionado ao caixa!`);
        }
 
        function removeFromPdvCart(idx) { pdvCart.splice(idx, 1); renderPdvCart(); }
 
        function renderPdvCart() {
            const list = document.getElementById('pdv-cart-list'); const empty = document.getElementById('pdv-cart-empty');
            list.innerHTML = ''; let total = 0;
 
            if (pdvCart.length === 0) { list.classList.add('hidden'); empty.classList.remove('hidden'); }
            else { list.classList.remove('hidden'); empty.classList.add('hidden'); }
 
            pdvCart.forEach((i, idx) => {
                total += i.total;
                list.innerHTML += `<li class="flex justify-between items-center bg-[#1e293b] p-3 rounded-lg border border-green-500/10"><div class="flex-1"><p class="font-bold text-sm text-white leading-tight">${i.name}</p><p class="text-xs text-slate-400 mt-1">${i.qty}x ${formatMoney(i.unitPrice)}</p></div><div class="text-right ml-2"><p class="font-black text-green-500">${formatMoney(i.total)}</p><button onclick="removeFromPdvCart(${idx})" class="text-red-500 hover:text-red-400 text-xs mt-1 font-bold"><i class="ph ph-trash"></i> Remover</button></div></li>`;
            });
            document.getElementById('pdv-total').innerText = formatMoney(total);
            calculateChange();
        }
 
        function toggleChangeCalculator() {
            const method = document.getElementById('pdv-payment').value;
            const container = document.getElementById('pdv-change-container');
            if (method === 'Dinheiro') container.classList.remove('hidden'); else container.classList.add('hidden');
        }
 
        function calculateChange() {
            if (document.getElementById('pdv-payment').value !== 'Dinheiro') return;
            const total = pdvCart.reduce((acc, curr) => acc + curr.total, 0);
            const received = parseFloat(document.getElementById('pdv-received').value) || 0;
            const change = received - total;
            const changeEl = document.getElementById('pdv-change');
            if (change >= 0) { changeEl.innerText = formatMoney(change); changeEl.classList.replace('text-red-400', 'text-amber-400'); }
            else { changeEl.innerText = "Falta " + formatMoney(Math.abs(change)); changeEl.classList.replace('text-amber-400', 'text-red-400'); }
        }
 
        async function finalizePdvSale() {
            if (pdvCart.length === 0) return showToast('O carrinho está vazio!', 'error');
            const total = pdvCart.reduce((acc, curr) => acc + curr.total, 0);
            const payment = document.getElementById('pdv-payment').value;
 
            if (payment === 'Dinheiro') {
                const received = parseFloat(document.getElementById('pdv-received').value) || 0;
                if (received > 0 && received < total) return showToast('O valor recebido é menor que o total!', 'error');
            }
 
            const orderObj = {
                type: 'Venda PDV', clientId: parseInt(document.getElementById('pdv-client').value) || null,
                empId: currentUser ? (employees.find(e => e.name === currentUser.name) || { id: null }).id : null,
                equip: 'Venda Balcão', status: 'Entregue', payment: payment, total: total, items: [...pdvCart], date: new Date().toISOString()
            };
            if (payment === 'Dinheiro') {
                orderObj.received = parseFloat(document.getElementById('pdv-received').value) || total;
                orderObj.change = orderObj.received - total;
            }
 
            try {
                const { data, error } = await sb.from('ordens').insert(orderToDb(orderObj)).select().single();
                if (error) throw error;
                const savedOrder = mapOrder(data);
                orders.push(savedOrder);
 
                // Baixa no estoque (local + banco)
                for (const ci of pdvCart) {
                    const p = products.find(x => x.id === ci.id);
                    if (p) {
                        p.stock -= ci.qty;
                        await sb.from('produtos').update({ stock: p.stock }).eq('id', p.id);
                    }
                }
 
                pdvCart = []; document.getElementById('pdv-received').value = '';
                refreshAllViews(); preparePdv(); showToast('Venda finalizada com sucesso!');
 
                currentPreviewFormat = 'thermal'; currentPreviewId = savedOrder.id;
                document.getElementById('preview-render-area').innerHTML = generateThermalHTML(savedOrder, true);
                setTimeout(() => executePrint(), 300);
            } catch (err) { console.error(err); showToast('Erro ao finalizar a venda.', 'error'); }
        }
 
        // =====================================================================
        // FINANCEIRO
        // =====================================================================
        function renderFinances() {
            const filterMonth = document.getElementById('fin-month-filter').value;
 
            let totalIn = 0; let totalOut = 0;
            const listIn = document.getElementById('fin-list-in'); listIn.innerHTML = '';
            const listOut = document.getElementById('fin-list-out'); listOut.innerHTML = '';
 
            orders.forEach(o => {
                const oMonth = (o.date || '').slice(0, 7);
                if (oMonth !== filterMonth) return;
 
                let val = 0; let desc = '';
                if (o.type === 'Venda PDV') { val = o.total; desc = `Venda PDV #${padId(o.id)} (${o.payment})`; }
                else if (o.status === 'Entregue') { val = o.total; desc = `${o.type} #${padId(o.id)} (Pgto Final)`; }
                else if (o.down > 0) { val = o.down; desc = `Sinal ${o.type} #${padId(o.id)}`; }
 
                if (val > 0) {
                    totalIn += val;
                    listIn.innerHTML += `<li class="flex justify-between py-2"><span class="text-slate-300 font-medium">${desc}</span><span class="font-bold text-green-500">${formatMoney(val)}</span></li>`;
                }
            });
 
            expenses.forEach(e => {
                const eMonth = (e.date || '').slice(0, 7);
                if (eMonth !== filterMonth) return;
 
                totalOut += e.val;
                listOut.innerHTML += `<li class="flex justify-between py-2"><span class="text-slate-300 font-medium">${e.name}</span><span class="font-bold text-red-500">${formatMoney(e.val)}</span></li>`;
            });
 
            if (listIn.innerHTML === '') listIn.innerHTML = '<li class="py-4 text-center text-slate-500 text-xs font-bold uppercase">Nenhuma entrada no mês</li>';
            if (listOut.innerHTML === '') listOut.innerHTML = '<li class="py-4 text-center text-slate-500 text-xs font-bold uppercase">Nenhuma despesa no mês</li>';
 
            document.getElementById('fin-in').innerText = formatMoney(totalIn);
            document.getElementById('fin-out').innerText = formatMoney(totalOut);
            document.getElementById('fin-total').innerText = formatMoney(totalIn - totalOut);
 
            if (totalIn - totalOut < 0) document.getElementById('fin-total').classList.replace('text-blue-400', 'text-red-500');
            else document.getElementById('fin-total').classList.replace('text-red-500', 'text-blue-400');
        }
 
        async function saveExpense() {
            const name = document.getElementById('ex-name').value;
            const val = parseFloat(document.getElementById('ex-val').value) || 0;
            if (!name || val <= 0) return showToast('Descrição e Valor obrigatórios!', 'error');
            try {
                const { data, error } = await sb.from('despesas').insert(expenseToDb({ name, val, date: new Date().toISOString() })).select().single();
                if (error) throw error;
                expenses.push(mapExpense(data));
                refreshAllViews(); closeModal('expense-modal'); showToast('Despesa registrada!');
            } catch (err) { console.error(err); showToast('Erro ao registrar despesa.', 'error'); }
        }
 
        // =====================================================================
        // DASHBOARD
        // =====================================================================
        function renderDashboard() {
            renderAlerts();
            const osOrders = orders.filter(o => o.type !== 'Venda PDV');
            document.getElementById('dash-os-open').innerText = osOrders.filter(o => o.status === 'Pendente' || o.status === 'Aguardando Peça').length;
            document.getElementById('dash-os-progress').innerText = osOrders.filter(o => o.status === 'Em Andamento').length;
            document.getElementById('dash-clients').innerText = clients.length;
 
            const currentMonth = new Date().toISOString().slice(0, 7);
            let monthRev = 0;
            orders.forEach(o => {
                if ((o.date || '').slice(0, 7) === currentMonth) {
                    if (o.type === 'Venda PDV' || o.status === 'Entregue') monthRev += o.total; else if (o.down > 0) monthRev += o.down;
                }
            });
            document.getElementById('dash-revenue').innerText = formatMoney(monthRev);
 
            const filter = document.getElementById('dash-mov-filter').value;
            const tbody = document.getElementById('dash-recent-table'); tbody.innerHTML = '';
 
            let recent = [...orders].sort((a, b) => b.id - a.id);
            if (filter === 'OS') recent = recent.filter(o => o.type !== 'Venda PDV');
            if (filter === 'PDV') recent = recent.filter(o => o.type === 'Venda PDV');
 
            recent.slice(0, 8).forEach(o => {
                const c = clients.find(x => x.id === o.clientId);
                const isPdv = o.type === 'Venda PDV';
                tbody.innerHTML += `
                <tr class="hover:bg-[#1e293b] transition-colors">
                    <td class="p-3 text-slate-400 font-bold">#${padId(o.id)}</td>
                    <td class="p-3 text-white font-bold truncate max-w-[120px]">${c ? c.name : (isPdv ? 'Balcão' : 'Desc.')}</td>
                    <td class="p-3 text-slate-300 font-medium">${isPdv ? '<i class="ph ph-shopping-cart text-green-500"></i> Venda' : '<i class="ph ph-clipboard text-blue-400"></i> OS'}</td>
                    <td class="p-3">${getStatusBadge(o.status)}</td>
                    <td class="p-3 text-right font-black text-green-500">${formatMoney(o.total)}</td>
                </tr>`;
            });
        }
 
        // =====================================================================
        // CONFIGURAÇÕES / BACKUP
        // =====================================================================
        async function saveSettings() {
            settings.warranty = document.getElementById('cfg-warranty').value;
            try {
                const { error } = await sb.from('configuracoes').upsert({ id: 1, warranty: settings.warranty });
                if (error) throw error;
                showToast('Configurações salvas!');
            } catch (err) { console.error(err); showToast('Erro ao salvar configurações.', 'error'); }
        }
 
        function exportData() {
            const data = JSON.stringify({ clients, products, services, employees, orders, expenses, settings });
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `NortecOS_Backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click(); URL.revokeObjectURL(url);
        }
 
        async function importData(e) {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = async (ev) => {
                try {
                    const db = JSON.parse(ev.target.result);
                    showToast('Restaurando backup, aguarde...', 'success');
                    const jobs = [];
                    if (db.clients?.length) jobs.push(sb.from('clientes').upsert(db.clients.map(c => ({ id: c.id, ...clientToDb(c) }))));
                    if (db.products?.length) jobs.push(sb.from('produtos').upsert(db.products.map(p => ({ id: p.id, ...productToDb(p) }))));
                    if (db.services?.length) jobs.push(sb.from('servicos').upsert(db.services.map(s => ({ id: s.id, ...serviceToDb(s) }))));
                    if (db.employees?.length) jobs.push(sb.from('funcionarios').upsert(db.employees.map(x => ({ id: x.id, ...employeeToDb(x) }))));
                    if (db.orders?.length) jobs.push(sb.from('ordens').upsert(db.orders.map(o => ({ id: o.id, ...orderToDb(o) }))));
                    if (db.expenses?.length) jobs.push(sb.from('despesas').upsert(db.expenses.map(x => ({ id: x.id, ...expenseToDb(x) }))));
                    if (db.settings) jobs.push(sb.from('configuracoes').upsert({ id: 1, warranty: db.settings.warranty }));
                    const results = await Promise.all(jobs);
                    const failed = results.find(r => r.error);
                    if (failed) throw failed.error;
                    await initData();
                    showToast('Backup restaurado com sucesso!');
                } catch (err) { console.error(err); showToast('Arquivo inválido ou erro ao restaurar!', 'error'); }
            }; reader.readAsText(file);
        }
 
        let confirmAction = null;
        function confirmDelete(type, id) {
            confirmAction = async () => {
                const tableMap = { client: 'clientes', product: 'produtos', service: 'servicos', employee: 'funcionarios', order: 'ordens' };
                const table = tableMap[type];
                try {
                    const { error } = await sb.from(table).delete().eq('id', id);
                    if (error) throw error;
                    if (type === 'client') clients = clients.filter(x => x.id !== id);
                    if (type === 'product') products = products.filter(x => x.id !== id);
                    if (type === 'service') services = services.filter(x => x.id !== id);
                    if (type === 'employee') employees = employees.filter(x => x.id !== id);
                    if (type === 'order') orders = orders.filter(x => x.id !== id);
                    refreshAllViews(); closeConfirm(); showToast('Registro excluído!', 'error');
                } catch (err) { console.error(err); closeConfirm(); showToast('Erro ao excluir (pode haver registros vinculados).', 'error'); }
            };
            document.getElementById('confirm-modal').classList.remove('hidden');
            document.getElementById('modal-overlay').classList.remove('hidden');
        }
        function closeConfirm() { document.getElementById('confirm-modal').classList.add('hidden'); document.getElementById('modal-overlay').classList.add('hidden'); confirmAction = null; }
        document.getElementById('confirm-btn').addEventListener('click', () => { if (confirmAction) confirmAction(); });
 
        function openPreview(id) {
            currentPreviewId = id; const o = orders.find(x => x.id === id); if (!o) return;
            const isPdv = o.type === 'Venda PDV';
 
            document.getElementById('preview-modal').classList.remove('hidden');
 
            currentPreviewFormat = isPdv ? 'thermal' : 'a4';
            document.getElementById('btn-pdf-dl').style.display = isPdv ? 'none' : 'flex';
 
            const renderArea = document.getElementById('preview-render-area');
            renderArea.innerHTML = isPdv ? generateThermalHTML(o, true) : generateA4HTML(o);
        }
        function closePreview() { document.getElementById('preview-modal').classList.add('hidden'); }
 
        function injectQRCode(idElement, osId) {
            setTimeout(() => {
                const el = document.getElementById(idElement);
                if (el) {
                    el.innerHTML = '';
                    const trackUrl = window.location.origin + '/rastreio.html?os=' + osId;
                    new QRCode(el, { text: trackUrl, width: 80, height: 80, colorDark: "#000000", colorLight: "#ffffff" });
                }
            }, 100);
        }
 
        function generateA4HTML(o) {
            const c = clients.find(x => x.id === o.clientId) || { name: 'Consumidor Final', doc: '', phone: '', address: '' };
            const e = employees.find(x => x.id === o.empId) || { name: 'N/A' };
            let itemsHtml = '';
            o.items.forEach(i => { itemsHtml += `<tr><td style="padding: 10px; border: 1px solid #e2e8f0;">${i.name}</td><td style="padding: 10px; text-align:center; border: 1px solid #e2e8f0;">${i.qty}</td><td style="padding: 10px; text-align:right; border: 1px solid #e2e8f0;">${formatMoney(i.unitPrice)}</td><td style="padding: 10px; text-align:right; font-weight:bold; border: 1px solid #e2e8f0;">${formatMoney(i.total)}</td></tr>`; });
 
            injectQRCode('qr-a4', o.id);
 
            return `
            <div class="print-a4" id="pdf-content" style="padding: 30px; font-family: 'Inter', Helvetica, sans-serif; color: #333; max-width: 210mm; background: #fff; margin: auto;">
                <table style="width: 100%; margin-bottom: 25px; border-bottom: 2px solid #22c55e; padding-bottom: 20px;">
                    <tr>
                        <td style="width: 130px; vertical-align: middle;">
                            <img src="logo.jpeg" style="max-width: 110px; max-height: 110px; border-radius: 8px; object-fit: contain;" onerror="this.style.display='none'">
                        </td>
                        <td style="vertical-align: middle; padding-left: 20px;">
                            <h2 style="margin: 0 0 5px 0; color: #22c55e; font-size: 28px; font-weight: 900; letter-spacing: -0.5px;">NORTEC<span style="color: #1e293b;"> TECNOLOGIA</span></h2>
                            <p style="margin: 2px 0; font-size: 13px; color: #475569;">${COMPANY_ADDRESS}</p>
                            <p style="margin: 2px 0; font-size: 13px; color: #475569;"><strong>Telefone/WhatsApp:</strong> ${COMPANY_PHONE}</p>
                        </td>
                        <td style="width: 200px; text-align: right; vertical-align: top;">
                            <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                                <h3 style="margin: 0; font-size: 15px; color: #64748b; text-transform: uppercase; font-weight: bold;">${o.type}</h3>
                                <h1 style="margin: 8px 0; font-size: 28px; color: #22c55e; font-weight: 900; line-height: 1;">#${padId(o.id)}</h1>
                                <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 600;">Data: ${formatDate(o.date).split(' ')[0]}</p>
                            </div>
                        </td>
                    </tr>
                </table>
 
                <table style="width: 100%; margin-bottom: 25px;">
                    <tr>
                        <td style="vertical-align: top;">
                            <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; height: 100%; background: #fff;">
                                <h4 style="margin: 0 0 12px 0; color: #22c55e; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; font-size: 15px; font-weight: 800;">DADOS DO CLIENTE</h4>
                                <table style="width: 100%; font-size: 13px; color: #334155; border-spacing: 0;">
                                    <tr><td style="padding: 4px 0;"><strong>Nome:</strong> ${c.name}</td></tr>
                                    <tr><td style="padding: 4px 0;"><strong>CPF/CNPJ:</strong> ${c.doc || 'Não informado'}</td></tr>
                                    <tr><td style="padding: 4px 0;"><strong>Telefone:</strong> ${c.phone}</td></tr>
                                    <tr><td style="padding: 4px 0;"><strong>Endereço:</strong> ${c.address || 'Não informado'}</td></tr>
                                </table>
                            </div>
                        </td>
                        <td style="width: 150px; vertical-align: top; padding-left: 25px;">
                            <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center; background: #f8fafc; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                                <p style="margin: 0 0 10px 0; font-size: 11px; color: #475569; font-weight: 800; letter-spacing: 0.5px;">RASTREAR OS</p>
                                <div id="qr-a4" style="background: white; padding: 5px; border-radius: 4px; display: inline-block;"></div>
                            </div>
                        </td>
                    </tr>
                </table>
 
                <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 25px; background: #fff;">
                    <h4 style="margin: 0 0 12px 0; color: #22c55e; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; font-size: 15px; font-weight: 800;">DADOS DO EQUIPAMENTO</h4>
                    <table style="width: 100%; font-size: 13px; color: #334155; margin-bottom: 15px; border-spacing: 0;">
                        <tr>
                            <td style="padding: 5px 0; width: 50%;"><strong>Aparelho:</strong> ${o.equip}</td>
                            <td style="padding: 5px 0; width: 50%;"><strong>Nº Série / IMEI:</strong> ${o.sn || 'Não informado'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0;"><strong>Técnico Resp.:</strong> ${e.name}</td>
                            <td style="padding: 5px 0;"><strong>OBS 1 (Senha):</strong> ${o.obs1 || 'Não informada'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0;"><strong>OBS 2 (Acessórios):</strong> ${o.obs2 || 'Nenhum'}</td>
                            <td style="padding: 5px 0;"><strong>OBS 3 (Geral):</strong> ${o.obs3 || '-'}</td>
                        </tr>
                    </table>
 
                    <div style="background: #fef3c7; padding: 12px; border-radius: 6px; margin-bottom: 12px; border-left: 4px solid #f59e0b;">
                        <strong style="font-size: 13px; color: #b45309;">Defeito Relatado:</strong>
                        <p style="margin: 6px 0 0 0; font-size: 13px; color: #78350f;">${o.defect || 'Não informado'}</p>
                    </div>
                    ${o.problems ? `
                    <div style="background: #eff6ff; padding: 12px; border-radius: 6px; margin-bottom: 12px; border-left: 4px solid #3b82f6;">
                        <strong style="font-size: 13px; color: #1d4ed8;">Laudo Técnico:</strong>
                        <p style="margin: 6px 0 0 0; font-size: 13px; color: #1e3a8a;">${o.problems}</p>
                    </div>` : ''}
                    ${o.servicesDone ? `
                    <div style="background: #f0fdf4; padding: 12px; border-radius: 6px; border-left: 4px solid #22c55e;">
                        <strong style="font-size: 13px; color: #15803d;">Serviços Realizados:</strong>
                        <p style="margin: 6px 0 0 0; font-size: 13px; color: #14532d;">${o.servicesDone}</p>
                    </div>` : ''}
                </div>
 
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 13px;">
                    <thead>
                        <tr style="background: #f1f5f9; color: #475569;">
                            <th style="padding: 12px; text-align: left; border: 1px solid #e2e8f0; font-weight: 800;">Descrição do Item/Serviço</th>
                            <th style="padding: 12px; text-align: center; border: 1px solid #e2e8f0; width: 60px; font-weight: 800;">Qtd</th>
                            <th style="padding: 12px; text-align: right; border: 1px solid #e2e8f0; width: 110px; font-weight: 800;">Vlr. Unit</th>
                            <th style="padding: 12px; text-align: right; border: 1px solid #e2e8f0; width: 130px; font-weight: 800;">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml || '<tr><td colspan="4" style="padding: 20px; text-align: center; border: 1px solid #e2e8f0; color: #94a3b8; font-style: italic;">Nenhum item ou serviço adicionado.</td></tr>'}
                    </tbody>
                </table>
 
                <table style="width: 100%; margin-bottom: 40px;">
                    <tr>
                        <td style="width: 60%; vertical-align: top; padding-right: 25px;">
                            <div style="font-size: 11px; color: #475569; text-align: justify; padding: 15px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; line-height: 1.5;">
                                <strong style="color: #1e293b; display: block; margin-bottom: 6px;">TERMOS DE GARANTIA E CONDIÇÕES:</strong>
                                ${settings.warranty}
                            </div>
                        </td>
                        <td style="width: 40%; vertical-align: top;">
                            <div style="border: 2px solid #22c55e; border-radius: 8px; padding: 20px; background: #f0fdf4; box-shadow: 0 4px 6px -1px rgba(34, 197, 94, 0.1);">
                                ${o.down > 0 ? `<div style="display:flex; justify-content:space-between; margin-bottom:10px; font-size:14px; color: #475569;"><span>Sinal / Adiantamento:</span><strong>${formatMoney(o.down)}</strong></div>` : ''}
                                <div style="display:flex; justify-content:space-between; align-items: center; font-size:22px; font-weight:900; color:#16a34a; padding-top:10px; border-top: 1px dashed #22c55e;">
                                    <span>TOTAL:</span><span>${formatMoney(o.total)}</span>
                                </div>
                            </div>
                        </td>
                    </tr>
                </table>
 
                <table style="width: 100%; margin-top: 50px;">
                    <tr>
                        <td style="width: 45%; text-align: center; vertical-align: bottom;">
                            <div style="border-top: 1px solid #334155; width: 100%; margin-bottom: 10px;"></div>
                            <span style="font-size: 13px; font-weight: 800; color: #1e293b;">Assinatura do Cliente</span>
                        </td>
                        <td style="width: 10%;"></td>
                        <td style="width: 45%; text-align: center; vertical-align: bottom;">
                            <div style="border-top: 1px solid #334155; width: 100%; margin-bottom: 10px;"></div>
                            <span style="font-size: 13px; font-weight: 800; color: #1e293b;">Técnico Responsável / NORTEC</span>
                        </td>
                    </tr>
                </table>
            </div>`;
        }
 
        function generateThermalHTML(o, isReceipt = false) {
            let itemsHtml = '';
            o.items.forEach(i => { itemsHtml += `<div class="item-row"><span style="width:60%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${i.qty}x ${i.name}</span><span>${formatMoney(i.total)}</span></div>`; });
 
            injectQRCode('qr-thermal', o.id);
 
            if (isReceipt) {
                return `
                <div class="print-thermal">
                    <img src="logo.jpeg" class="thermal-logo" onerror="this.style.display='none'">
                    <div class="text-center bold" style="font-size:14px; margin-bottom:2px;">NORTEC TECNOLOGIA</div>
                    <div class="text-center" style="font-size:10px;">${COMPANY_ADDRESS}</div>
                    <div class="text-center" style="font-size:10px;">Whats: ${COMPANY_PHONE}</div>
                    <div class="divider"></div>
                    <div class="text-center bold" style="font-size:14px;">RECIBO DE VENDA #${padId(o.id)}</div>
                    <div class="text-center" style="font-size:10px;">${formatDate(o.date)}</div>
                    <div class="divider"></div>
                    <div class="bold item-row" style="margin-bottom:5px;"><span>DESCRIÇÃO</span><span>TOTAL</span></div>
                    ${itemsHtml}
                    <div class="divider"></div>
                    <div class="item-row bold" style="font-size:14px;"><span>TOTAL</span><span>${formatMoney(o.total)}</span></div>
                    <div class="item-row" style="font-size:10px;"><span>PAGAMENTO</span><span>${o.payment || '-'}</span></div>
                    ${o.received ? `<div class="item-row" style="font-size:10px;"><span>Recebido</span><span>${formatMoney(o.received)}</span></div><div class="item-row" style="font-size:10px;"><span>Troco</span><span>${formatMoney(o.change)}</span></div>` : ''}
                    <div class="divider"></div>
                    <div class="text-center" style="font-size:10px; margin-top:10px;">Obrigado pela preferência!</div>
                    <div class="text-center" style="font-size:10px;">Volte Sempre!</div>
                    <div style="height: 20px;"></div>
                </div>`;
            }
 
            const c = clients.find(x => x.id === o.clientId) || { name: '' };
            return `
            <div class="print-thermal">
                <img src="logo.jpeg" class="thermal-logo" onerror="this.style.display='none'">
                <div class="text-center bold" style="font-size:14px; margin-bottom:2px;">NORTEC TECNOLOGIA</div>
                <div class="text-center" style="font-size:10px;">${COMPANY_ADDRESS}</div>
                <div class="text-center" style="font-size:10px;">Whats: ${COMPANY_PHONE}</div>
                <div class="divider"></div>
 
                <div class="text-center bold" style="font-size:14px;">${o.type} #${padId(o.id)}</div>
                <div class="text-center" style="font-size:10px;">${formatDate(o.date)}</div>
                <div class="divider"></div>
 
                <p><strong>Cliente:</strong> ${c.name}</p>
                <p><strong>Aparelho:</strong> ${o.equip}</p>
                ${o.problems ? `<p><strong>Laudo:</strong> ${o.problems}</p>` : ''}
                <div class="divider"></div>
 
                <div class="bold item-row" style="margin-bottom:5px;"><span>DESCRIÇÃO</span><span>TOTAL</span></div>
                ${itemsHtml}
                <div class="divider"></div>
 
                ${o.down > 0 ? `<div class="item-row"><span>Sinal/Adiant.</span><span>${formatMoney(o.down)}</span></div>` : ''}
                <div class="item-row bold" style="font-size:14px;"><span>TOTAL</span><span>${formatMoney(o.total)}</span></div>
 
                <div class="divider"></div>
                <div style="font-size:9px; text-align:justify; margin:10px 0;">${settings.warranty}</div>
                <div class="divider"></div>
 
                <div class="text-center" style="margin-top:10px;">Rastreie sua OS:</div>
                <div id="qr-thermal" style="display:flex; justify-content:center; margin: 10px 0;"></div>
 
                <div style="margin-top: 30px; text-align:center;">
                    <div style="border-top:1px solid #000; width:80%; margin:0 auto 2px auto;"></div>
                    <span style="font-size:10px;">Assinatura do Cliente</span>
                </div>
                <div style="height: 30px;"></div>
            </div>`;
        }
 
        function downloadPDF() {
            const el = document.getElementById('pdf-content');
            const opt = { margin: 0, filename: `Nortec_OS_${currentPreviewId}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
            html2pdf().set(opt).from(el).save();
        }
 
        function executePrint() {
            const el = document.getElementById('preview-render-area').innerHTML;
            const p = document.getElementById('print-container');
            p.innerHTML = el;
            window.print();
        }
 
        // --- Inicia ---
        initData();
 
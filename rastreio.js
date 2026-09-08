// =====================================================================
// CONFIGURAÇÃO SUPABASE — mesmas credenciais do app principal
// (a chave "anon/publishable" é feita para ser pública; quem protege
// os dados é a RLS configurada no banco, não o sigilo desta chave)
const SUPABASE_URL = 'https://ymmqgegfwajuzellaxtv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_D56Elfod7F6wf6gwcE4aKA_l-mu_iEp';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const padId = (id) => String(id).slice(-5).padStart(5, '0');
const formatMoney = (val) => Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function resetTracking() {
    document.getElementById('rt-form').classList.remove('hidden');
    document.getElementById('rt-back-btn').classList.add('hidden');
    document.getElementById('track-result').classList.add('hidden');
    document.getElementById('track-id').value = '';
    document.getElementById('track-id').focus();
    // Limpa o "?os=" da URL pra permitir nova consulta sem confundir
    window.history.replaceState({}, '', window.location.pathname);
}

async function doTracking(idFromUrl) {
    const id = parseInt(idFromUrl || document.getElementById('track-id').value);
    if (!id) return;

    document.getElementById('rt-form').classList.add('hidden');
    document.getElementById('rt-back-btn').classList.remove('hidden');
    const res = document.getElementById('track-result');
    res.classList.remove('hidden');
    res.innerHTML = '<p class="text-center text-slate-400 font-bold">Buscando...</p>';

    try {
        const { data, error } = await sb.from('ordens').select('*').eq('id', id).neq('type', 'Venda PDV').maybeSingle();
        if (error) throw error;
        if (!data) {
            res.innerHTML = '<p class="text-red-400 font-bold text-center"><i class="ph ph-warning"></i> OS não encontrada.</p>';
            return;
        }

        const status = data.status;
        const total = Number(data.total) || 0;
        const problems = data.problems || '';

        let statusCor = 'text-green-500';
        if (status === 'Pendente' || status === 'Aguardando Peça') statusCor = 'text-amber-500';
        else if (status === 'Em Andamento') statusCor = 'text-blue-500';
        else if (status === 'Entregue') statusCor = 'text-slate-400';

        res.innerHTML = `
            <div class="border-b border-green-500/20 pb-3 mb-3">
                <h3 class="font-bold text-white text-lg">OS #${padId(data.id)}</h3>
                <p class="text-sm text-slate-300 font-medium">${data.equip || ''}</p>
            </div>
            <div class="mb-3">
                <p class="text-xs text-slate-400 uppercase tracking-wider font-bold">Status Atual</p>
                <p class="text-xl font-black ${statusCor}">${status}</p>
            </div>
            <div class="mb-3">
                <p class="text-xs text-slate-400 uppercase tracking-wider font-bold">Total do Serviço</p>
                <p class="font-black text-white text-lg">${formatMoney(total)}</p>
            </div>
            ${problems ? `<div class="bg-[#1e293b] p-3 rounded-lg border border-green-500/10 mt-2"><p class="text-xs text-green-400 font-bold mb-1">Laudo Técnico:</p><p class="text-sm text-slate-300 italic">${problems}</p></div>` : ''}
        `;
    } catch (err) {
        console.error(err);
        res.innerHTML = '<p class="text-red-400 font-bold text-center">Erro ao consultar. Tente novamente.</p>';
    }
}

// Se a página foi aberta via QR Code / link com ?os=123, já busca direto
(function initFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const osParam = params.get('os');
    if (osParam) {
        document.getElementById('track-id').value = osParam;
        doTracking(osParam);
    }
})();
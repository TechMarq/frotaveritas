const ADMIN_PASSWORD = "M@nu2398";

// --- Configuração Supabase ---
const SUPABASE_URL = 'https://ffgwqsrfmmcqwjjkbrsq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmZ3dxc3JmbW1jcXdqamticnNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NDA3MDEsImV4cCI6MjA5MDAxNjcwMX0.bLHIvQENAcGZ0i0zk85oW7NPvGuMtJey7RqzORcqf0U';

let client = null;
try {
    console.log('Tentando inicializar Supabase...');
    if (typeof supabase !== 'undefined') {
        client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('Cliente Supabase inicializado com sucesso!');
    } else {
        console.error('Erro: A biblioteca Supabase não foi carregada corretamente via CDN.');
    }
} catch (e) {
    console.error('Falha crítica ao inicializar Supabase:', e);
}

// --- Elementos DOM ---
const vehicleList = document.getElementById('vehicleList');
const searchInput = document.getElementById('searchInput');
const adminToggle = document.getElementById('adminToggle');

// Modais e Forms
const addModal = document.getElementById('addModal');
const addForm = document.getElementById('addForm');
const driverModal = document.getElementById('driverModal');
const driverForm = document.getElementById('driverForm');
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');

// Dropdowns
const driverSelect = document.getElementById('addCondutorPrincipalId');

// --- Estado Global ---
let vehicles = [];
let drivers = [];
let isAdmin = false;
let currentSort = {
    dashboard: { key: 'placa', dir: 'asc' },
    vehicles: { key: 'placa', dir: 'asc' },
    drivers: { key: 'nome_completo', dir: 'asc' }
};

// ============================================================
//  COLUMN MANAGER
// ============================================================

const COL_DEFS = {
    dashboard: [
        { key: 'placa', label: 'Placa', visible: true },
        { key: 'modelo', label: 'Modelo', visible: true },
        { key: 'condutor', label: 'Alocação Atual', visible: true },
        { key: 'whats', label: 'WhatsApp', visible: true },
    ],
    vehicles: [
        { key: 'placa', label: 'Placa', visible: true },
        { key: 'marca_modelo', label: 'Marca/Modelo', visible: true },
        { key: 'proprietario', label: 'Proprietário', visible: true },
        { key: 'venc_seguro', label: 'Venc. Seguro', visible: true },
        { key: 'seguradora', label: 'Seguradora', visible: false },
        { key: 'numero_apolice', label: 'Nº Apólice', visible: false },
        { key: 'valor_premio', label: 'Valor Prêmio', visible: false },
        { key: 'valor_franquia', label: 'Valor Franquia', visible: false },
        { key: 'forma_pagamento', label: 'Forma Pgto.', visible: false },
        { key: 'corretor_seguro', label: 'Corretor', visible: false },
        { key: 'classificacao', label: 'Classificação', visible: false },
        { key: 'status', label: 'Status', visible: false },
        { key: 'cor', label: 'Cor', visible: false },
        { key: 'ano_fabricacao', label: 'Ano Fab.', visible: false },
        { key: 'ano_modelo', label: 'Ano Modelo', visible: false },
        { key: 'renavam', label: 'RENAVAM', visible: false },
        { key: 'chassi', label: 'Chassi', visible: false },
        { key: 'codigo_fipe', label: 'Cód. FIPE', visible: false },
        { key: 'condutor_principal', label: 'Condutor Seguro', visible: true },
        { key: 'motorista_alocado', label: 'Alocação Atual', visible: true },
        { key: 'data_aquisicao_nf', label: 'Dt. Aquisição', visible: false },
        { key: 'actions', label: 'Ações', visible: true },
    ],
    drivers: [
        { key: 'nome_completo', label: 'Nome Completo', visible: true },
        { key: 'cpf', label: 'CPF', visible: true },
        { key: 'cnh_cat', label: 'CNH / Categoria', visible: true },
        { key: 'vencimento_cnh', label: 'Vencimento CNH', visible: true },
        { key: 'idade', label: 'Idade', visible: true },
        { key: 'vinculos_seguro', label: 'Qtd. Seguros Principal', visible: true },
        { key: 'contato_whatsapp', label: 'WhatsApp', visible: false },
        { key: 'data_nascimento', label: 'Nascimento', visible: false },
        { key: 'status', label: 'Status', visible: true },
        { key: 'actions', label: 'Ações', visible: true },
    ],
};

const LS_KEY = 'frotalink_cols_v1';

function loadColConfig() {
    try {
        const saved = localStorage.getItem(LS_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            ['dashboard', 'vehicles', 'drivers'].forEach(tab => {
                if (parsed[tab]) {
                    // Merge: preserve new keys, respect saved order+visibility
                    const savedKeys = parsed[tab].map(c => c.key);
                    const existingKeys = COL_DEFS[tab].map(c => c.key);
                    // Build ordered list from saved, then append any new keys not yet saved
                    const merged = [
                        ...parsed[tab].filter(c => existingKeys.includes(c.key)),
                        ...COL_DEFS[tab].filter(c => !savedKeys.includes(c.key))
                    ];
                    COL_DEFS[tab] = merged;
                }
            });
        }
    } catch (e) { /* ignore */ }
}

function saveColConfig() {
    localStorage.setItem(LS_KEY, JSON.stringify(COL_DEFS));
}

function getActiveCols(tab) {
    return COL_DEFS[tab].filter(c => c.visible);
}

// ---------- Panel UI ----------

function toggleColPanel(tab) {
    const panel = document.getElementById('colPanel-' + tab);
    if (!panel) return;
    const isOpen = panel.style.display !== 'none';
    panel.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) renderColPanel(tab);
}

function renderColPanel(tab) {
    const list = document.getElementById('colList-' + tab);
    if (!list) return;

    list.innerHTML = COL_DEFS[tab].map((col, idx) => `
        <div class="col-chip ${col.visible ? '' : 'hidden-col'}"
             draggable="true"
             data-tab="${tab}"
             data-idx="${idx}"
             id="chip-${tab}-${idx}"
             ondragstart="onChipDragStart(event)"
             ondragover="onChipDragOver(event)"
             ondrop="onChipDrop(event)"
             ondragleave="onChipDragLeave(event)"
             ondragend="onChipDragEnd(event)">
            <span class="col-chip-grip">⠿</span>
            <span>${col.label}</span>
            <button class="col-chip-eye" title="${col.visible ? 'Ocultar coluna' : 'Mostrar coluna'}"
                    onclick="toggleColVisibility('${tab}', ${idx})" type="button">
                ${col.visible ? '👁' : '🚫'}
            </button>
        </div>
    `).join('');
}

function toggleColVisibility(tab, idx) {
    COL_DEFS[tab][idx].visible = !COL_DEFS[tab][idx].visible;
    saveColConfig();
    renderColPanel(tab);
    renderAll();
}

function resetColumns(tab) {
    localStorage.removeItem(LS_KEY);
    // Re-read from the original defaults
    const origDefs = {
        dashboard: [
            { key: 'placa', label: 'Placa', visible: true },
            { key: 'modelo', label: 'Modelo', visible: true },
            { key: 'condutor', label: 'Condutor Atual', visible: true },
            { key: 'whats', label: 'WhatsApp', visible: true },
        ],
        vehicles: [
            { key: 'placa', label: 'Placa', visible: true },
            { key: 'marca_modelo', label: 'Marca/Modelo', visible: true },
            { key: 'proprietario', label: 'Proprietário', visible: true },
            { key: 'venc_seguro', label: 'Venc. Seguro', visible: true },
            { key: 'seguradora', label: 'Seguradora', visible: false },
            { key: 'numero_apolice', label: 'Nº Apólice', visible: false },
            { key: 'valor_premio', label: 'Valor Prêmio', visible: false },
            { key: 'valor_franquia', label: 'Valor Franquia', visible: false },
            { key: 'forma_pagamento', label: 'Forma Pgto.', visible: false },
            { key: 'classificacao', label: 'Classificação', visible: false },
            { key: 'status', label: 'Status', visible: false },
            { key: 'cor', label: 'Cor', visible: false },
            { key: 'ano_fabricacao', label: 'Ano Fab.', visible: false },
            { key: 'ano_modelo', label: 'Ano Modelo', visible: false },
            { key: 'renavam', label: 'RENAVAM', visible: false },
            { key: 'chassi', label: 'Chassi', visible: false },
            { key: 'codigo_fipe', label: 'Cód. FIPE', visible: false },
            { key: 'data_aquisicao_nf', label: 'Dt. Aquisição', visible: false },
            { key: 'actions', label: 'Ações', visible: true },
        ],
        drivers: [
            { key: 'nome_completo', label: 'Nome Completo', visible: true },
            { key: 'cpf', label: 'CPF', visible: true },
            { key: 'cnh_cat', label: 'CNH / Categoria', visible: true },
            { key: 'vencimento_cnh', label: 'Vencimento CNH', visible: true },
            { key: 'idade', label: 'Idade', visible: true },
            { key: 'contato_whatsapp', label: 'WhatsApp', visible: false },
            { key: 'data_nascimento', label: 'Nascimento', visible: false },
            { key: 'status', label: 'Status', visible: true },
            { key: 'actions', label: 'Ações', visible: true },
        ],
    };
    COL_DEFS[tab] = origDefs[tab];
    saveColConfig();
    renderColPanel(tab);
    renderAll();
}

// ---------- Drag & Drop ----------

let dragSrcTab = null;
let dragSrcIdx = null;

function onChipDragStart(e) {
    dragSrcTab = e.currentTarget.dataset.tab;
    dragSrcIdx = parseInt(e.currentTarget.dataset.idx);
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function onChipDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
}

function onChipDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function onChipDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    document.querySelectorAll('.col-chip').forEach(c => c.classList.remove('drag-over'));
}

function onChipDrop(e) {
    e.preventDefault();
    const targetIdx = parseInt(e.currentTarget.dataset.idx);
    const targetTab = e.currentTarget.dataset.tab;

    if (dragSrcTab !== targetTab || dragSrcIdx === targetIdx) return;

    const cols = COL_DEFS[targetTab];
    const [moved] = cols.splice(dragSrcIdx, 1);
    cols.splice(targetIdx, 0, moved);

    saveColConfig();
    renderColPanel(targetTab);
    renderAll();
}

// ---------- Dynamic thead render ----------

function renderThead(tab) {
    const thead = document.getElementById('thead-' + tab);
    if (!thead) return;
    const active = getActiveCols(tab);
    const sort = currentSort[tab];

    thead.innerHTML = '<tr>' + active.map(c => {
        const isSorted = sort.key === c.key;
        const icon = isSorted ? (sort.dir === 'asc' ? 'chevron-up' : 'chevron-down') : 'chevrons-up-down';
        const isSortable = c.key !== 'actions';

        return `
            <th ${isSortable ? `onclick="handleSort('${tab}', '${c.key}')" style="cursor:pointer; user-select:none;"` : ''} 
                class="${isSortable ? 'sortable-header' : ''} ${isSorted ? 'active-sort' : ''} ${c.key === 'actions' ? 'col-actions' : ''}">
                <div style="display: flex; align-items: center; gap: 0.4rem; justify-content: ${c.key === 'actions' ? 'center' : 'flex-start'}">
                    ${c.label}
                    ${isSortable ? `<i data-lucide="${icon}" style="width:12px; height:12px; opacity:${isSorted ? 1 : 0.4}"></i>` : ''}
                </div>
            </th>`;
    }).join('') + '</tr>';
    if (window.lucide) lucide.createIcons();
}

function handleSort(tab, key) {
    if (currentSort[tab].key === key) {
        currentSort[tab].dir = currentSort[tab].dir === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort[tab].key = key;
        currentSort[tab].dir = 'asc';
    }
    renderAll();
}

// --- Funções de UI ---

function toggleAdminMode() {

    // 👉 Se já está ativo, desativa direto (sem senha)
    if (isAdmin) {
        isAdmin = false;
        adminToggle.classList.remove('active');
        document.body.classList.remove('admin-active');
        renderAll();
        return;
    }

    // 👉 Se NÃO está ativo, pede senha
    const senha = prompt("🔐 Digite a senha de administrador:");

    if (senha === ADMIN_PASSWORD) {
        isAdmin = true;
        adminToggle.classList.add('active');
        document.body.classList.add('admin-active');
        renderAll();
    } else {
        alert("❌ Senha incorreta!");
    }
}

function switchView(viewName) {
    // Alternar botões
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick').includes(viewName)) btn.classList.add('active');
    });

    // Alternar seções
    document.querySelectorAll('.view-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(viewName + 'View').classList.add('active');
}

function renderAll() {
    renderVehicles();
    renderFullVehicles();
    renderFullDrivers();
    checkNotifications(); // 🔔 Atualiza notificações sempre que renderizar
}

// ============================================================
//  NOTIFICAÇÕES
// ============================================================

function toggleNotiPanel() {
    const panel = document.getElementById('notiPanel');
    if (panel) panel.classList.toggle('active');
}

function checkNotifications() {
    if (!drivers.length && !vehicles.length) return;

    const alerts = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Considerar apenas a data

    // CNH Alerts (Drivers) - 2 meses antes (60 dias aprox)
    drivers.forEach(d => {
        if (!d.vencimento_cnh) return;
        const venc = new Date(d.vencimento_cnh + 'T00:00:00'); // Garantir timezone local
        const diffTime = venc - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            alerts.push({
                type: 'expired',
                title: 'CNH Vencida 🔴',
                desc: `Motorista: ${d.nome_completo}`,
                date: formatDate(d.vencimento_cnh),
                itemType: 'driver',
                id: d.id
            });
        } else if (diffDays <= 60) {
            alerts.push({
                type: 'warning',
                title: 'CNH a Vencer 🟠',
                desc: `Motorista: ${d.nome_completo} em ${diffDays} dias`,
                date: formatDate(d.vencimento_cnh),
                itemType: 'driver',
                id: d.id
            });
        }
    });

    // Seguro Alerts (Vehicles) - 1 mês antes (30 dias aprox)
    vehicles.forEach(v => {
        if (!v.vencimento_seguro) return;
        const venc = new Date(v.vencimento_seguro + 'T00:00:00');
        const diffTime = venc - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            alerts.push({
                type: 'expired',
                title: 'Seguro Vencido 🔴',
                desc: `Veículo: ${v.placa} (${v.modelo})`,
                date: formatDate(v.vencimento_seguro),
                itemType: 'vehicle',
                id: v.id
            });
        } else if (diffDays <= 30) {
            alerts.push({
                type: 'warning',
                title: 'Seguro a Vencer 🟠',
                desc: `Veículo: ${v.placa} em ${diffDays} dias`,
                date: formatDate(v.vencimento_seguro),
                itemType: 'vehicle',
                id: v.id
            });
        }
    });

    updateNotiUI(alerts);
}

function updateNotiUI(alerts) {
    const badge = document.getElementById('notiBadge');
    const list = document.getElementById('notiList');
    if (!badge || !list) return;

    if (alerts.length > 0) {
        badge.innerText = alerts.length;
        badge.style.display = 'flex';

        list.innerHTML = alerts.map(a => `
            <div class="noti-item noti-type-${a.type}" onclick="focusNotiItem('${a.itemType}', '${a.id}')">
                <div class="noti-item-title">${a.title}</div>
                <div class="noti-item-desc">${a.desc}</div>
                <div class="noti-date">Data: ${a.date}</div>
            </div>
        `).join('');
    } else {
        badge.style.display = 'none';
        list.innerHTML = '<div class="noti-empty">Nenhuma pendência encontrada ✨</div>';
    }
}

function focusNotiItem(type, id) {
    if (type === 'driver') {
        switchView('drivers');
        const searchInput = document.getElementById('searchInput');
        const driver = drivers.find(d => d.id === id);
        if (driver && searchInput) {
            searchInput.value = driver.nome_completo;
            renderAll();
        }
    } else {
        switchView('vehicles');
        const searchInput = document.getElementById('searchInput');
        const vehicle = vehicles.find(v => v.id === id);
        if (vehicle && searchInput) {
            searchInput.value = vehicle.placa;
            renderAll();
        }
    }
    toggleNotiPanel();
}

// ============================================================
//  DETALHAMENTO (POP-UPS)
// ============================================================

function openVehicleDetail(id) {
    const v = vehicles.find(item => item.id === id);
    if (!v) return;

    const modal = document.getElementById('vehicleDetailModal');
    const content = document.getElementById('vehicleDetailContent');
    const title = document.getElementById('vehicleDetailTitle');

    if (!modal || !content || !title) return;

    title.innerText = `Detalhes: ${v.placa}`;

    content.innerHTML = `
        <div class="detail-item"><strong>Marca/Modelo:</strong> ${v.marca || ''} ${v.modelo}</div>
        <div class="detail-item"><strong>Placa:</strong> ${v.placa}</div>
        <div class="detail-item"><strong>RENAVAM:</strong> ${v.renavam || '-'}</div>
        <div class="detail-item"><strong>Cor:</strong> ${v.cor || '-'}</div>
        <div class="detail-item"><strong>Ano:</strong> ${v.ano_fabricacao || '-'}/${v.ano_modelo || '-'}</div>
        <div class="detail-item"><strong>Proprietário:</strong> ${v.proprietario || '-'}</div>
        <div class="detail-item"><strong>Classificação:</strong> ${v.classificacao || '-'}</div>
        <div class="detail-item"><strong>Status:</strong> <span class="badge ${v.status === 'ATIVO' ? 'success' : 'danger'}">${v.status || 'ATIVO'}</span></div>
        
        <div class="form-section-header">Seguro</div>
        <div class="detail-item"><strong>Seguradora:</strong> ${v.seguradora || '-'}</div>
        <div class="detail-item"><strong>Vencimento:</strong> ${formatDate(v.vencimento_seguro)}</div>
        <div class="detail-item"><strong>Apólice:</strong> ${v.numero_apolice || '-'}</div>
        <div class="detail-item"><strong>Corretor:</strong> ${v.corretor_seguro || '-'}</div>
        
        <div class="form-section-header">Técnico</div>
        <div class="detail-item"><strong>Chassi:</strong> ${v.chassi || '-'}</div>
        <div class="detail-item"><strong>Motor:</strong> ${v.numero_motor || '-'}</div>
        <div class="detail-item"><strong>FIPE:</strong> ${v.codigo_fipe || '-'} / R$ ${Number(v.valor_fipe_mes || 0).toLocaleString('pt-BR')}</div>
    `;

    modal.style.display = 'flex';
}

function closeVehicleDetail() {
    const modal = document.getElementById('vehicleDetailModal');
    if (modal) modal.style.display = 'none';
}

function openDriverDetail(id) {
    if (!id || id === 'garagem' || id === 'manutencao' || id === 'disponivel') return;

    const d = drivers.find(item => item.id === id);
    if (!d) return;

    const modal = document.getElementById('driverDetailModal');
    const content = document.getElementById('driverDetailContent');
    const title = document.getElementById('driverDetailTitle');

    if (!modal || !content || !title) return;

    title.innerText = d.nome_completo;

    content.innerHTML = `
        <div class="detail-item"><strong>Nome:</strong> ${d.nome_completo}</div>
        <div class="detail-item"><strong>CPF:</strong> ${d.cpf || '-'}</div>
        <div class="detail-item"><strong>WhatsApp:</strong> ${d.contato_whatsapp || '-'}</div>
        <div class="detail-item"><strong>Idade:</strong> ${calcAge(d.data_nascimento)}</div>
        <div class="detail-item"><strong>Nascimento:</strong> ${formatDate(d.data_nascimento)}</div>
        
        <div class="form-section-header">Habilitação</div>
        <div class="detail-item"><strong>Registro CNH:</strong> ${d.registro_cnh || '-'}</div>
        <div class="detail-item"><strong>Categoria:</strong> ${d.categoria_cnh || '-'}</div>
        <div class="detail-item"><strong>Vencimento:</strong> ${formatDate(d.vencimento_cnh)}</div>
        
        <div class="form-section-header">Status atual</div>
        <div class="detail-item"><strong>Status:</strong> <span class="badge ${d.status === 'ATIVO' ? 'success' : 'danger'}">${d.status}</span></div>
    `;

    modal.style.display = 'flex';
}

function closeDriverDetail() {
    const modal = document.getElementById('driverDetailModal');
    if (modal) modal.style.display = 'none';
}

// Fechar painel ao clicar fora
document.addEventListener('click', (e) => {
    const panel = document.getElementById('notiPanel');
    const btn = document.getElementById('notiBtn');
    if (panel && panel.classList.contains('active') && !panel.contains(e.target) && !btn.contains(e.target)) {
        panel.classList.remove('active');
    }

    // Também fechar modais de detalhe ao clicar no overlay
    const vModal = document.getElementById('vehicleDetailModal');
    const dModal = document.getElementById('driverDetailModal');
    if (e.target === vModal) closeVehicleDetail();
    if (e.target === dModal) closeDriverDetail();
});



function formatDate(dateStr) {
    if (!dateStr) return '-';
    // Se a data já vier formatada ou for nula, retornar padrão
    try {
        const [year, month, day] = dateStr.split('-');
        if (!day) return dateStr; // Caso não seja no formato YYYY-MM-DD
        return `${day}/${month}/${year}`;
    } catch (e) {
        return dateStr;
    }
}

function openEditModal(id) {
    const v = vehicles.find(v => v.id === id);
    if (!v) return;

    document.getElementById('editId').value = v.id;
    document.getElementById('editPlaca').value = v.placa;

    // Descobrir quais motoristas já estão ocupados em outros veículos
    const occupiedDriverIds = vehicles
        .filter(veh => veh.condutor_principal_id && veh.id !== id)
        .map(veh => veh.condutor_principal_id);

    const select = document.getElementById('editMotoristaSelect');
    if (select) {
        let options = '<option value="">Desvincular (Nenhum)</option>';

        drivers.forEach(d => {
            const isOccupied = occupiedDriverIds.includes(d.id);
            if (!isOccupied) {
                const isCurrent = d.id === v.condutor_principal_id;
                options += `<option value="${d.id}" ${isCurrent ? 'selected' : ''}>${d.nome_completo} (${d.cpf || 'Sem CPF'})</option>`;
            }
        });

        select.innerHTML = options;
    }

    editModal.style.display = 'flex';
}

async function handleEditAllocation(e) {
    e.preventDefault();
    if (!client) return;

    const vehicleId = document.getElementById('editId').value;
    const newDriverId = document.getElementById('editMotoristaSelect').value || null;

    try {
        const { error } = await client
            .from('veiculos')
            .update({ condutor_principal_id: newDriverId })
            .eq('id', vehicleId);

        if (error) throw error;

        closeModal();
        fetchVehicles();
        alert('Alocação atualizada com sucesso!');
    } catch (err) {
        console.error('Erro na alocação:', err);
        alert('Falha ao atualizar alocação: ' + err.message);
    }
}

function calculateAge() {
    const birthday = document.getElementById('driverNascimento').value;
    if (!birthday) return;
    const today = new Date();
    const birthDate = new Date(birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    document.getElementById('driverIdade').value = age + ' anos';
}

function renderVehicles() {
    const searchTerm = searchInput.value.toLowerCase();
    const list = document.getElementById('vehicleList');
    if (!list) return;

    renderThead('dashboard');

    // Filtra apenas veículos ativos para o Dashboard de alocação
    const activeVehicles = vehicles.filter(v => (v.status === 'ATIVO' || !v.status));

    const filtered = activeVehicles.filter(v => {
        const condutorAtual = v.motorista_alocado ? v.motorista_alocado.nome_completo : (v.status_alocacao || 'DISPONÍVEL');
        return (
            v.placa.toLowerCase().includes(searchTerm) ||
            v.modelo.toLowerCase().includes(searchTerm) ||
            condutorAtual.toLowerCase().includes(searchTerm) ||
            (v.motoristas && v.motoristas.nome_completo.toLowerCase().includes(searchTerm))
        );
    });

    const activeCols = getActiveCols('dashboard');
    const sort = currentSort.dashboard;

    // Sorteia os dados filtrados
    filtered.sort((a, b) => {
        let valA, valB;
        if (sort.key === 'condutor') {
            valA = (a.motorista_alocado?.nome_completo || '').toLowerCase();
            valB = (b.motorista_alocado?.nome_completo || '').toLowerCase();
        } else {
            valA = (a[sort.key] || '').toString().toLowerCase();
            valB = (b[sort.key] || '').toString().toLowerCase();
        }
        if (valA < valB) return sort.dir === 'asc' ? -1 : 1;
        if (valA > valB) return sort.dir === 'asc' ? 1 : -1;
        return 0;
    });

    if (activeVehicles.length === 0) {
        list.innerHTML = `<tr><td colspan="${activeCols.length}" style="text-align:center; padding: 2rem;">Vazio ou sem veículos ativos...</td></tr>`;
        return;
    }

    // Descobrir quais motoristas já estão ocupados (ativos apenas)
    const occupiedDriverIds = vehicles
        .filter(veh => veh.motorista_alocado_id && veh.status === 'ATIVO')
        .map(veh => veh.motorista_alocado_id);

    const activeDrivers = drivers.filter(d => d.status === 'ATIVO');

    list.innerHTML = filtered.map(v => {
        const specialStatus = JSON.parse(localStorage.getItem('vehicleStatus')) || {};
        const currentSpecial = specialStatus[v.id];
        let options = '<option value="">-- Vincular Motorista --</option>';
        options += `<option value="MANUTENCAO" ${v.status_alocacao === 'MANUTENCAO' ? 'selected' : ''}>Manutenção</option>`;
        options += `<option value="GARAGEM" ${v.status_alocacao === 'GARAGEM' ? 'selected' : ''}>Garagem</option>`;
        options += `<option value="DISPONIVEL" ${v.status_alocacao === 'DISPONIVEL' ? 'selected' : ''}>Disponível</option>`;
        activeDrivers.forEach(d => {
            const isOccupiedByAnother = occupiedDriverIds.includes(d.id) && d.id !== v.motorista_alocado_id;
            if (!isOccupiedByAnother) {
                const isCurrent = d.id === v.motorista_alocado_id;
                options += `<option value="${d.id}" ${isCurrent ? 'selected' : ''}>${d.nome_completo}</option>`;
            }
        });

        const cells = activeCols.map(col => {
            switch (col.key) {
                case 'placa':
                    return `<td><span class="plate" onclick="openVehicleDetail('${v.id}')" style="cursor: pointer; transition: transform 0.2s; display: inline-block;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">${v.placa}</span></td>`;
                case 'modelo': return `<td>${v.modelo}</td>`;
                case 'condutor':
                    if (isAdmin) {
                        const currentVal = v.motorista_alocado_id || (v.status_alocacao || '').toUpperCase();
                        const sClass = getStatusClass(currentVal);
                        return `<td><select class="direct-select ${sClass}" onchange="updateVehicleDriver('${v.id}', this.value); renderAll();">${options}</select></td>`;
                    } else {
                        const statusAloc = (v.status_alocacao || '').toUpperCase();
                        const isMainStatus = ['GARAGEM', 'MANUTENCAO', 'DISPONIVEL'].includes(statusAloc);
                        const driverName = v.motorista_alocado ? v.motorista_alocado.nome_completo : (isMainStatus ? statusAloc : 'DISPONÍVEL');
                        const isClickable = !!v.motorista_alocado_id && !isMainStatus;
                        const sClass = getStatusClass(v.motorista_alocado_id || statusAloc);
                        
                        return `<td>
                            <span class="${isClickable ? 'clickable-driver' : ''} ${sClass}" 
                                  onclick="${isClickable ? `openDriverDetail('${v.motorista_alocado_id}')` : ''}"
                                  style="${isClickable ? 'cursor: pointer; font-weight: 600;' : 'font-weight: 600;'}">
                                ${driverName.toUpperCase()}
                            </span>
                        </td>`;
                    }
                case 'whats':
                    if (v.motorista_alocado && v.motorista_alocado.contato_whatsapp) {
                        const raw = v.motorista_alocado.contato_whatsapp;
                        const number = raw.replace(/\D/g, '');
                        return `
            <td class="contact">
                <a href="https://wa.me/${number}" target="_blank">
                    ${raw}
                </a>
            </td>
        `;
                    } else {
                        return `<td class="contact">-</td>`;
                    }
            }
        }).join('');

        return `<tr data-id="${v.id}">${cells}</tr>`;
    }).join('');

    // Aplica as cores nos selects após renderizar tudo
    document.querySelectorAll('.direct-select').forEach(select => {
        applySelectColor(select);
    });
}

async function updateVehicleDriver(vehicleId, driverId) {
    if (!client) return;

    try {
        let updateData = {};

        if (driverId === "GARAGEM" || driverId === "MANUTENCAO" || driverId === "DISPONIVEL") {
            updateData = {
                motorista_alocado_id: null,
                status_alocacao: driverId
            };
        } else {
            updateData = {
                motorista_alocado_id: driverId || null,
                status_alocacao: null
            };
        }

        const { error } = await client
            .from('veiculos')
            .update(updateData)
            .eq('id', vehicleId);

        if (error) {
            console.error(error);
            alert('Erro ao atualizar');
        }

    } catch (err) {
        console.error(err);
    }
}

function updateDriverDropdown() {
    if (driverSelect) {
        driverSelect.innerHTML = '<option value="">Selecione um motorista...</option>' +
            drivers.map(d => `<option value="${d.id}">${d.nome_completo} (${d.cpf})</option>`).join('');
    }
}

function renderFullVehicles() {
    const list = document.getElementById('fullVehicleList');
    if (!list) return;

    renderThead('vehicles');

    const searchTerm = searchInput.value.toLowerCase();

    const filtered = vehicles.filter(v => {
        return (
            (v.placa || '').toLowerCase().includes(searchTerm) ||
            (v.modelo || '').toLowerCase().includes(searchTerm) ||
            (v.marca || '').toLowerCase().includes(searchTerm) ||
            (v.motoristas && v.motoristas.nome_completo.toLowerCase().includes(searchTerm)) ||
            (v.motorista_alocado && v.motorista_alocado.nome_completo.toLowerCase().includes(searchTerm)) ||
            (v.seguradora || '').toLowerCase().includes(searchTerm) ||
            (v.numero_apolice || '').toLowerCase().includes(searchTerm) ||
            (v.corretor_seguro || '').toLowerCase().includes(searchTerm)
        );
    });

    const activeCols = getActiveCols('vehicles');
    const sort = currentSort.vehicles;

    // Sorteia os dados filtrados
    filtered.sort((a, b) => {
        let valA, valB;
        if (sort.key === 'condutor_principal') {
            valA = (a.motoristas?.nome_completo || '').toLowerCase();
            valB = (b.motoristas?.nome_completo || '').toLowerCase();
        } else if (sort.key === 'motorista_alocado') {
            valA = (a.motorista_alocado?.nome_completo || '').toLowerCase();
            valB = (b.motorista_alocado?.nome_completo || '').toLowerCase();
        } else if (sort.key === 'marca_modelo') {
            valA = (a.marca || '') + (a.modelo || '');
            valB = (b.marca || '') + (b.modelo || '');
            valA = valA.toLowerCase(); valB = valB.toLowerCase();
        } else {
            valA = (a[sort.key] || '').toString().toLowerCase();
            valB = (b[sort.key] || '').toString().toLowerCase();
        }
        if (valA < valB) return sort.dir === 'asc' ? -1 : 1;
        if (valA > valB) return sort.dir === 'asc' ? 1 : -1;
        return 0;
    });

    const actionsHtml = (id) => `
        <div class="table-actions">
            <button class="btn-edit" onclick="editVehicle('${id}')" title="Editar">
                <i data-lucide="edit-2" style="width: 16px;"></i>
            </button>
            <button class="btn-edit btn-delete" onclick="deleteVehicle('${id}')" title="Excluir">
                <i data-lucide="x-circle" style="width: 16px;"></i>
            </button>
        </div>`;

    list.innerHTML = filtered.map(v => {
        const cells = activeCols.map(col => {
            switch (col.key) {
                case 'placa': return `<td><span class="plate">${v.placa}</span></td>`;
                case 'marca_modelo': return `<td>${v.marca || ''} ${v.modelo}</td>`;
                case 'proprietario': return `<td>${v.proprietario || '-'}</td>`;
                case 'venc_seguro': return `<td>${formatDate(v.vencimento_seguro)}</td>`;
                case 'seguradora': return `<td>${v.seguradora || '-'}</td>`;
                case 'numero_apolice': return `<td>${v.numero_apolice || '-'}</td>`;
                case 'valor_premio': return `<td>${v.valor_premio ? 'R$ ' + Number(v.valor_premio).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '-'}</td>`;
                case 'valor_franquia': return `<td>${v.valor_franquia ? 'R$ ' + Number(v.valor_franquia).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '-'}</td>`;
                case 'forma_pagamento': return `<td>${v.forma_pagamento || '-'}</td>`;
                case 'classificacao': return `<td>${v.classificacao || '-'}</td>`;
                case 'condutor_principal': return `<td><span style="font-size:0.85rem; font-weight:600;">${v.motoristas ? v.motoristas.nome_completo : '-'}</span></td>`;
                case 'motorista_alocado': return `<td><span style="font-size:0.85rem; font-weight:600; color: var(--primary);">${v.motorista_alocado ? v.motorista_alocado.nome_completo : 'DISPONÍVEL'}</span></td>`;
                case 'status': return `<td><span class="badge ${v.status === 'ATIVO' ? 'success' : 'danger'}">${v.status || 'ATIVO'}</span></td>`;
                case 'cor': return `<td>${v.cor || '-'}</td>`;
                case 'ano_fabricacao': return `<td>${v.ano_fabricacao || '-'}</td>`;
                case 'ano_modelo': return `<td>${v.ano_modelo || '-'}</td>`;
                case 'renavam': return `<td>${v.renavam || '-'}</td>`;
                case 'chassi': return `<td>${v.chassi || '-'}</td>`;
                case 'codigo_fipe': return `<td>${v.codigo_fipe || '-'}</td>`;
                case 'data_aquisicao_nf': return `<td>${formatDate(v.data_aquisicao_nf)}</td>`;
                case 'actions': return `<td>${actionsHtml(v.id)}</td>`;
                default: return `<td>-</td>`;
            }
        }).join('');
        return `<tr>${cells}</tr>`;
    }).join('');
    if (window.lucide) lucide.createIcons();
}

function renderFullDrivers() {
    const list = document.getElementById('fullDriverList');
    if (!list) return;

    renderThead('drivers');

    const searchTerm = searchInput.value.toLowerCase();
    const filtered = drivers.filter(d =>
        d.nome_completo.toLowerCase().includes(searchTerm) ||
        (d.cpf && d.cpf.includes(searchTerm)) ||
        d.registro_cnh.toLowerCase().includes(searchTerm)
    );

    const activeCols = getActiveCols('drivers');
    const sort = currentSort.drivers;

    // Sorteia os dados filtrados
    filtered.sort((a, b) => {
        let valA, valB;
        if (sort.key === 'idade') {
            valA = a.data_nascimento || '';
            valB = b.data_nascimento || '';
            // Ordem invertida para idade (data de nascimento)
            if (valA > valB) return sort.dir === 'asc' ? -1 : 1;
            if (valA < valB) return sort.dir === 'asc' ? 1 : -1;
        } else if (sort.key === 'vinculos_seguro') {
            valA = vehicles.filter(v => v.condutor_principal_id === a.id).length;
            valB = vehicles.filter(v => v.condutor_principal_id === b.id).length;
            if (valA < valB) return sort.dir === 'asc' ? -1 : 1;
            if (valA > valB) return sort.dir === 'asc' ? 1 : -1;
        } else {
            valA = (a[sort.key] || '').toString().toLowerCase();
            valB = (b[sort.key] || '').toString().toLowerCase();
        }
        if (valA < valB) return sort.dir === 'asc' ? -1 : 1;
        if (valA > valB) return sort.dir === 'asc' ? 1 : -1;
        return 0;
    });

    const actionsHtml = (id) => `
        <div class="table-actions">
            <button class="btn-edit" onclick="editDriver('${id}')" title="Editar">
                <i data-lucide="edit-2" style="width: 16px;"></i>
            </button>
            <button class="btn-edit btn-delete" onclick="deleteDriver('${id}')" title="Excluir">
                <i data-lucide="x-circle" style="width: 16px;"></i>
            </button>
        </div>`;

    list.innerHTML = filtered.map(d => {
        // Calcula vínculos de seguro manualmente para garantir que sempre funcione
        const vinculosCount = vehicles.filter(v => v.condutor_principal_id === d.id).length;

        const cells = activeCols.map(col => {
            switch (col.key) {
                case 'nome_completo': return `<td class="driver">${d.nome_completo}</td>`;
                case 'cpf': return `<td>${d.cpf || '-'}</td>`;
                case 'cnh_cat': return `<td>${d.registro_cnh || '-'} (${d.categoria_cnh || '-'})</td>`;
                case 'vencimento_cnh': return `<td>${formatDate(d.vencimento_cnh)}</td>`;
                case 'idade': return `<td>${calcAge(d.data_nascimento)}</td>`;
                case 'vinculos_seguro': return `<td style="font-weight:700;">${vinculosCount} veícs.</td>`;
                case 'contato_whatsapp': return `<td>${d.contato_whatsapp || '-'}</td>`;
                case 'data_nascimento': return `<td>${formatDate(d.data_nascimento)}</td>`;
                case 'status': return `<td><span class="badge ${d.status === 'ATIVO' ? 'success' : 'danger'}">${d.status}</span></td>`;
                case 'actions': return `<td>${actionsHtml(d.id)}</td>`;
                default: return `<td>-</td>`;
            }
        }).join('');
        return `<tr>${cells}</tr>`;
    }).join('');
    if (window.lucide) lucide.createIcons();
}

// Helper: calcula idade a partir da data de nascimento
function calcAge(birthDateStr) {
    if (!birthDateStr) return '-';
    const today = new Date();
    const birth = new Date(birthDateStr);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age + ' anos';
}

// --- Funções Supabase ---

async function fetchDrivers() {
    if (!client) return;
    try {
        console.log('Buscando motoristas...');
        // Tenta buscar da View que tem o contador de seguros caso exista
        let { data, error } = await client.from('view_motoristas_vinculos').select('*').order('nome_completo');
        
        if (error) {
            console.warn('View de vínculos não encontrada, tentando tabela simples...', error.message);
            const fallback = await client.from('motoristas').select('*').order('nome_completo');
            if (fallback.error) throw fallback.error;
            data = fallback.data;
        }
        
        drivers = data || [];
        updateDriverDropdown();
        renderAll();
    } catch (err) {
        console.error('Erro ao buscar motoristas:', err);
    }
}

async function fetchVehicles() {
    if (!client) return;
    try {
        console.log('Buscando veículos...');
        // Seleção robusta que busca tanto o seguro quanto a alocação
        let { data, error } = await client
            .from('veiculos')
            .select('*, motoristas:condutor_principal_id(nome_completo, contato_whatsapp), motorista_alocado:motorista_alocado_id(nome_completo, contato_whatsapp)')
            .order('placa', { ascending: true });

        if (error) {
            console.warn('Novas colunas não encontradas, usando fallback...', error.message);
            const fallback = await client
                .from('veiculos')
                .select('*, motoristas:condutor_principal_id(nome_completo, contato_whatsapp)')
                .order('placa', { ascending: true });
            
            if (fallback.error) throw fallback.error;
            data = fallback.data;
        }

        vehicles = data || [];
        renderAll();
    } catch (err) {
        console.error('Erro ao buscar veículos:', err);
    }
}

// --- Funções de Exportação e Importação ---

function exportFleetToExcel() {
    if (vehicles.length === 0) return alert('Não há dados para exportar.');

    // Exportar TODOS os campos cadastrados
    const exportData = vehicles.map(v => ({
        'Placa': v.placa,
        'Marca': v.marca,
        'Modelo': v.modelo,
        'Status': v.status,
        'Proprietário': v.proprietario,
        'RENAVAM': v.renavam,
        'Chassi': v.chassi,
        'Nº Motor': v.numero_motor,
        'Ano Fabricação': v.ano_fabricacao,
        'Ano Modelo': v.ano_modelo,
        'Cor': v.cor,
        'Seguradora': v.seguradora,
        'Venc. Seguro': formatDate(v.vencimento_seguro),
        'Proponente': v.proponente_seguro,
        'Corretor': v.corretor_seguro,
        'Nº Apólice': v.numero_apolice,
        'Valor Franquia': v.valor_franquia,
        'Valor Prêmio': v.valor_premio,
        'Parcelas': v.parcelas_pagamento,
        'Forma Pagamento': v.forma_pagamento,
        'Código FIPE': v.codigo_fipe,
        'Valor FIPE': v.valor_fipe_mes,
        'CPF/CNPJ Documento': v.cpf_cnpj,
        'Nome no Documento': v.nome_documento,
        'Fornecedor': v.fornecedor_aquisicao,
        'Data Aquisição': formatDate(v.data_aquisicao_nf),
        'Data Saída': formatDate(v.data_saida_nf),
        'Classificação': v.classificacao
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Frota_Completa");
    XLSX.writeFile(wb, `Frota_Veritas_Completa_${new Date().toLocaleDateString()}.xlsx`);
}

function exportFleetToPDF() {
    if (vehicles.length === 0) return alert('Não há dados para exportar.');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Relatório Geral da Frota - VERITAS", 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 28);

    const body = vehicles.map(v => [
        v.placa,
        v.marca || '',
        v.modelo,
        v.proprietario || '',
        v.vencimento_seguro || '',
        v.status || 'ATIVO'
    ]);

    doc.autoTable({
        startY: 35,
        head: [['Placa', 'Marca', 'Modelo', 'Proprietário', 'Venc. Seguro', 'Status']],
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`Frota_Veritas_${new Date().toISOString().split('T')[0]}.pdf`);
}

function exportDriversToExcel() {
    if (drivers.length === 0) return alert('Não há motoristas para exportar.');

    const exportData = drivers.map(d => ({
        'Nome Completo': d.nome_completo,
        'CPF': d.cpf || '',
        'Idade': calcAge(d.data_nascimento),
        'Data Nascimento': formatDate(d.data_nascimento),
        'WhatsApp': d.contato_whatsapp || '',
        'Registro CNH': d.registro_cnh || '',
        'Categoria CNH': d.categoria_cnh || '',
        'Vencimento CNH': formatDate(d.vencimento_cnh),
        'Status': d.status || 'ATIVO',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Equipe_Completa");
    XLSX.writeFile(wb, `Equipe_Veritas_${new Date().toLocaleDateString()}.xlsx`);
}

function exportDriversToPDF() {
    if (drivers.length === 0) return alert('Não há motoristas para exportar.');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Relatório de Equipe - VERITAS", 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 28);

    const body = drivers.map(d => [
        d.nome_completo,
        d.cpf || '',
        calcAge(d.data_nascimento),
        (d.registro_cnh || '') + ' (' + (d.categoria_cnh || '') + ')',
        formatDate(d.vencimento_cnh),
        d.status || 'ATIVO'
    ]);

    doc.autoTable({
        startY: 35,
        head: [['Nome', 'CPF', 'Idade', 'CNH / Cat.', 'Venc. CNH', 'Status']],
        body: body,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`Equipe_Veritas_${new Date().toISOString().split('T')[0]}.pdf`);
}

function importFleetFromExcel(input) {
    if (!isAdmin) return alert('Modo Edição deve estar ativo para importar dados.');

    const file = input.files[0];
    if (!file || !client) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) return alert('O arquivo está vazio.');

            // Mapear colunas do Excel para o Banco (exemplo básico)
            const vehiclesToInsert = jsonData.map(row => ({
                placa: (row['Placa'] || row['placa'] || '').toUpperCase(),
                modelo: row['Modelo'] || row['modelo'] || 'Não Informado',
                marca: row['Marca'] || row['marca'] || '',
                proprietario: row['Proprietário'] || row['proprietario'] || '',
                status: 'ATIVO',
                classificacao: 'CASA'
            })).filter(v => v.placa !== '');

            console.log('Importando:', vehiclesToInsert);

            const { error } = await client.from('veiculos').upsert(vehiclesToInsert, { onConflict: 'placa' });

            if (error) throw error;

            alert(`${vehiclesToInsert.length} veículos importados/atualizados com sucesso!`);
            fetchVehicles();
        } catch (err) {
            console.error('Erro na importação:', err);
            alert('Falha ao importar Excel. Verifique se as colunas estão corretas (Placa, Modelo, Marca).');
        } finally {
            input.value = ''; // Reset input
        }
    };
    reader.readAsArrayBuffer(file);
}

// --- Handlers de Cadastro ---

async function handleAddVehicle(e) {
    e.preventDefault();
    if (!client) {
        alert('Supabase não configurado. Adicione sua URL e Key no topo do app.js');
        return;
    }

    const getVal = (id) => {
        const el = document.getElementById(id);
        return el && el.value.trim() !== '' ? el.value.trim() : null;
    };

    const getNum = (id) => {
        const val = document.getElementById(id).value;
        return val !== '' ? parseFloat(val) : 0;
    };

    const getInt = (id) => {
        const val = document.getElementById(id).value;
        return val !== '' ? parseInt(val) : null;
    };

    // Pega a placa ou gera erro se nula
    const rawPlaca = getVal('addPlaca');
    if (!rawPlaca) {
        alert('A Placa é obrigatória para o cadastro.');
        return;
    }

    const vehicleData = {
        placa: rawPlaca.toUpperCase(),
        renavam: getVal('addRenavam'),
        proprietario: getVal('addProprietario'),
        classificacao: getVal('addClassificacao'),
        seguradora: getVal('addSeguradora'),
        vencimento_seguro: getVal('addVencimentoSeguro'),
        proponente_seguro: getVal('addProponenteSeguro'),
        condutor_principal_id: getVal('addCondutorPrincipalId'),
        corretor_seguro: getVal('addCorretorSeguro'),
        numero_apolice: getVal('addNumeroApolice'),
        endosso_proposta: getVal('addEndosso'),
        ci_seguro: getVal('addCiSeguro'),
        valor_franquia: getNum('addValorFranquia'),
        valor_premio: getNum('addValorPremio'),
        forma_pagamento: getVal('addFormaPagamento'),
        parcelas_pagamento: getInt('addParcelas'),
        nome_documento: getVal('addNomeDocumento'),
        cpf_cnpj: getVal('addCpfCnpj'),
        codigo_fipe: getVal('addCodigoFipe'),
        valor_fipe_mes: getNum('addValorFipeMes'),
        chassi: getVal('addChassi'),
        numero_motor: getVal('addNumeroMotor'),
        ano_fabricacao: getInt('addAnoFabricacao'),
        ano_modelo: getInt('addAnoModelo'),
        marca: getVal('addMarca'),
        modelo: getVal('addModelo') || 'Sem Modelo', // Deixar pelo menos um nome pra tabela
        cor: getVal('addCor'),
        data_aquisicao_nf: getVal('addDataAquisicaoNF'),
        data_saida_nf: getVal('addDataSaidaNF'),
        fornecedor_aquisicao: getVal('addFornecedorAquisicao'),
        status: getVal('addStatus') || 'ATIVO'
    };

    console.log('Tentando salvar veículo:', vehicleData);

    try {
        const id = document.getElementById('addVehicleId').value;
        let result;

        if (id) {
            // Update
            result = await client.from('veiculos').update(vehicleData).eq('id', id);
        } else {
            // Insert
            result = await client.from('veiculos').insert([vehicleData]);
        }

        if (result.error) throw result.error;

        closeAddModal();
        fetchVehicles();
        alert(id ? 'Veículo atualizado!' : 'Veículo cadastrado!');
    } catch (err) {
        console.error('Falha na operação:', err);
        alert('Erro ao cadastrar veículo: ' + (err.message || 'Verifique o console (F12) para detalhes.'));
    }
}

async function handleAddDriver(e) {
    e.preventDefault();
    if (!client) return;

    const getVal = (id) => {
        const el = document.getElementById(id);
        return el && el.value.trim() !== '' ? el.value.trim() : null;
    };

    const nome = getVal('driverNome');
    if (!nome) {
        alert('O Nome Completo é necessário.');
        return;
    }

    const driverData = {
        nome_completo: nome,
        contato_whatsapp: getVal('driverWhats'),
        cpf: getVal('driverCpf'),
        registro_cnh: getVal('driverCnh'),
        vencimento_cnh: getVal('driverCnhVenc'),
        categoria_cnh: getVal('driverCategoria'),
        data_nascimento: getVal('driverNascimento'),
        status: getVal('driverStatus') || 'ATIVO'
    };

    console.log('Tentando salvar motorista:', driverData);

    try {
        const id = document.getElementById('driverId').value;
        let result;

        if (id) {
            // Update
            result = await client.from('motoristas').update(driverData).eq('id', id);
        } else {
            // Insert
            result = await client.from('motoristas').insert([driverData]);
        }

        if (result.error) throw result.error;

        closeDriverModal();
        fetchDrivers();
        alert(id ? 'Motorista atualizado com sucesso!' : 'Motorista cadastrado com sucesso!');
    } catch (err) {
        console.error('Falha na operação:', err);
        alert('Erro ao salvar motorista: ' + (err.message || 'Erro de conexão ou CPF duplicado.'));
    }
}

// --- Funções de Exclusão ---
async function deleteVehicle(id) {
    if (!isAdmin) { alert('Ative o Modo Edição para excluir.'); return; }
    if (!confirm('Deseja realmente excluir este veículo? Esta ação não pode ser desfeita.')) return;

    try {
        const { error } = await client.from('veiculos').delete().eq('id', id);
        if (error) throw error;
        alert('Veículo excluído com sucesso!');
        fetchVehicles();
    } catch (err) {
        alert('Erro ao excluir: ' + err.message);
    }
}

async function deleteDriver(id) {
    if (!isAdmin) { alert('Ative o Modo Edição para excluir.'); return; }
    if (!confirm('Deseja realmente excluir este motorista?')) return;

    try {
        const { error } = await client.from('motoristas').delete().eq('id', id);
        if (error) throw error;
        alert('Motorista excluído com sucesso!');
        fetchDrivers();
    } catch (err) {
        alert('Erro ao excluir: Verifique se ele não está vinculado a algum veículo.');
    }
}

// --- Funções de Edição (Preenchimento) ---
function editVehicle(id) {
    const v = vehicles.find(item => item.id === id);
    if (!v) return;

    document.getElementById('vehicleModalTitle').innerText = 'Editar Veículo';
    document.getElementById('addVehicleId').value = v.id;
    document.getElementById('addPlaca').value = v.placa;
    document.getElementById('addRenavam').value = v.renavam || '';
    document.getElementById('addProprietario').value = v.proprietario || '';
    document.getElementById('addClassificacao').value = v.classificacao || 'CASA';
    document.getElementById('addSeguradora').value = v.seguradora || '';
    document.getElementById('addVencimentoSeguro').value = v.vencimento_seguro || '';
    document.getElementById('addProponenteSeguro').value = v.proponente_seguro || '';
    document.getElementById('addCondutorPrincipalId').value = v.condutor_principal_id || '';
    document.getElementById('addCorretorSeguro').value = v.corretor_seguro || '';
    document.getElementById('addNumeroApolice').value = v.numero_apolice || '';
    document.getElementById('addEndosso').value = v.endosso_proposta || '';
    document.getElementById('addCiSeguro').value = v.ci_seguro || '';
    document.getElementById('addValorFranquia').value = v.valor_franquia || 0;
    document.getElementById('addValorPremio').value = v.valor_premio || 0;
    document.getElementById('addFormaPagamento').value = v.forma_pagamento || 'BOLETO';
    document.getElementById('addParcelas').value = v.parcelas_pagamento || 0;
    document.getElementById('addNomeDocumento').value = v.nome_documento || '';
    document.getElementById('addCpfCnpj').value = v.cpf_cnpj || '';
    document.getElementById('addCodigoFipe').value = v.codigo_fipe || '';
    document.getElementById('addValorFipeMes').value = v.valor_fipe_mes || 0;
    document.getElementById('addChassi').value = v.chassi || '';
    document.getElementById('addNumeroMotor').value = v.numero_motor || '';
    document.getElementById('addAnoFabricacao').value = v.ano_fabricacao || '';
    document.getElementById('addAnoModelo').value = v.ano_modelo || '';
    document.getElementById('addMarca').value = v.marca || 'VW';
    document.getElementById('addModelo').value = v.modelo || '';
    document.getElementById('addCor').value = v.cor || 'BRANCO';
    document.getElementById('addDataAquisicaoNF').value = v.data_aquisicao_nf || '';
    document.getElementById('addDataSaidaNF').value = v.data_saida_nf || '';
    document.getElementById('addFornecedorAquisicao').value = v.fornecedor_aquisicao || '';
    document.getElementById('addStatus').value = v.status || 'ATIVO';

    addModal.style.display = 'flex';
}

function editDriver(id) {
    const d = drivers.find(item => item.id === id);
    if (!d) return;

    document.getElementById('driverModalTitle').innerText = 'Editar Motorista';
    document.getElementById('driverId').value = d.id;
    document.getElementById('driverNome').value = d.nome_completo;
    document.getElementById('driverWhats').value = d.contato_whatsapp || '';
    document.getElementById('driverCpf').value = d.cpf || '';
    document.getElementById('driverCnh').value = d.registro_cnh || '';
    document.getElementById('driverCnhVenc').value = d.vencimento_cnh || '';
    document.getElementById('driverCategoria').value = d.categoria_cnh || 'B';
    document.getElementById('driverNascimento').value = d.data_nascimento || '';
    document.getElementById('driverStatus').value = d.status || 'ATIVO';

    calculateAge();
    driverModal.style.display = 'flex';
}

// --- Modal Helpers ---

function openAddModal() {
    document.getElementById('vehicleModalTitle').innerText = 'Cadastrar Novo Veículo';
    document.getElementById('addVehicleId').value = '';
    addForm.reset();
    addModal.style.display = 'flex';
}

function closeAddModal() { addModal.style.display = 'none'; addForm.reset(); }

function openDriverModal() {
    document.getElementById('driverModalTitle').innerText = 'Cadastrar Novo Motorista';
    document.getElementById('driverId').value = '';
    driverForm.reset();
    document.getElementById('driverIdade').value = '';
    driverModal.style.display = 'flex';
}
function closeDriverModal() { driverModal.style.display = 'none'; driverForm.reset(); }
function closeModal() { editModal.style.display = 'none'; } // Generic close for edit

// --- Real-time ---
function subscribeToChanges() {
    if (!client) return;
    client.channel('any').on('postgres_changes', { event: '*', schema: 'public' }, () => {
        fetchVehicles();
        fetchDrivers();
    }).subscribe();
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    // Load saved column preferences first
    loadColConfig();

    if (adminToggle) adminToggle.addEventListener('click', toggleAdminMode);
    if (addForm) addForm.addEventListener('submit', handleAddVehicle);
    if (driverForm) driverForm.addEventListener('submit', handleAddDriver);
    if (editForm) editForm.addEventListener('submit', handleEditAllocation);
    if (searchInput) searchInput.addEventListener('input', renderVehicles);

    // Auto-calculate insurance daily rate
    const premioInput = document.getElementById('addValorPremio');
    if (premioInput) {
        premioInput.addEventListener('input', () => {
            const val = parseFloat(premioInput.value) || 0;
            const daily = (val / 365).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            document.getElementById('addValorDiaSeguro').value = daily;
        });
    }

    if (window.lucide) lucide.createIcons();
    fetchDrivers();
    fetchVehicles();
    subscribeToChanges();

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const btn = document.getElementById('clearSearch');
            if (btn) btn.style.display = searchInput.value ? 'flex' : 'none';
            renderAll();
        });
    }
});

function getStatusClass(val) {
    if (!val) return '';
    const s = val.toString().toUpperCase();
    if (s === 'GARAGEM') return 'status-garagem';
    if (s === 'MANUTENCAO') return 'status-manutencao';
    if (s === 'DISPONIVEL') return 'status-disponivel';
    // Se for um UUID (comprimento típico > 20)
    if (s.length > 20) return 'status-vinc';
    return '';
}

// applySelectColor mantido para compatibilidade, mas agora usa classes CSS
function applySelectColor(select) {
    const val = select.value;
    select.className = 'direct-select ' + getStatusClass(val);
}

function clearSearch() {
    if (searchInput) {
        searchInput.value = '';
        renderAll();
        const btn = document.getElementById('clearSearch');
        if (btn) btn.style.display = 'none';
    }
}
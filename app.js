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

// ============================================================
//  COLUMN MANAGER
// ============================================================

const COL_DEFS = {
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
        { key: 'corretor_seguro', label: 'Corretor', visible: false },
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
    thead.innerHTML = '<tr>' + active.map(c =>
        `<th${c.key === 'actions' ? ' class="col-actions"' : ''}>${c.label}</th>`
    ).join('') + '</tr>';
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
}

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

    const filtered = activeVehicles.filter(v =>
        v.placa.toLowerCase().includes(searchTerm) ||
        (v.motoristas && v.motoristas.nome_completo.toLowerCase().includes(searchTerm)) ||
        v.modelo.toLowerCase().includes(searchTerm)
    );

    const activeCols = getActiveCols('dashboard');

    if (activeVehicles.length === 0) {
        list.innerHTML = `<tr><td colspan="${activeCols.length}" style="text-align:center; padding: 2rem;">Vazio ou sem veículos ativos...</td></tr>`;
        return;
    }

    // Descobrir quais motoristas já estão ocupados (ativos apenas)
    const occupiedDriverIds = vehicles
        .filter(veh => veh.condutor_principal_id && veh.status === 'ATIVO')
        .map(veh => veh.condutor_principal_id);

    const activeDrivers = drivers.filter(d => d.status === 'ATIVO');

    list.innerHTML = filtered.map(v => {
        const specialStatus = JSON.parse(localStorage.getItem('vehicleStatus')) || {};
        const currentSpecial = specialStatus[v.id];
        let options = '<option value="">-- Vincular Motorista --</option>';
        options += `<option value="MANUTENCAO" ${currentSpecial === 'MANUTENCAO' ? 'selected' : ''}>Manutenção</option>`;
        options += `<option value="GARAGEM" ${currentSpecial === 'GARAGEM' ? 'selected' : ''}>Garagem</option>`;
        options += `<option value="DISPONIVEL" ${currentSpecial === 'DISPONIVEL' ? 'selected' : ''}>Disponível</option>`;
        activeDrivers.forEach(d => {
            const isOccupiedByAnother = occupiedDriverIds.includes(d.id) && d.id !== v.condutor_principal_id;
            if (!isOccupiedByAnother) {
                const isCurrent = d.id === v.condutor_principal_id;
                options += `<option value="${d.id}" ${isCurrent ? 'selected' : ''}>${d.nome_completo}</option>`;
            }
        });

        const cells = activeCols.map(col => {
            switch (col.key) {
                case 'placa': return `<td><span class="plate">${v.placa}</span></td>`;
                case 'modelo': return `<td>${v.modelo}</td>`;
                case 'condutor': const selectClass = getSelectClass(v.condutor_principal_id, currentSpecial); return `<td><select class="direct-select ${selectClass}" ${isAdmin ? '' : 'disabled'} onchange="updateVehicleDriver('${v.id}', this.value)">${options}</select></td>`;
                case 'whats':
                    if (v.motoristas && v.motoristas.contato_whatsapp) {
                        const raw = v.motoristas.contato_whatsapp;

                        // limpa o número (remove tudo que não for número)
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
}

async function updateVehicleDriver(vehicleId, driverId) {
    if (!client) return;

    try {

        // 👉 STATUS ESPECIAL → salva localmente
        if (['MANUTENCAO', 'GARAGEM', 'DISPONIVEL'].includes(driverId)) {

            const specialStatus = JSON.parse(localStorage.getItem('vehicleStatus')) || {};

            specialStatus[vehicleId] = driverId;

            localStorage.setItem('vehicleStatus', JSON.stringify(specialStatus));

            renderAll();
            return;
        }

        // 👉 Se selecionar motorista normal → limpa status especial
        const specialStatus = JSON.parse(localStorage.getItem('vehicleStatus')) || {};
        delete specialStatus[vehicleId];
        localStorage.setItem('vehicleStatus', JSON.stringify(specialStatus));

        const value = driverId === "" ? null : driverId;

        const { error } = await client
            .from('veiculos')
            .update({ condutor_principal_id: value })
            .eq('id', vehicleId);

        if (error) {
            console.error('Erro na atualização rápida:', error.message);
            alert('Falha ao trocar condutor: ' + error.message);
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
            (v.seguradora || '').toLowerCase().includes(searchTerm) ||
            (v.numero_apolice || '').toLowerCase().includes(searchTerm) ||
            (v.corretor_seguro || '').toLowerCase().includes(searchTerm)
        );
    });

    const activeCols = getActiveCols('vehicles');

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
        const cells = activeCols.map(col => {
            switch (col.key) {
                case 'nome_completo': return `<td class="driver">${d.nome_completo}</td>`;
                case 'cpf': return `<td>${d.cpf || '-'}</td>`;
                case 'cnh_cat': return `<td>${d.registro_cnh || '-'} (${d.categoria_cnh || '-'})</td>`;
                case 'vencimento_cnh': return `<td>${formatDate(d.vencimento_cnh)}</td>`;
                case 'idade': return `<td>${calcAge(d.data_nascimento)}</td>`;
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
        const { data, error } = await client.from('motoristas').select('*').order('nome_completo');
        if (error) {
            console.error('Erro ao buscar motoristas da tabela:', error.message);
            throw error;
        }
        drivers = data;
        console.log('Motoristas carregados:', drivers.length);
        updateDriverDropdown();
        renderAll();
    } catch (err) {
        console.error('Exceção ao buscar motoristas:', err);
    }
}

async function fetchVehicles() {
    if (!client) return;
    try {
        console.log('Buscando veículos...');
        const { data, error } = await client
            .from('veiculos')
            .select('*, motoristas(nome_completo, contato_whatsapp)')
            .order('placa', { ascending: true });

        if (error) {
            console.error('Erro ao buscar veículos da tabela:', error.message);
            throw error;
        }
        vehicles = data;
        console.log('Veículos carregados:', vehicles.length);
        renderAll();
    } catch (err) {
        console.error('Exceção ao buscar veículos:', err);
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
            renderAll();
        });
    }
});
function clearSearch() {
    searchInput.value = '';
    renderAll();
    document.getElementById('clearSearch').style.display = 'none';
}

// Mostrar/ocultar botão automaticamente
searchInput.addEventListener('input', () => {
    const btn = document.getElementById('clearSearch');
    btn.style.display = searchInput.value ? 'block' : 'none';
});

function getSelectClass(value, specialStatus) {

    const val = specialStatus || value;

    switch (val) {
        case 'GARAGEM':
            return 'select-garagem';
        case 'MANUTENCAO':
            return 'select-manutencao';
        case 'DISPONIVEL':
            return 'select-disponivel';
        default:
            return 'select-default';
    }
}
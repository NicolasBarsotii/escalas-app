let currentData = [];
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let selectedCalendarDate = "";
let activeWeekId = null;
let isViewMode = false; // Controla se está em modo visualização (link compartilhado)

// ================= LEITURA DE PARÂMETROS DA URL =================
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        week: params.get('week'),      // Ex: ?week=col-123
        view: params.get('view')       // Ex: ?view=member
    };
}

// Aplica o modo de visualização
function applyViewMode() {
    const params = getUrlParams();
    if (params.view === 'member') {
        isViewMode = true;
        document.body.classList.add('view-mode');
        const banner = document.getElementById('view-mode-banner');
        if (banner) banner.style.display = 'flex';
    }
}

function exitViewMode() {
    // Remove o parâmetro da URL e recarrega
    const url = new URL(window.location.href);
    url.searchParams.delete('view');
    url.searchParams.delete('week');
    window.location.href = url.toString();
}

// ================= NAVEGAÇÃO MOBILE =================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('open');
}

function toggleHeaderMenu() {
    const opcoes = "Escolha uma opção:\n\n1 - Compartilhar link do quadro\n2 - Ver estatísticas";
    const escolha = prompt(opcoes);
    if (escolha === "1") {
        navigator.clipboard.writeText(window.location.href);
        alert("Link copiado!");
    } else if (escolha === "2") {
        alert("Em breve: estatísticas de confirmação.");
    }
}

function isMobile() { return window.innerWidth < 900; }

// ================= RENDERIZAÇÃO DO QUADRO =================
async function loadBoard() {
    currentData = await api.getColumns();
    
    // Se veio com parâmetro de semana na URL, seleciona ela
    const params = getUrlParams();
    if (params.week && currentData.find(c => c.id === params.week)) {
        activeWeekId = params.week;
    } else if (!activeWeekId || !currentData.find(c => c.id === activeWeekId)) {
        if (currentData.length > 0) activeWeekId = currentData[0].id;
    }
    
    renderBoard();
    renderCalendar();

    // Se estiver em modo visualização, rola direto para a semana compartilhada
    if (params.week) {
        setTimeout(() => {
            const targetCol = document.querySelector(`.column[data-col-id="${params.week}"]`);
            if (targetCol) {
                targetCol.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
            }
        }, 300);
    }
}

function renderBoard() {
    const board = document.getElementById('board');
    board.innerHTML = '';

    currentData.forEach(column => {
        const colDiv = document.createElement('div');
        colDiv.className = 'column';
        colDiv.setAttribute('data-col-id', column.id);
        colDiv.innerHTML = `
            <div class="column-header">
                <span class="col-title">${column.title}</span>
                <div class="col-actions">
                    <button class="btn-add-card" onclick="openNewEventModal('${column.id}')">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Cartão
                    </button>
                    <button class="btn-delete-icon" onclick="deleteColumn('${column.id}')" title="Apagar Semana">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="column-cards" id="cards-${column.id}"></div>
        `;

        const cardsContainer = colDiv.querySelector('.column-cards');
        column.events.forEach(event => {
            const card = createCardElement(event, column.id);
            cardsContainer.appendChild(card);
        });

        board.appendChild(colDiv);
    });
}

function createCardElement(event, columnId) {
    const card = document.createElement('div');
    const totalRoles = event.roles.length;
    const confirmedRoles = event.roles.filter(r => r.status === 'confirmed').length;
    
    card.className = `card ${confirmedRoles === totalRoles && totalRoles > 0 ? 'status-confirmed' : 'status-pending'}`;
    
    let rolesHTML = '';
    event.roles.forEach(role => {
        const isPending = role.status !== 'confirmed';
        const displayClass = isPending ? 'pending' : '';
        
        let actionHTML = '';
        if (role.person) {
            const isChecked = role.status === 'confirmed' ? 'checked' : '';
            actionHTML = `
                <label class="custom-checkbox" title="Confirmar Presença">
                    <input type="checkbox" ${isChecked} onchange="toggleStatus('${columnId}', '${event.id}', '${role.role}')">
                    <span class="checkmark"></span>
                </label>
            `;
        }

        rolesHTML += `
            <li class="schedule-item">
                <span class="role-label">${role.role}</span>
                <div class="person-wrapper">
                    <span class="person-name ${displayClass}">${role.person || '[Vazio]'}</span>
                    ${actionHTML}
                </div>
            </li>
        `;
    });

    let infoBadge = '';
    if (event.notes || event.description) {
        infoBadge = `<span title="Possui anotações" style="cursor:help; font-size:0.9rem;">📝</span>`;
    }

    card.innerHTML = `
        <div class="card-header">
            <span class="card-title">${event.name}</span>
            <div class="card-header-right">
                ${infoBadge}
                <span class="card-date">${event.date}</span>
                <button class="btn-delete-icon" onclick="deleteEvent('${columnId}', '${event.id}')" title="Apagar Cartão">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    </svg>
                </button>
            </div>
        </div>
        <ul class="schedule-list">${rolesHTML}</ul>
        <button class="btn-edit-card" onclick="openEditModal('${columnId}', '${event.id}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Editar Escala
        </button>
    `;

    return card;
}

// ================= EXCLUSÃO =================
async function deleteColumn(columnId) {
    if (isViewMode) return;
    if (confirm("Tem certeza que deseja apagar esta semana inteira? Todos os cartões dentro dela serão perdidos permanentemente.")) {
        await api.deleteColumn(columnId);
        if (activeWeekId === columnId) activeWeekId = null;
        loadBoard();
    }
}

async function deleteEvent(columnId, eventId) {
    if (isViewMode) return;
    if (confirm("Tem certeza que deseja apagar este cartão de escala?")) {
        await api.deleteEvent(columnId, eventId);
        loadBoard();
    }
}

// ================= CALENDÁRIO =================
function renderCalendar() {
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    document.getElementById('month-year-display').innerText = `${monthNames[currentMonth]} ${currentYear}`;

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    const calendarBody = document.getElementById('calendar-body');
    calendarBody.innerHTML = '';

    for (let i = 0; i < firstDay; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'cal-day empty';
        calendarBody.appendChild(emptyDiv);
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'cal-day';
        dayDiv.innerText = i;
        
        const formattedDate = `${String(i).padStart(2, '0')}/${String(currentMonth + 1).padStart(2, '0')}`;
        const hasEvents = currentData.some(col => col.events.some(evt => evt.date === formattedDate));
        if (hasEvents) dayDiv.classList.add('has-event');

        if (i === currentDate.getDate() && currentMonth === currentDate.getMonth() && currentYear === currentDate.getFullYear()) {
            dayDiv.classList.add('today');
        }

        dayDiv.onclick = () => openDayDetailsModal(formattedDate);
        calendarBody.appendChild(dayDiv);
    }
}

function prevMonth() { currentMonth--; if (currentMonth < 0) { currentMonth = 11; currentYear--; } renderCalendar(); }
function nextMonth() { currentMonth++; if (currentMonth > 11) { currentMonth = 0; currentYear++; } renderCalendar(); }

// ================= MODAL DETALHES DO DIA =================
function openDayDetailsModal(date) {
    selectedCalendarDate = date;
    document.getElementById('day-details-title').innerText = `Cultos do Dia: ${date}`;
    
    const listContainer = document.getElementById('day-details-list');
    listContainer.innerHTML = '';

    let eventsOnDay = [];
    currentData.forEach(column => {
        column.events.forEach(event => {
            if (event.date === date) eventsOnDay.push({ columnId: column.id, event: event });
        });
    });

    if (eventsOnDay.length === 0) {
        listContainer.innerHTML = `<p style="color: #8c9bab; text-align: center; padding: 20px 0;">Nenhum culto cadastrado para este dia.</p>`;
        document.getElementById('btn-add-from-calendar').style.display = isViewMode ? 'none' : 'block';
    } else {
        eventsOnDay.forEach(item => {
            const div = document.createElement('div');
            div.className = 'day-event-item';
            div.onclick = () => { closeDayDetailsModal(); openEditModal(item.columnId, item.event.id); };
            
            const confirmedCount = item.event.roles.filter(r => r.status === 'confirmed').length;
            const totalCount = item.event.roles.length;

            div.innerHTML = `<h4>${item.event.name}</h4><p>Equipe: ${confirmedCount}/${totalCount} confirmados</p>`;
            listContainer.appendChild(div);
        });
        document.getElementById('btn-add-from-calendar').style.display = isViewMode ? 'none' : 'block';
    }

    document.getElementById('day-details-modal').classList.add('active');
    closeSidebar();
}

function closeDayDetailsModal() { document.getElementById('day-details-modal').classList.remove('active'); }
function addEventFromCalendar() { closeDayDetailsModal(); openNewEventModal(null, selectedCalendarDate); }

// ================= CRIAR SEMANA =================
function openColumnModal() {
    if (isViewMode) return;
    document.getElementById('new-col-title').value = '';
    document.getElementById('column-modal-overlay').classList.add('active');
    closeSidebar();
}
function closeColumnModal() { document.getElementById('column-modal-overlay').classList.remove('active'); }

document.getElementById('column-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('new-col-title').value;
    if (title && title.trim() !== "") {
        const newCol = await api.createColumn(title);
        activeWeekId = newCol.id;
        closeColumnModal();
        await loadBoard();
        setTimeout(() => {
            const newColElement = document.querySelector(`.column[data-col-id="${newCol.id}"]`);
            if (newColElement) newColElement.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
        }, 100);
    }
});

// ================= MODAL DE EVENTO =================
function openNewEventModal(columnId = null, preFilledDate = "") {
    if (isViewMode) return;
    document.getElementById('modal-title').innerText = "Novo Culto";
    document.getElementById('edit-col-id').value = columnId || "";
    document.getElementById('edit-evt-id').value = "";
    document.getElementById('edit-evt-name').value = "";
    document.getElementById('edit-evt-date').value = preFilledDate;
    document.getElementById('edit-evt-notes').value = "";
    document.getElementById('edit-evt-desc').value = "";
    document.getElementById('roles-container').innerHTML = "";
    
    const colSelectContainer = document.getElementById('column-select-container');
    const colSelect = document.getElementById('edit-col-id-select');

    if (!columnId) {
        colSelectContainer.style.display = 'block';
        colSelect.innerHTML = '<option value="">Selecione a Semana...</option>';
        currentData.forEach(col => { colSelect.innerHTML += `<option value="${col.id}">${col.title}</option>`; });
    } else {
        colSelectContainer.style.display = 'none';
    }
    
    addRoleField(); 
    document.getElementById('modal-overlay').classList.add('active');
    closeSidebar();
}

function openEditModal(columnId, eventId) {
    // No modo visualização, o membro não pode abrir o modal de edição
    if (isViewMode) return;

    const column = currentData.find(c => c.id === columnId);
    const event = column.events.find(e => e.id === eventId);

    document.getElementById('modal-title').innerText = "Editar Escala";
    document.getElementById('column-select-container').style.display = 'none';
    document.getElementById('edit-col-id').value = columnId;
    document.getElementById('edit-evt-id').value = eventId;
    document.getElementById('edit-evt-name').value = event.name;
    document.getElementById('edit-evt-date').value = event.date;
    document.getElementById('edit-evt-notes').value = event.notes || "";
    document.getElementById('edit-evt-desc').value = event.description || "";
    
    const rolesContainer = document.getElementById('roles-container');
    rolesContainer.innerHTML = '';
    event.roles.forEach(role => addRoleField(role.role, role.person));

    document.getElementById('modal-overlay').classList.add('active');
    closeSidebar();
}

function closeModal() { document.getElementById('modal-overlay').classList.remove('active'); }

function addRoleField(roleName = '', personName = '') {
    const container = document.getElementById('roles-container');
    const div = document.createElement('div');
    div.className = 'role-edit-row';
    div.innerHTML = `
        <input type="text" placeholder="Função (ex: Notebook)" value="${roleName}" class="role-input">
        <input type="text" placeholder="Nome do Voluntário" value="${personName}" class="person-input">
    `;
    container.appendChild(div);
}

document.getElementById('edit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isViewMode) return;

    let columnId = document.getElementById('edit-col-id').value;
    const eventId = document.getElementById('edit-evt-id').value;
    const eventName = document.getElementById('edit-evt-name').value;
    const eventDate = document.getElementById('edit-evt-date').value;

    if (!eventName || eventName.trim() === "") { alert("Por favor, preencha o Nome do Culto."); return; }
    if (!eventDate || eventDate.trim() === "") { alert("Por favor, preencha a Data do Culto."); return; }
    if (!columnId) columnId = document.getElementById('edit-col-id-select').value;

    if (!columnId && !eventId) {
        if (currentData.length === 0) {
            const autoTitle = `Semana do dia ${eventDate}`;
            try {
                const newCol = await api.createColumn(autoTitle);
                columnId = newCol.id;
                activeWeekId = newCol.id;
            } catch (error) { alert("Erro ao criar semana."); console.error(error); return; }
        } else {
            alert("Por favor, selecione a Semana."); return;
        }
    }
    
    const roleInputs = document.querySelectorAll('.role-input');
    const personInputs = document.querySelectorAll('.person-input');
    const roles = [];
    for (let i = 0; i < roleInputs.length; i++) {
        if (roleInputs[i].value.trim() !== '') {
            roles.push({
                role: roleInputs[i].value,
                person: personInputs[i].value,
                status: personInputs[i].value ? 'confirmed' : 'pending' 
            });
        }
    }

    const eventData = {
        name: eventName,
        date: eventDate,
        description: document.getElementById('edit-evt-desc').value,
        notes: document.getElementById('edit-evt-notes').value,
        roles: roles
    };

    try {
        if (eventId) await api.updateEvent(columnId, eventId, eventData);
        else { await api.createEvent(columnId, eventData); activeWeekId = columnId; }
        closeModal();
        loadBoard(); 
    } catch (error) { console.error("ERRO AO SALVAR:", error); alert("Ocorreu um erro ao salvar."); }
});

// ================= CHECKBOX DE CONFIRMAÇÃO =================
// IMPORTANTE: Mesmo no modo visualização, o membro PODE confirmar presença.
async function toggleStatus(columnId, eventId, roleName) {
    const column = currentData.find(c => c.id === columnId);
    const event = column.events.find(e => e.id === eventId);
    const role = event.roles.find(r => r.role === roleName);

    role.status = role.status === 'confirmed' ? 'pending' : 'confirmed';
    
    await api.updateEvent(columnId, eventId, { roles: event.roles });
    loadBoard();
}

// =====================================================
// ============ COMPARTILHAR / EXPORTAR =================
// =====================================================
let currentExportTab = 'link';

function openExportModal() {
    if (currentData.length === 0) { alert("Não há nenhuma semana cadastrada."); return; }

    const select = document.getElementById('export-week-select');
    select.innerHTML = '';
    currentData.forEach(col => {
        const option = document.createElement('option');
        option.value = col.id;
        option.innerText = col.title;
        if (col.id === activeWeekId) option.selected = true;
        select.appendChild(option);
    });

    // Garante que a aba "Link" está ativa ao abrir
    switchExportTab('link');
    updateExportPreview();

    document.getElementById('export-modal-overlay').classList.add('active');
    closeSidebar();
}

function closeExportModal() { document.getElementById('export-modal-overlay').classList.remove('active'); }

function switchExportTab(tab) {
    currentExportTab = tab;
    document.getElementById('tab-link').classList.toggle('active', tab === 'link');
    document.getElementById('tab-text').classList.toggle('active', tab === 'text');
    document.getElementById('export-content-link').style.display = tab === 'link' ? 'block' : 'none';
    document.getElementById('export-content-text').style.display = tab === 'text' ? 'block' : 'none';
}

function generateExportText(columnId) {
    const column = currentData.find(c => c.id === columnId);
    if (!column) return '';

    let text = 'Segue a escala da semana:\n\n';
    const sortedEvents = [...column.events].sort((a, b) => {
        const [dayA, monthA] = a.date.split('/').map(Number);
        const [dayB, monthB] = b.date.split('/').map(Number);
        return (monthA * 100 + dayA) - (monthB * 100 + dayB);
    });

    sortedEvents.forEach((event, index) => {
        text += `${event.name} (${event.date})\n`;
        event.roles.forEach(role => { text += `${role.role}: ${role.person || ''}\n`; });
        if (index < sortedEvents.length - 1) text += '\n';
    });
    return text;
}

// Gera o link compartilhável com parâmetros
function generateShareLink(columnId) {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?week=${columnId}&view=member`;
}

function updateExportPreview() {
    const columnId = document.getElementById('export-week-select').value;
    
    // Atualiza o texto
    document.getElementById('export-text').value = generateExportText(columnId);
    // Atualiza o link
    document.getElementById('export-link').value = generateShareLink(columnId);
}

async function copyExportText() {
    const textarea = document.getElementById('export-text');
    try {
        await navigator.clipboard.writeText(textarea.value);
        const btn = event.target;
        const original = btn.innerText;
        btn.innerText = '✅ Copiado!';
        btn.style.background = '#61bd4f'; btn.style.color = 'white';
        setTimeout(() => { btn.innerText = original; btn.style.background = ''; btn.style.color = ''; }, 2000);
    } catch (err) { textarea.select(); document.execCommand('copy'); alert("Texto copiado!"); }
}

async function copyExportLink() {
    const linkInput = document.getElementById('export-link');
    try {
        await navigator.clipboard.writeText(linkInput.value);
        const btn = event.target.closest('.btn-icon-copy');
        const original = btn.innerHTML;
        btn.innerHTML = '✅';
        setTimeout(() => { btn.innerHTML = original; }, 2000);
        alert("Link copiado! Cole no grupo do WhatsApp.");
    } catch (err) { linkInput.select(); document.execCommand('copy'); alert("Link copiado!"); }
}

function shareLinkOnWhatsApp() {
    const link = document.getElementById('export-link').value;
    const column = currentData.find(c => c.id === document.getElementById('export-week-select').value);
    const message = `📅 *Escala da Mídia*\n${column.title}\n\nConfira sua escala e confirme sua presença:\n${link}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

function shareTextOnWhatsApp() {
    const text = document.getElementById('export-text').value;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
}

// ================= INICIALIZAÇÃO =================
document.addEventListener('DOMContentLoaded', () => {
    applyViewMode(); // Aplica modo visualização ANTES de carregar
    loadBoard();
});
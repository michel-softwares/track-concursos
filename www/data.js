/**
 * Track Concursos — data.js
 * ========================
 * Gerenciador central de dados via LocalStorage.
 * Todas as telas leem e escrevem dados por aqui.
 *
 * Estrutura do LocalStorage:
 *   ct_concursos       → Array de concursos
 *   ct_materias        → Array de matérias (vinculadas a concurso)
 *   ct_topicos         → Array de tópicos
 *   ct_subtopicos      → Array de subtópicos
 *   ct_sessoes         → Array de sessões de estudo
 *   ct_questoes        → Array de lançamentos de questões
 *   ct_simulados       → Array de simulados
 *   ct_revisoes        → Array de revisões agendadas
 */

const CT = {
_get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  },

  _set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  _emitDataUpdated(tipo, detail = {}) {
    try {
      if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
      window.dispatchEvent(new CustomEvent('ct-data-updated', {
        detail: {
          tipo,
          ts: Date.now(),
          ...detail
        }
      }));
    } catch {}
  },

  _id() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  _dateString(d) {
    if (!d) d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  _today() {
    return this._dateString();
  },

  _formatMateriaNome(nome) {
    return String(nome || '').trim().toLocaleUpperCase('pt-BR');
  },

  setBackupNome(nome) {
    if (nome) localStorage.setItem('ct_backup_nome', nome);
    else localStorage.removeItem('ct_backup_nome');
  },

  getBackupNome() {
    return localStorage.getItem('ct_backup_nome') || '';
  },

  setProfileGenero(genero) {
    if (genero) localStorage.setItem('ct_profile_genero', genero);
    else localStorage.removeItem('ct_profile_genero');
  },

  getProfileGenero() {
    return localStorage.getItem('ct_profile_genero') || 'masculino';
  },

  _backupMainKeys() {
    return [
      'ct_concursos', 'ct_materias', 'ct_topicos', 'ct_subtopicos',
      'ct_sessoes', 'ct_questoes', 'ct_simulados', 'ct_revisoes',
      'ct_backup_nome', 'ct_profile_genero'
    ];
  },

  _collectAuxStorage() {
    const aux = {};
    const mainKeys = this._backupMainKeys();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ct_') && !mainKeys.includes(key)) {
        aux[key] = localStorage.getItem(key);
      }
    }
    return aux;
  },

  _clearTrackStorage() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ct_')) keys.push(key);
    }
    keys.forEach(key => localStorage.removeItem(key));
  },

  async _buildBackupPayload() {
    return {
      versao: '1.0',
      exportadoEm: new Date().toISOString(),
      concursos: this._get('ct_concursos'),
      materias: this._get('ct_materias'),
      topicos: this._get('ct_topicos'),
      subtopicos: this._get('ct_subtopicos'),
      sessoes: this._get('ct_sessoes'),
      questoes: this._get('ct_questoes'),
      simulados: this._get('ct_simulados'),
      revisoes: this._get('ct_revisoes'),
      crono: this._collectAuxStorage(),
      logos: await this._collectBackupLogos(),
    };
  },

  // Exibe uma notificação (toast) no topo da tela
  toast(msg, icon = '💡') {
    let toast = document.getElementById('ct-main-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'ct-main-toast';
      toast.style.cssText = 'position:fixed;top:24px;right:24px;background:var(--bg3, #1a1e2a);border:1px solid var(--accent, #4f8ef7);border-left:4px solid var(--accent, #4f8ef7);color:var(--text, #e8eaf2);padding:12px 20px;border-radius:8px;font-family:var(--sans, "Inter", sans-serif);font-size:13px;font-weight:600;box-shadow:0 8px 30px rgba(0,0,0,0.5);z-index:20000;display:flex;align-items:center;gap:10px;transform:translateX(150%);transition:transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);pointer-events:none;';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span style="font-size:18px">${icon}</span> ${msg}`;

    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(0)';
    });

    if (toast.hideTimeout) clearTimeout(toast.hideTimeout);
    toast.hideTimeout = setTimeout(() => {
      toast.style.transform = 'translateX(150%)';
    }, 2500);
  },

  _alertQueue: Promise.resolve(),
  _nativeAlert: typeof window !== 'undefined' && typeof window.alert === 'function' ? window.alert.bind(window) : null,

  _ensureAlertDialogStyle() {
    if (document.getElementById('ct-alert-style')) return;
    const style = document.createElement('style');
    style.id = 'ct-alert-style';
    style.textContent = `
      @keyframes ctAlertFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes ctAlertCardIn {
        from { opacity: 0; transform: translateY(14px) scale(0.96); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      #ct-alert-overlay {
        position: fixed;
        inset: 0;
        z-index: 120000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background:
          radial-gradient(circle at top, rgba(79, 142, 247, 0.16), transparent 32%),
          rgba(9, 12, 20, 0.52);
        backdrop-filter: blur(14px);
        animation: ctAlertFadeIn 0.18s ease;
      }
      #ct-alert-overlay .ct-alert-card {
        width: min(520px, calc(100vw - 32px));
        overflow: hidden;
        border-radius: 22px;
        border: 1px solid var(--border2, rgba(255,255,255,0.14));
        background:
          linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)),
          var(--bg2, #171c28);
        box-shadow:
          0 28px 80px rgba(0, 0, 0, 0.34),
          0 8px 24px rgba(0, 0, 0, 0.18);
        color: var(--text, #e8eaf2);
        animation: ctAlertCardIn 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.15);
      }
      #ct-alert-overlay .ct-alert-top {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        padding: 22px 24px 18px;
        border-bottom: 1px solid var(--border, rgba(255,255,255,0.08));
      }
      #ct-alert-overlay .ct-alert-icon {
        width: 44px;
        height: 44px;
        flex-shrink: 0;
        display: grid;
        place-items: center;
        border-radius: 14px;
        background: linear-gradient(135deg, rgba(79, 142, 247, 0.22), rgba(124, 93, 247, 0.2));
        border: 1px solid rgba(79, 142, 247, 0.22);
        font-size: 20px;
      }
      #ct-alert-overlay .ct-alert-head {
        min-width: 0;
        flex: 1;
      }
      #ct-alert-overlay .ct-alert-title {
        margin: 0;
        font-size: 17px;
        font-weight: 800;
        color: var(--text, #e8eaf2);
        letter-spacing: -0.01em;
      }
      #ct-alert-overlay .ct-alert-subtitle {
        margin: 6px 0 0;
        font-size: 12px;
        color: var(--text3, #8f96ad);
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-weight: 700;
      }
      #ct-alert-overlay .ct-alert-close {
        appearance: none;
        border: 1px solid var(--border, rgba(255,255,255,0.08));
        background: var(--bg3, #202635);
        color: var(--text2, #b4bbcf);
        width: 36px;
        height: 36px;
        border-radius: 11px;
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
        transition: transform 0.16s ease, border-color 0.16s ease, color 0.16s ease, background 0.16s ease;
      }
      #ct-alert-overlay .ct-alert-close:hover {
        transform: translateY(-1px);
        border-color: var(--accent, #4f8ef7);
        color: var(--accent, #4f8ef7);
      }
      #ct-alert-overlay .ct-alert-body {
        padding: 18px 24px 24px;
      }
      #ct-alert-overlay .ct-alert-message {
        margin: 0;
        color: var(--text2, #b4bbcf);
        font-size: 14px;
        line-height: 1.65;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
      #ct-alert-overlay .ct-alert-footer {
        margin-top: 22px;
        display: flex;
        justify-content: flex-end;
      }
      #ct-alert-overlay .ct-alert-ok {
        appearance: none;
        min-width: 112px;
        padding: 11px 18px;
        border: 1px solid transparent;
        border-radius: 12px;
        cursor: pointer;
        background: linear-gradient(135deg, var(--accent, #4f8ef7), var(--accent2, #7c5df7));
        color: #fff;
        font-family: var(--sans, "Inter", sans-serif);
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.01em;
        box-shadow: 0 12px 24px rgba(79, 142, 247, 0.28);
        transition: transform 0.16s ease, box-shadow 0.16s ease, opacity 0.16s ease;
      }
      #ct-alert-overlay .ct-alert-ok:hover {
        transform: translateY(-1px);
        box-shadow: 0 16px 28px rgba(79, 142, 247, 0.34);
      }
      #ct-alert-overlay .ct-alert-ok:active,
      #ct-alert-overlay .ct-alert-close:active {
        transform: translateY(0);
      }
      html[data-theme="light"] #ct-alert-overlay {
        background:
          radial-gradient(circle at top, rgba(79, 142, 247, 0.14), transparent 34%),
          rgba(16, 23, 38, 0.24);
      }
      html[data-theme="light"] #ct-alert-overlay .ct-alert-card {
        background:
          linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.82)),
          var(--bg2, #ffffff);
        box-shadow:
          0 24px 60px rgba(15, 23, 42, 0.16),
          0 8px 20px rgba(15, 23, 42, 0.08);
      }
    `;
    document.head.appendChild(style);
  },

  showAlert(message, options = {}) {
    const text = String(message == null ? '' : message);
    const title = String(options.title || 'Aviso');
    const subtitle = String(options.subtitle || 'Track Concursos');
    const icon = options.icon || '✦';

    if (typeof document === 'undefined' || !document.body) {
      if (this._nativeAlert) this._nativeAlert(text);
      return Promise.resolve();
    }

    this._ensureAlertDialogStyle();

    this._alertQueue = this._alertQueue.finally(() => new Promise(resolve => {
      const current = document.getElementById('ct-alert-overlay');
      if (current) current.remove();

      const overlay = document.createElement('div');
      overlay.id = 'ct-alert-overlay';
      overlay.innerHTML = `
        <div class="ct-alert-card" role="alertdialog" aria-modal="true" aria-labelledby="ct-alert-title" aria-describedby="ct-alert-message">
          <div class="ct-alert-top">
            <div class="ct-alert-icon">${icon}</div>
            <div class="ct-alert-head">
              <h2 class="ct-alert-title" id="ct-alert-title">${title}</h2>
              <div class="ct-alert-subtitle">${subtitle}</div>
            </div>
            <button class="ct-alert-close" type="button" aria-label="Fechar aviso">×</button>
          </div>
          <div class="ct-alert-body">
            <p class="ct-alert-message" id="ct-alert-message"></p>
            <div class="ct-alert-footer">
              <button class="ct-alert-ok" type="button">OK</button>
            </div>
          </div>
        </div>
      `;

      const close = () => {
        document.removeEventListener('keydown', onKeyDown, true);
        overlay.remove();
        resolve();
      };

      const onKeyDown = event => {
        if (event.key === 'Escape' || event.key === 'Enter') {
          event.preventDefault();
          close();
        }
      };

      overlay.querySelector('.ct-alert-message').textContent = text;
      overlay.querySelector('.ct-alert-ok').addEventListener('click', close);
      overlay.querySelector('.ct-alert-close').addEventListener('click', close);

      document.addEventListener('keydown', onKeyDown, true);
      document.body.appendChild(overlay);
      overlay.querySelector('.ct-alert-ok').focus();
    }));

    return this._alertQueue;
  },

  installAlertOverride() {
    if (typeof window === 'undefined' || window.__ctAlertOverrideInstalled) return;
    window.__ctAlertOverrideInstalled = true;
    window.__ctNativeAlert = this._nativeAlert;
    window.alert = message => {
      this.showAlert(message);
    };
  },

  // Copia texto para o clipboard e mostra toast
  copy(text) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.toast(`Copiado: "${text.length > 25 ? text.substring(0, 25) + '...' : text}"`, '📋');
    }).catch(err => {
      console.error('Erro ao copiar:', err);
    });
  },

  // ─────────────────────────────────────────
  // CONCURSOS
  // ─────────────────────────────────────────

  getConcursos() {
    return this._get('ct_concursos');
  },

  getConcurso(id) {
    return this.getConcursos().find(c => c.id === id) || null;
  },

  saveConcurso(data) {
    const list = this.getConcursos();
    // Só busca por id existente se o id for válido (não undefined/null)
    const existing = data.id ? list.findIndex(c => c.id === data.id) : -1;
    if (existing >= 0) {
      list[existing] = { ...list[existing], ...data };
    } else {
      // Garante que o id gerado não seja sobrescrito pelo data
      const novoId = this._id();
      const { id, ...resto } = data; // remove id do data antes de espalhar
      list.push({ id: novoId, criadoEm: this._today(), contarEstatisticas: true, ...resto });
    }
    this._set('ct_concursos', list);
    return existing >= 0 ? list[existing].id : list[list.length - 1].id;
  },

  _clearContestAuxKeys(concursoId) {
    if (!concursoId) return;
    [
      'ct_crono_', 'ct_crono_mats_', 'ct_crono_sugestoes_', 'ct_crono_modo_',
      'ct_config_prova_', 'ct_matcor_nome_', 'ct_cest_', 'ct_ciclo_', 'ct_ciclo_stats_',
      'ct_matcor_'
    ].forEach(prefix => {
      localStorage.removeItem(`${prefix}${concursoId}`);
    });
  },

  deleteConcurso(id) {
    const concursos = this.getConcursos().filter(c => c.id !== id);
    const materiasOriginais = this._get('ct_materias');
    const materiasAtualizadas = [];

    materiasOriginais.forEach(m => {
      if (m.concursoId === id) {
        const concursosB = Array.isArray(m.concursosB) ? m.concursosB.filter(cid => cid !== id) : [];
        if (concursosB.length > 0) {
          materiasAtualizadas.push({ ...m, concursoId: concursosB[0], concursosB: concursosB.slice(1) });
        }
        return;
      }

      if (Array.isArray(m.concursosB) && m.concursosB.includes(id)) {
        materiasAtualizadas.push({ ...m, concursosB: m.concursosB.filter(cid => cid !== id) });
        return;
      }

      materiasAtualizadas.push(m);
    });

    const materiasAtivas = new Set(materiasAtualizadas.map(m => m.id));
    const topicosAtualizados = this.getTopicos().filter(t => materiasAtivas.has(t.materiaId));
    const topicosAtivos = new Set(topicosAtualizados.map(t => t.id));
    const concursosAtivos = new Set(concursos.map(c => c.id));

    this._set('ct_concursos', concursos);
    this._set('ct_materias', materiasAtualizadas);
    this._set('ct_topicos', topicosAtualizados);
    this._set('ct_subtopicos', this.getSubtopicos().filter(s => topicosAtivos.has(s.topicoId)));
    this._set('ct_revisoes', this.getRevisoes().filter(r => {
      const ctx = this.getContextoRevisao(r);
      return ctx.topicoId && topicosAtivos.has(ctx.topicoId);
    }));
    this._set('ct_sessoes', this.getSessoes().filter(s =>
      concursosAtivos.has(s.concursoId) && (!s.materiaId || materiasAtivas.has(s.materiaId))
    ));
    this._set('ct_questoes', this.getQuestoes().filter(q =>
      concursosAtivos.has(q.concursoId) &&
      (!q.materiaId || materiasAtivas.has(q.materiaId)) &&
      (!q.topicoId || topicosAtivos.has(q.topicoId))
    ));
    this._set('ct_simulados', this.getSimulados().filter(s => s.concursoId !== id));
    this._clearContestAuxKeys(id);
  },

  // Calcula dias restantes para a prova
  diasRestantes(concurso) {
    if (!concurso.dataProva) return null;
    const hoje = new Date();
    const prova = new Date(concurso.dataProva);
    const diff = Math.ceil((prova - hoje) / (1000 * 60 * 60 * 24));
    return diff;
  },

  getPreEditalRocketAsset(concursoOuCoberto) {
    const coberto = typeof concursoOuCoberto === 'number'
      ? concursoOuCoberto
      : ((concursoOuCoberto && concursoOuCoberto.coberto) || 0);
    return coberto > 0
      ? 'assets/mascots/pre-edital-rocket.gif'
      : 'assets/mascots/pre-edital-rocket-still.png';
  },

  renderCoverageRocket(concursoOuCoberto, size = 18, extraStyle = '') {
    const src = this.getPreEditalRocketAsset(concursoOuCoberto);
    const safeSize = Number(size) > 0 ? Number(size) : 18;
    return `<img src="${src}" alt="Foguete da cobertura" style="width:${safeSize}px;height:${safeSize}px;object-fit:contain;display:inline-block;vertical-align:-4px;${extraStyle}">`;
  },

  _markPreEditalCoverage(concurso) {
    if (!concurso) return null;
    const cobertoAnterior = concurso.coberto || 0;
    concurso.coberto = cobertoAnterior + 1;
    concurso.preResetPromptPending = true;
    concurso.preMascotCelebrateOnReset = false;
    concurso.preMascotLaunchPending = false;
    this.saveConcurso(concurso);
    return concurso;
  },

  consumirAnimacaoMascotePreEdital(concursoId) {
    const c = this.getConcurso(concursoId);
    if (!c || !c.preMascotLaunchPending) return false;
    c.preMascotLaunchPending = false;
    c.preMascotCelebratedAt = new Date().toISOString();
    this.saveConcurso(c);
    return true;
  },

  resetarProgressoPreEdital(concursoId) {
    const c = this.getConcurso(concursoId);
    if (!c) return false;

    const matIds = this.getMaterias(concursoId).map(m => m.id);
    if (!matIds.length) {
      c._esperandoReset = false;
      c.preResetPromptPending = false;
      c.preMascotLaunchPending = false;
      c.preMascotCelebrateOnReset = false;
      this.saveConcurso(c);
      return true;
    }

    const list = this._get('ct_topicos');
    let updated = false;
    list.forEach(top => {
      if (matIds.includes(top.materiaId)) {
        top.estudado = false;
        top.estudadoEm = null;
        updated = true;
      }
    });
    if (updated) this._set('ct_topicos', list);

    const subList = this._get('ct_subtopicos');
    let subUpdated = false;
    const tsIds = list.filter(t => matIds.includes(t.materiaId)).map(t => t.id);
    subList.forEach(sub => {
      if (tsIds.includes(sub.topicoId)) {
        sub.estudado = false;
        sub.estudadoEm = null;
        subUpdated = true;
      }
    });
    if (subUpdated) this._set('ct_subtopicos', subList);

    c._esperandoReset = false;
    c.preResetPromptPending = false;
    c.preMascotLaunchPending = false;
    c.preMascotCelebrateOnReset = false;
    this.saveConcurso(c);
    return true;
  },

  // Incrementa contador de vezes que zerou o edital (pré-edital)
  incrementarCoberto(concursoId) {
    const c = this.getConcurso(concursoId);
    if (!c) return;
    this._markPreEditalCoverage(c);
  },

  // ─────────────────────────────────────────
  // MATÉRIAS
  // ─────────────────────────────────────────

  getMaterias(concursoId) {
    const all = this._get('ct_materias').map(m => m && m.nome ? { ...m, nome: this._formatMateriaNome(m.nome) } : m);
    return concursoId ? all.filter(m => m.concursoId === concursoId || (m.concursosB && m.concursosB.includes(concursoId))) : all;
  },

  getMateria(id) {
    const materia = this._get('ct_materias').find(m => m.id === id) || null;
    return materia && materia.nome ? { ...materia, nome: this._formatMateriaNome(materia.nome) } : materia;
  },

  saveMateria(data) {
    const list = this._get('ct_materias');
    const normalizedData = data && data.nome != null ? { ...data, nome: this._formatMateriaNome(data.nome) } : data;
    const isCollidable = normalizedData.id && normalizedData.id.startsWith('mat_');
    const idx = list.findIndex(m => m.id === normalizedData.id);

    if (idx >= 0 && isCollidable && list[idx].concursoId !== normalizedData.concursoId) {
      list.push({ ...normalizedData, id: this._id() });
    } else if (idx >= 0) {
      list[idx] = { ...list[idx], ...normalizedData };
    } else {
      list.push({ id: this._id(), ...normalizedData });
    }
    this._set('ct_materias', list);
  },

  vincularMateria(materiaId, concursoId) {
    const list = this._get('ct_materias');
    const idx = list.findIndex(m => m.id === materiaId);
    if (idx >= 0) {
      const m = list[idx];
      if (m.concursoId !== concursoId && !(m.concursosB && m.concursosB.includes(concursoId))) {
        if (!m.concursosB) m.concursosB = [];
        m.concursosB.push(concursoId);
        this._set('ct_materias', list);
      }
    }
  },

  _linkIaTypeMeta(tipo) {
    const normalized = String(tipo || '').trim().toUpperCase();
    if (['PDF', 'AULA', 'AULAPDF'].includes(normalized)) {
      return { rotulo: 'PDF', nome: 'PDF de Aulas', emoji: '📙' };
    }
    if (['VIDEO', 'VIDEOAULA', 'VIDEOAULAS'].includes(normalized)) {
      return { rotulo: 'VIDEO', nome: 'Link de Videoaulas', emoji: '🎥' };
    }
    if (['FLASH', 'FLASHCARD', 'FLASHCARDS'].includes(normalized)) {
      return { rotulo: 'FLASH', nome: 'Flashcards', emoji: '🎴' };
    }
    if (['QUEST', 'QUESTAO', 'QUESTOES', 'CADERNO', 'CADERNODEQUESTOES'].includes(normalized)) {
      return { rotulo: 'QUEST', nome: 'Caderno de Questoes', emoji: '📓' };
    }
    return null;
  },

  desvincularOuDeletarMateria(materiaId, concursoId) {
    let list = this._get('ct_materias');
    const idx = list.findIndex(m => m.id === materiaId);
    if (idx < 0) return false;
    const m = list[idx];

    if (m.concursosB && m.concursosB.includes(concursoId)) {
      m.concursosB = m.concursosB.filter(c => c !== concursoId);
      this._set('ct_materias', list);
      return false; // Apenas desvinculou
    }

    if (m.concursoId === concursoId) {
      if (m.concursosB && m.concursosB.length > 0) {
        m.concursoId = m.concursosB.shift();
        this._set('ct_materias', list);
        return false; // Transferiu titularidade e desvinculou
      } else {
        list.splice(idx, 1);
        this._set('ct_materias', list);
        const tops = this.getTopicos(m.id);
        const topIds = tops.map(t => t.id);
        this._set('ct_topicos', this.getTopicos().filter(t => t.materiaId !== m.id));
        this._set('ct_subtopicos', this.getSubtopicos().filter(s => !topIds.includes(s.topicoId)));
        this._set('ct_questoes', this.getQuestoes().filter(q => q.materiaId !== m.id));
    this._set('ct_revisoes', this.getRevisoes().filter(r => {
      const ctx = this.getContextoRevisao(r);
      return !ctx.topicoId || !topIds.includes(ctx.topicoId);
    }));
        this._set('ct_sessoes', this.getSessoes().filter(s => s.materiaId !== m.id));
        return true; // Deletou pra valer
      }
    }
    return false;
  },

  // ─────────────────────────────────────────
  // LIMPEZA DE DADOS
  // ─────────────────────────────────────────

  limparLixo() {
    const lixo = ['matemacoites','dasda','dasdas','test','teste'];
    let all = this._get('ct_materias');
    const inicial = all.length;
    let list = all.filter(m => !lixo.includes(m.nome.toLowerCase().trim()));
    if (list.length < inicial) {
      this._set('ct_materias', list);
      console.log(`[CT] Limpeza: removidas ${inicial - list.length} matérias inúteis.`);
    }
  },

  // ─────────────────────────────────────────
  // TÓPICOS
  // ─────────────────────────────────────────

  getTopicos(materiaId) {
    const all = this._get('ct_topicos');
    return materiaId ? all.filter(t => t.materiaId === materiaId) : all;
  },

  getTopico(id) {
    return this._get('ct_topicos').find(t => t.id === id) || null;
  },

  saveTopico(data) {
    const list = this._get('ct_topicos');
    const isCollidable = data.id && data.id.startsWith('top_');
    const idx = list.findIndex(t => t.id === data.id);

    if (idx >= 0 && isCollidable && list[idx].concursoId !== data.concursoId) {
      const novo = { id: this._id(), estudado: false, revisaoData: null, ...data };
      list.push(novo);
      this._set('ct_topicos', list);
      return novo;
    } else if (idx >= 0) {
      list[idx] = { ...list[idx], ...data };
    } else {
      list.push({ id: this._id(), estudado: false, revisaoData: null, ...data });
    }
    this._set('ct_topicos', list);
    return list.find(t => t.id === (idx >= 0 ? data.id : list[list.length-1].id)) || list[list.length - 1];
  },

  marcarEstudado(topicoId, revisaoData) {
    const t = this.getTopico(topicoId);
    if (!t) return;
    t.estudado = true;
    t.estudadoEm = this._today();
    t.revisaoData = revisaoData || null;
    // Log cumulativo: registra cada vez que o tópico foi marcado como estudado
    if (!t.logEstudo) t.logEstudo = [];
    t.logEstudo.push({ data: this._today(), hora: new Date().toISOString() });
    this.saveTopico(t);
    // Agenda revisão
    if (revisaoData) this.agendarRevisao(topicoId, revisaoData);
    this._checkEditalBatido(t.concursoId);
  },

  desmarcarEstudado(topicoId) {
    const t = this.getTopico(topicoId);
    if (!t) return;
    t.estudado = false;
    t.estudadoEm = null;
    t.revisaoData = null;
    this.saveTopico(t);
    this._checkEditalBatido(t.concursoId);
  },

  _checkEditalBatido(concursoId) {
    const c = this.getConcurso(concursoId);
    if (!c) return;

    const matIds = this.getMaterias(concursoId).map(m => m.id);
    const topicos = this.getTopicos().filter(top => matIds.includes(top.materiaId));
    if (topicos.length === 0) return;

    const todosEstudados = topicos.every(top => top.estudado);
    if (todosEstudados) {
       if (c._esperandoReset) return;

       this._markPreEditalCoverage(c);
       c._esperandoReset = true;
       this.saveConcurso(c);
       this.toast('Edital coberto com sucesso. Abra o dashboard para iniciar o próximo ciclo quando quiser.', '🎉');
    } else {
       if (c._esperandoReset) {
          c._esperandoReset = false;
          c.preResetPromptPending = false;
          c.preMascotCelebrateOnReset = false;
          c.preMascotLaunchPending = false;
          this.saveConcurso(c);
       }
    }
  },

  // ─────────────────────────────────────────
  // SUBTÓPICOS
  // ─────────────────────────────────────────

  getSubtopicos(topicoId) {
    const all = this._get('ct_subtopicos');
    return topicoId ? all.filter(s => s.topicoId === topicoId) : all;
  },

  getSubtopico(id) {
    return this._get('ct_subtopicos').find(s => s.id === id) || null;
  },

  saveSubtopico(data) {
    const list = this._get('ct_subtopicos');
    const isCollidable = data.id && data.id.startsWith('sub_');
    const idx = list.findIndex(s => s.id === data.id);

    if (idx >= 0 && isCollidable && list[idx].concursoId !== data.concursoId) {
      list.push({ ...data, id: this._id(), estudado: false });
    } else if (idx >= 0) {
      list[idx] = { ...list[idx], ...data };
    } else {
      list.push({ id: this._id(), estudado: false, ...data });
    }
    this._set('ct_subtopicos', list);
  },

  // ─────────────────────────────────────────
  // QUESTÕES
  // ─────────────────────────────────────────

  getQuestoes(filtro) {
    const all = this._get('ct_questoes');
    if (!filtro) return all;
    return all.filter(q => {
      if (filtro.topicoId && q.topicoId !== filtro.topicoId) return false;
      if (filtro.subtopId && q.subtopId !== filtro.subtopId) return false;
      if (filtro.materiaId && q.materiaId !== filtro.materiaId) return false;
      if (filtro.concursoId && q.concursoId !== filtro.concursoId) return false;
      return true;
    });
  },

  lancarQuestoes(dados) {
    // dados: { topicoId?, subtopId?, materiaId, concursoId, resolvidas, acertos, erros }
    const list = this._get('ct_questoes');
    const novoLancamento = { id: this._id(), data: this._today(), horaInicio: new Date().toISOString(), ...dados };
    list.push(novoLancamento);
    this._set('ct_questoes', list);
    this._emitDataUpdated('questoes:add', {
      concursoId: novoLancamento.concursoId || null,
      materiaId: novoLancamento.materiaId || null,
      topicoId: novoLancamento.topicoId || null,
      subtopId: novoLancamento.subtopId || null,
      item: novoLancamento
    });
    return novoLancamento.id;
  },

  excluirLancamentoQuestoes(id) {
    if (!id) return false;
    const list = this._get('ct_questoes');
    const removido = list.find(q => q.id === id);
    const next = list.filter(q => q.id !== id);
    if (next.length === list.length) return false;
    this._set('ct_questoes', next);
    this._emitDataUpdated('questoes:remove', {
      concursoId: removido?.concursoId || null,
      materiaId: removido?.materiaId || null,
      topicoId: removido?.topicoId || null,
      subtopId: removido?.subtopId || null,
      item: removido || null
    });
    return true;
  },

  desfazerUltimoLancamento(filtro) {
    const list = this._get('ct_questoes');
    let removido = null;
    // Encontra o ultimo lancamento que bate com o filtro
    for (let i = list.length - 1; i >= 0; i--) {
      const q = list[i];
      const match =
        (!filtro.topicoId || q.topicoId === filtro.topicoId) &&
        (!filtro.subtopId || q.subtopId === filtro.subtopId);
      if (match) { removido = list.splice(i, 1)[0]; break; }
    }
    this._set('ct_questoes', list);
    if (removido) {
      this._emitDataUpdated('questoes:remove', {
        concursoId: removido.concursoId || null,
        materiaId: removido.materiaId || null,
        topicoId: removido.topicoId || null,
        subtopId: removido.subtopId || null,
        item: removido
      });
    }
  },

  // Calcula estatísticas de questões para um conjunto de lançamentos
  calcStats(questoes) {
    const res = questoes.reduce((acc, q) => {
      acc.resolvidas += q.resolvidas || 0;
      acc.acertos    += q.acertos    || 0;
      acc.erros      += q.erros      || 0;
      return acc;
    }, { resolvidas: 0, acertos: 0, erros: 0 });
    res.pct = res.resolvidas > 0 ? Math.round((res.acertos / res.resolvidas) * 100) : null;
    return res;
  },

  pctColor(pct) {
    if (pct === null || pct === undefined) return 'var(--text3)';
    if (pct >= 93) return 'var(--score-excellent)';
    if (pct >= 80) return 'var(--score-good)';
    if (pct >= 75) return 'var(--score-ok)';
    if (pct >= 50) return 'var(--score-mid)';
    return 'var(--score-low)';
  },

  // Retorna classe CSS de cor pela % de acertos
  pctClass(pct) {
    if (pct === null || pct === undefined) return 'none';
    if (pct >= 93) return 'g1';
    if (pct >= 80) return 'g2';
    if (pct >= 75) return 'y';
    if (pct >= 50) return 'o';
    return 'r';
  },

  // ─────────────────────────────────────────
  // SESSÕES DE ESTUDO
  // ─────────────────────────────────────────

  getSessoes(filtro) {
    const all = this._get('ct_sessoes');
    if (!filtro) return all;
    return all.filter(s => {
      if (filtro.concursoId && s.concursoId !== filtro.concursoId) return false;
      if (filtro.materiaId  && s.materiaId  !== filtro.materiaId)  return false;
      if (filtro.data       && s.data       !== filtro.data)        return false;
      return true;
    });
  },

  _cicloKey(concursoId) {
    return concursoId ? `ct_ciclo_${concursoId}` : '';
  },

  _readCiclo(concursoId) {
    const key = this._cicloKey(concursoId);
    if (!key) return null;
    try {
      const raw = JSON.parse(localStorage.getItem(key) || '{}');
      if (!raw || !Array.isArray(raw.entries)) return null;
      raw.sessionHistory = Array.isArray(raw.sessionHistory) ? raw.sessionHistory : [];
      return raw;
    } catch {
      return null;
    }
  },

  _writeCiclo(concursoId, raw) {
    const key = this._cicloKey(concursoId);
    if (!key || !raw) return;
    localStorage.setItem(key, JSON.stringify(raw));
    try {
      window.dispatchEvent(new CustomEvent('ct-cycle-updated', { detail: { concursoId, data: raw } }));
    } catch {}
  },

  _cicloEntryNome(entry, sessao) {
    const materia = sessao && sessao.materiaId ? this.getMateria(sessao.materiaId) : null;
    if (materia && materia.nome) return materia.nome;
    if (entry && entry.nome) return entry.nome;
    if (entry && entry.baseId) return String(entry.baseId).replace(/^base_/, '').replace(/_/g, ' ').toUpperCase();
    return 'Materia';
  },

  _findCicloEntryIndex(raw, sessao) {
    if (!raw || !Array.isArray(raw.entries) || !sessao || !sessao.materiaId) return -1;
    const matches = raw.entries
      .map((entry, idx) => ({ entry, idx }))
      .filter(({ entry }) => entry && entry.materiaId === sessao.materiaId);
    if (!matches.length) return -1;

    const pending = matches.find(({ entry }) =>
      entry.status !== 'done' &&
      entry.status !== 'skipped' &&
      Math.max(0, parseInt(entry.targetSeconds, 10) || 0) > 0 &&
      Math.max(0, entry.remainingSeconds == null ? parseInt(entry.targetSeconds, 10) || 0 : parseInt(entry.remainingSeconds, 10) || 0) > 0
    );
    return (pending || matches[0]).idx;
  },

  _nextCicloPendingIndex(entries, fromIndex) {
    const isPending = entry =>
      entry &&
      entry.status !== 'done' &&
      entry.status !== 'skipped' &&
      Math.max(0, parseInt(entry.targetSeconds, 10) || 0) > 0;

    for (let i = fromIndex + 1; i < entries.length; i++) if (isPending(entries[i])) return i;
    for (let i = 0; i < fromIndex; i++) if (isPending(entries[i])) return i;
    return Math.max(0, Math.min(fromIndex, Math.max(entries.length - 1, 0)));
  },

  _logCicloStat(concursoId, entry) {
    const key = concursoId ? `ct_ciclo_stats_${concursoId}` : '';
    if (!key) return;
    let list = [];
    try { list = JSON.parse(localStorage.getItem(key) || '[]'); } catch { list = []; }
    list.push({
      id: `cycle_stat_${Date.now()}_${Math.random().toString(16).slice(2, 7)}`,
      data: this._today(),
      criadoEm: new Date().toISOString(),
      concursoId,
      ...entry
    });
    localStorage.setItem(key, JSON.stringify(list));
  },

  _syncCicloSessao(sessao) {
    if (!sessao || sessao.skipCycleSync || !sessao.concursoId || !sessao.materiaId) return;
    const dur = Math.max(0, parseInt(sessao.duracaoSegundos, 10) || 0);
    if (!dur) return;

    const raw = this._readCiclo(sessao.concursoId);
    if (!raw || !raw.entries.length) return;
    if (sessao.id && raw.sessionHistory.some(s => s.id === sessao.id || s.sessaoId === sessao.id)) return;

    const idx = this._findCicloEntryIndex(raw, sessao);
    if (idx < 0) return;

    const entry = raw.entries[idx];
    const target = Math.max(0, parseInt(entry.targetSeconds, 10) || 0);
    const beforeRemaining = Math.max(0, entry.remainingSeconds == null ? target : parseInt(entry.remainingSeconds, 10) || 0);
    const wasDone = entry.status === 'done';
    const afterRemaining = entry.status === 'done' || entry.status === 'skipped'
      ? 0
      : Math.max(0, beforeRemaining - dur);

    if (target > 0 && entry.status !== 'done' && entry.status !== 'skipped') {
      entry.remainingSeconds = afterRemaining;
      entry.status = afterRemaining === 0 ? 'done' : 'pending';
      entry.skippedSeconds = 0;
      entry.lastPendingSeconds = afterRemaining === 0 ? 0 : Math.max(0, parseInt(entry.lastPendingSeconds, 10) || 0);
      entry.updatedAt = new Date().toISOString();
      if (afterRemaining === 0) raw.currentIndex = this._nextCicloPendingIndex(raw.entries, idx);
    }

    raw.currentItemId = raw.entries[raw.currentIndex] ? raw.entries[raw.currentIndex].id : '';
    raw.sessionHistory.push({
      id: sessao.id || `cyc_sess_${Date.now()}_${Math.random().toString(16).slice(2, 7)}`,
      sessaoId: sessao.id || null,
      itemId: entry.id,
      nome: this._cicloEntryNome(entry, sessao),
      duracao: dur,
      ts: Date.now(),
      origem: sessao.origem || 'sessao'
    });

    if (!wasDone && entry.status === 'done' && target > 0) {
      this._logCicloStat(sessao.concursoId, {
        materiaId: entry.materiaId || sessao.materiaId,
        materiaNome: this._cicloEntryNome(entry, sessao),
        targetSeconds: target,
        studiedSeconds: target,
        skippedSeconds: 0,
        concluida: true,
        round: Math.max(1, parseInt(raw.round, 10) || 1),
        origem: 'sessao_estudo'
      });
    }

    this._writeCiclo(sessao.concursoId, raw);
  },

  _refundCicloSessao(sessao) {
    if (!sessao || !sessao.concursoId || !sessao.materiaId) return;
    const dur = Math.max(0, parseInt(sessao.duracaoSegundos, 10) || 0);
    if (!dur) return;

    const raw = this._readCiclo(sessao.concursoId);
    if (!raw || !raw.entries.length) return;
    const histIdx = raw.sessionHistory.findIndex(s => s.id === sessao.id || s.sessaoId === sessao.id);
    if (histIdx < 0) return;
    const hist = raw.sessionHistory[histIdx];
    const idx = raw.entries.findIndex(entry => entry.id === hist.itemId);
    if (idx < 0) return;

    const entry = raw.entries[idx];
    const target = Math.max(0, parseInt(entry.targetSeconds, 10) || 0);
    const current = Math.max(0, entry.remainingSeconds == null ? 0 : parseInt(entry.remainingSeconds, 10) || 0);
    entry.remainingSeconds = Math.min(target, current + dur);
    if (entry.remainingSeconds > 0 && target > 0) {
      entry.status = 'pending';
      raw.currentIndex = idx;
      raw.currentItemId = entry.id;
    }
    entry.updatedAt = new Date().toISOString();
    raw.sessionHistory.splice(histIdx, 1);
    this._writeCiclo(sessao.concursoId, raw);
  },
  registrarSessao(dados) {
    // dados: { concursoId, materiaId, duracaoSegundos, origem? }
    const list = this._get('ct_sessoes');
    const novaSessao = { id: this._id(), data: this._today(), horaInicio: new Date().toISOString(), origem: 'manual', ...dados };
    list.push(novaSessao);
    this._set('ct_sessoes', list);
    this._syncCicloSessao(novaSessao);
    this._emitDataUpdated('sessao:add', {
      concursoId: novaSessao.concursoId || null,
      materiaId: novaSessao.materiaId || null,
      topicoId: novaSessao.topicoId || null,
      subtopId: novaSessao.subtopId || novaSessao.subtopicoId || null,
      item: novaSessao
    });
    if (typeof this.queueAutoSave === 'function') {
      this.queueAutoSave('sessao-registrada', { delay: 1200, toast: true });
    }
    return novaSessao.id;
  },

  excluirSessao(id) {
    if (!id) return false;
    const list = this._get('ct_sessoes');
    const sessao = list.find(s => s.id === id);
    const next = list.filter(s => s.id !== id);
    if (next.length === list.length) return false;
    this._set('ct_sessoes', next);
    this._refundCicloSessao(sessao);
    this._emitDataUpdated('sessao:remove', {
      concursoId: sessao?.concursoId || null,
      materiaId: sessao?.materiaId || null,
      topicoId: sessao?.topicoId || null,
      subtopId: sessao?.subtopId || sessao?.subtopicoId || null,
      item: sessao || null
    });
    return true;
  },

  // Soma total de segundos de sessões
  totalSegundos(sessoes) {
    return sessoes.reduce((acc, s) => acc + (s.duracaoSegundos || 0), 0);
  },

  // Formata segundos em "Xh Ym"
  formatarTempo(segundos) {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    if (h > 0) return `${h}h${m > 0 ? m + 'm' : ''}`;
    return `${m}min`;
  },

  // ─────────────────────────────────────────
  // REVISÕES
  // ─────────────────────────────────────────

  getRevisoes() {
    return this._get('ct_revisoes');
  },

  _resolverAlvoRevisao(alvo) {
    if (!alvo) return { topico: null, subtopico: null, topicoId: null, subtopId: null };

    if (typeof alvo === 'object' && (alvo.topicoId || alvo.subtopId)) {
      let topico = alvo.topicoId ? this.getTopico(alvo.topicoId) : null;
      let subtopico = alvo.subtopId ? this.getSubtopico(alvo.subtopId) : null;

      if (!subtopico && !topico && alvo.topicoId) {
        subtopico = this.getSubtopico(alvo.topicoId);
        if (subtopico) topico = this.getTopico(subtopico.topicoId);
      }

      if (!topico && subtopico) topico = this.getTopico(subtopico.topicoId);

      return {
        topico,
        subtopico,
        topicoId: topico ? topico.id : (alvo.topicoId || null),
        subtopId: subtopico ? subtopico.id : null
      };
    }

    const topico = this.getTopico(alvo);
    if (topico) return { topico, subtopico: null, topicoId: topico.id, subtopId: null };

    const subtopico = this.getSubtopico(alvo);
    if (subtopico) {
      return {
        topico: this.getTopico(subtopico.topicoId),
        subtopico,
        topicoId: subtopico.topicoId || null,
        subtopId: subtopico.id
      };
    }

    return { topico: null, subtopico: null, topicoId: alvo, subtopId: null };
  },

  getContextoRevisao(revisao) {
    const alvo = this._resolverAlvoRevisao(revisao);
    const materia = alvo.topico ? this.getMateria(alvo.topico.materiaId) : null;
    return {
      ...alvo,
      materia,
      concursoId: alvo.topico?.concursoId || alvo.subtopico?.concursoId || materia?.concursoId || null,
      nome: alvo.subtopico?.nome || alvo.topico?.nome || '—'
    };
  },

  revisaoPertenceAoTopico(revisao, topicoId) {
    const ctx = this.getContextoRevisao(revisao);
    return ctx.topicoId === topicoId && !ctx.subtopId;
  },

  revisaoPertenceAoSubtopico(revisao, subtopId) {
    const ctx = this.getContextoRevisao(revisao);
    return ctx.subtopId === subtopId;
  },

  agendarRevisao(alvoId, data) {
    const alvo = this._resolverAlvoRevisao(alvoId);
    if (!alvo.topicoId && !alvo.subtopId) return;
    const list = this._get('ct_revisoes');
    // Marca revisões anteriores como concluídas/substituídas (preserva histórico)
    list.forEach(r => {
      const atual = this._resolverAlvoRevisao(r);
      if (atual.topicoId === alvo.topicoId && atual.subtopId === alvo.subtopId && !r.concluida) {
        r.concluida = true;
        r.substituida = true;
        r.substituidaEm = this._today();
      }
    });
    list.push({
      id: this._id(),
      topicoId: alvo.topicoId,
      subtopId: alvo.subtopId || null,
      data,
      concluida: false,
      agendadaEm: this._today()
    });
    this._set('ct_revisoes', list);
  },

  concluirRevisao(alvoId, proximaData) {
    const alvo = this._resolverAlvoRevisao(alvoId);
    const list = this._get('ct_revisoes');
    const idx = list.findIndex(r => {
      if (r.concluida) return false;
      const atual = this._resolverAlvoRevisao(r);
      return atual.topicoId === alvo.topicoId && atual.subtopId === alvo.subtopId;
    });
    if (idx >= 0) list[idx].concluida = true;
    this._set('ct_revisoes', list);
    if (proximaData) this.agendarRevisao(alvoId, proximaData);
  },

  excluirRevisao(revisaoId) {
    if (!revisaoId) return false;
    const list = this._get('ct_revisoes');
    const next = list.filter(r => r.id !== revisaoId);
    if (next.length === list.length) return false;
    this._set('ct_revisoes', next);
    return true;
  },

  // Classifica revis�es: atrasadas, hoje, futuras

  classificarRevisoes() {
    const hoje = this._today();
    const revisoes = this.getRevisoes().filter(r => !r.concluida);
    return {
      atrasadas: revisoes.filter(r => r.data < hoje),
      hoje:      revisoes.filter(r => r.data === hoje),
      futuras:   revisoes.filter(r => r.data > hoje),
    };
  },

  // ─────────────────────────────────────────
  // SIMULADOS
  // ─────────────────────────────────────────

  getSimulados(concursoId) {
    const all = this._get('ct_simulados');
    // Repair any simulados that lost their ID due to the bug
    let repaired = false;
    all.forEach(s => { if (!s.id) { s.id = this._id(); repaired = true; } });
    if (repaired) this._set('ct_simulados', all);
    return concursoId ? all.filter(s => s.concursoId === concursoId) : all;
  },

  saveSimulado(data) {
    const list = this._get('ct_simulados');
    if (!data.id) data.id = this._id(); // Ensure defined before finding
    const idx = list.findIndex(s => s.id === data.id);
    if (idx >= 0) { list[idx] = { ...list[idx], ...data }; }
    else { list.push({ criadoEm: this._today(), ...data, id: data.id }); }
    this._set('ct_simulados', list);
  },

  getSimuladoPct(sim) {
    if (!sim || typeof sim !== 'object') return null;

    const parseOptionalNumber = value => {
      if (value === null || value === undefined || value === '') return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const acertosTotal = parseOptionalNumber(
      sim.acertosTotal ??
      sim?.desempenhoPainel?.totalAcertos
    );
    const questoesTotal = parseOptionalNumber(
      sim.questoesTotal ??
      sim?.desempenhoPainel?.totalQuestoes
    );

    if (acertosTotal != null && questoesTotal != null && questoesTotal > 0) {
      return Math.round((acertosTotal / questoesTotal) * 1000) / 10;
    }

    const pct = parseOptionalNumber(sim.pct);
    return pct != null ? pct : null;
  },

  ultimoSimulado(concursoId) {
    const sims = this.getSimulados(concursoId)
      .map(s => ({ ...s, _pctCalculado: this.getSimuladoPct(s) }))
      .filter(s => s._pctCalculado != null)
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
    if (!sims[0]) return null;
    return { ...sims[0], pct: sims[0]._pctCalculado };
  },

  // ─────────────────────────────────────────
  // IMPORTAR EDITAL (JSON)
  // ─────────────────────────────────────────

  importarEdital(json, concursoId) {
    try {
      const data = typeof json === 'string' ? JSON.parse(json) : json;
      const materias = data.materias || [];
      let totalTopicos = 0;

      materias.forEach(mat => {
        // Se o ID for 'mat_XXX', ignoramos para forçar um novo ID único
        const materiaId = (mat.id && !mat.id.startsWith('mat_')) ? mat.id : this._id();
        this.saveMateria({
          id: materiaId,
          concursoId,
          nome: mat.nome,
          ordem: mat.ordem || 0,
        });

        (mat.topicos || []).forEach((top, ti) => {
          const topicoId = (top.id && !top.id.startsWith('top_')) ? top.id : this._id();
          this.saveTopico({
            id: topicoId,
            materiaId,
            concursoId,
            nome: top.nome,
            ordem: ti,
          });
          totalTopicos++;

          (top.subtopicos || []).forEach((sub, si) => {
            this.saveSubtopico({
              id: (sub.id && !sub.id.startsWith('sub_')) ? sub.id : this._id(),
              topicoId,
              materiaId,
              concursoId,
              nome: sub.nome,
              ordem: si,
            });
          });
        });
      });
      return { ok: true, materias: materias.length, topicos: totalTopicos };
    } catch(e) {
      return { ok: false, erro: e.message };
    }
  },

  // ─────────────────────────────────────────

  importarMateriaJson(json, concursoId) {
    try {
      const data = typeof json === 'string' ? JSON.parse(json) : json;
      const materia = data.materia || (Array.isArray(data.materias) ? data.materias[0] : data);
      if (!materia || !materia.nome) throw new Error('Informe uma materia com nome.');

      const materiaId = this._id();
      this.saveMateria({
        id: materiaId,
        concursoId,
        nome: materia.nome,
        ordem: materia.ordem || 0,
      });

      let totalTopicos = 0;
      let totalSubtopicos = 0;
      (materia.topicos || []).forEach((top, ti) => {
        if (!top || !top.nome) return;
        const topicoId = this._id();
        this.saveTopico({
          id: topicoId,
          materiaId,
          concursoId,
          nome: top.nome,
          ordem: top.ordem != null ? top.ordem : ti,
        });
        totalTopicos++;

        (top.subtopicos || []).forEach((sub, si) => {
          const nomeSub = typeof sub === 'string' ? sub : sub && sub.nome;
          if (!nomeSub) return;
          this.saveSubtopico({
            id: this._id(),
            topicoId,
            materiaId,
            concursoId,
            nome: nomeSub,
            ordem: sub && sub.ordem != null ? sub.ordem : si,
          });
          totalSubtopicos++;
        });
      });

      return { ok: true, materiaId, materias: 1, topicos: totalTopicos, subtopicos: totalSubtopicos };
    } catch(e) {
      return { ok: false, erro: e.message };
    }
  },
  // SMART LINKING (Cross-Contest)
  // ─────────────────────────────────────────

  _flashDeckUrl(deckId) {
    return `dashboard.html#flashcards:${encodeURIComponent(deckId)}`;
  },

  _flashSrsInicial() {
    return {
      status: 'new',
      ease: 2.5,
      interval: 0,
      reviews: 0,
      lapses: 0,
      nextReview: null,
      lastReview: null,
    };
  },

  _getFlashDecks() {
    return this._get('ct_flashcard_decks');
  },

  _getFlashCards() {
    return this._get('ct_flashcards');
  },

  _collectFlashDeckDescendants(decks, rootIds) {
    const ids = new Set(rootIds || []);
    let changed = true;
    while (changed) {
      changed = false;
      decks.forEach(deck => {
        if (deck.parentId && ids.has(deck.parentId) && !ids.has(deck.id)) {
          ids.add(deck.id);
          changed = true;
        }
      });
    }
    return Array.from(ids);
  },

  _hasFlashcardsFor(type, sourceId) {
    const allDecks = this._getFlashDecks();
    const decks = allDecks.filter(d => d.sourceType === type && d.sourceId === sourceId);
    if (!decks.length) return 0;
    const deckIds = new Set(this._collectFlashDeckDescendants(allDecks, decks.map(d => d.id)));
    return this._getFlashCards().filter(card => deckIds.has(card.deckId)).length;
  },

  _ensureFlashDeck(kind, target, decks) {
    if (!target) return null;
    const cId = sessionStorage.getItem('ct_concurso_ativo') || target.concursoId;
    const now = new Date().toISOString();
    let parentId = null;
    let materiaId = target.materiaId || (kind === 'materia' ? target.id : null);
    let topicoId = target.topicoId || (kind === 'topico' ? target.id : null);
    let subtopicoId = kind === 'subtopico' ? target.id : null;

    if (kind === 'topico') {
      const materia = this.getMateria(target.materiaId);
      parentId = this._ensureFlashDeck('materia', materia, decks);
    } else if (kind === 'subtopico') {
      const topico = this.getTopico(target.topicoId);
      parentId = this._ensureFlashDeck('topico', topico, decks);
      topicoId = target.topicoId;
      materiaId = target.materiaId || (topico && topico.materiaId) || null;
    }

    let deck = decks.find(d => d.concursoId === cId && d.sourceType === kind && d.sourceId === target.id);
    if (deck) {
      deck.name = target.nome || deck.name;
      deck.parentId = parentId || null;
      deck.materiaId = materiaId || null;
      deck.topicoId = topicoId || null;
      deck.subtopicoId = subtopicoId || null;
      deck.updatedAt = now;
      return deck.id;
    }

    deck = {
      id: 'fcdeck_' + this._id(),
      concursoId: cId,
      name: target.nome || 'Flashcards',
      emoji: kind === 'materia' ? 'Books' : kind === 'topico' ? 'Stack' : 'Card',
      parentId: parentId || null,
      sourceType: kind,
      sourceId: target.id,
      materiaId: materiaId || null,
      topicoId: topicoId || null,
      subtopicoId: subtopicoId || null,
      order: target.ordem || 0,
      createdAt: now,
      updatedAt: now,
    };
    decks.push(deck);
    return deck.id;
  },

  _linkFlashDeck(target, kind, deckId, deckName) {
    if (!target || !deckId) return;
    const url = this._flashDeckUrl(deckId);
    const cadernos = Array.isArray(target.cadernos) ? target.cadernos.slice() : [];
    const exists = cadernos.some(item => String(item && item.rotulo || '').toUpperCase() === 'FLASH'
      && (item.deckId === deckId || item.url === url));
    if (!exists) {
      cadernos.push({
        id: 'fc_link_' + this._id(),
        rotulo: 'FLASH',
        nome: deckName || 'Flashcards',
        emoji: '🎴',
        url,
        deckId,
        createdAt: new Date().toISOString(),
      });
      target.cadernos = cadernos;
      if (kind === 'materia') this.saveMateria(target);
      else if (kind === 'topico') this.saveTopico(target);
      else this.saveSubtopico(target);
    }
  },

  _copyFlashcardsToDeck(sourceDeckIds, targetDeckId, targetConcursoId, cards) {
    const now = new Date().toISOString();
    const sourceSet = new Set(sourceDeckIds);
    const sourceCards = cards.filter(card => sourceSet.has(card.deckId));
    let copied = 0;

    sourceCards.forEach(card => {
      const originalId = card.originalFlashcardId || card.id;
      const exists = cards.some(existing => existing.deckId === targetDeckId
        && ((existing.originalFlashcardId || existing.id) === originalId));
      if (exists) return;

      const clone = {
        ...card,
        id: 'fc_' + this._id(),
        concursoId: targetConcursoId,
        deckId: targetDeckId,
        originalFlashcardId: originalId,
        copiedFromDeckId: card.deckId,
        srs: this._flashSrsInicial(),
        createdAt: now,
        updatedAt: now,
      };
      cards.push(clone);
      copied++;
    });

    return copied;
  },

  _copyFlashcardsBetweenTargets(sourceId, targetId, type) {
    const decks = this._getFlashDecks();
    const cards = this._getFlashCards();
    let source = null;
    let target = null;

    if (type === 'materia') {
      source = this.getMateria(sourceId);
      target = this.getMateria(targetId);
    } else if (type === 'topico') {
      source = this.getTopico(sourceId);
      target = this.getTopico(targetId);
    } else if (type === 'subtopico') {
      source = this.getSubtopico(sourceId);
      target = this.getSubtopico(targetId);
    }
    if (!source || !target) return { copied: 0, deckId: null };

    const sourceDecks = decks.filter(d => d.sourceType === type && d.sourceId === sourceId);
    if (!sourceDecks.length) return { copied: 0, deckId: null };

    const targetDeckId = this._ensureFlashDeck(type, target, decks);
    const targetConcursoId = sessionStorage.getItem('ct_concurso_ativo') || target.concursoId;
    const sourceDeckIds = this._collectFlashDeckDescendants(decks, sourceDecks.map(d => d.id));
    const copied = this._copyFlashcardsToDeck(sourceDeckIds, targetDeckId, targetConcursoId, cards);

    this._set('ct_flashcard_decks', decks);
    this._set('ct_flashcards', cards);
    this._linkFlashDeck(target, type, targetDeckId, sourceDecks[0].name || target.nome || 'Flashcards');
    return { copied, deckId: targetDeckId };
  },

  findMatches(name, currentConcursoId, type) {
    if (!name || name.length < 3) return [];

    const searchName = name.trim().toLowerCase();
    let candidates = [];

    const contests = this.getConcursos();
    const contestMap = {};
    contests.forEach(c => contestMap[c.id] = c.nome);

    if (type === 'materia') {
      const all = this._get('ct_materias');
      all.forEach(m => {
        if (m.concursoId !== currentConcursoId && m.nome.trim().toLowerCase() === searchName) {
          const flashcardsCount = this._hasFlashcardsFor('materia', m.id);
          if ((m.cadernos && m.cadernos.length > 0) || flashcardsCount > 0) {
            candidates.push({ ...m, flashcardsCount, contestName: contestMap[m.concursoId] || 'Outro Concurso' });
          }
        }
      });
    } else if (type === 'topico') {
      const all = this._get('ct_topicos');
      all.forEach(t => {
        if (t.concursoId !== currentConcursoId && t.nome.trim().toLowerCase() === searchName) {
          const flashcardsCount = this._hasFlashcardsFor('topico', t.id);
          if ((t.cadernos && t.cadernos.length > 0) || flashcardsCount > 0) {
            candidates.push({ ...t, flashcardsCount, contestName: contestMap[t.concursoId] || 'Outro Concurso' });
          }
        }
      });
    } else if (type === 'subtopico') {
      const all = this._get('ct_subtopicos');
      all.forEach(s => {
        if (s.concursoId !== currentConcursoId && s.nome.trim().toLowerCase() === searchName) {
          const flashcardsCount = this._hasFlashcardsFor('subtopico', s.id);
          if ((s.cadernos && s.cadernos.length > 0) || flashcardsCount > 0) {
            candidates.push({ ...s, flashcardsCount, contestName: contestMap[s.concursoId] || 'Outro Concurso' });
          }
        }
      });
    }

    return candidates;
  },

  importMaterials(targetId, sourceId, type) {
    let source;
    let flash = { copied: 0, deckId: null };
    if (type === 'materia') {
      source = this.getMateria(sourceId);
      const target = this.getMateria(targetId);
      if (source && target && source.cadernos) {
        target.cadernos = [...(target.cadernos || []), ...source.cadernos];
        this.saveMateria(target);
      }
      flash = this._copyFlashcardsBetweenTargets(sourceId, targetId, type);
    } else if (type === 'topico') {
      source = this.getTopico(sourceId);
      const target = this.getTopico(targetId);
      if (source && target && source.cadernos) {
        target.cadernos = [...(target.cadernos || []), ...source.cadernos];
        this.saveTopico(target);
      }
      flash = this._copyFlashcardsBetweenTargets(sourceId, targetId, type);
    } else if (type === 'subtopico') {
      source = this.getSubtopico(sourceId);
      const target = this.getSubtopico(targetId);
      if (source && target && source.cadernos) {
        target.cadernos = [...(target.cadernos || []), ...source.cadernos];
        this.saveSubtopico(target);
      }
      flash = this._copyFlashcardsBetweenTargets(sourceId, targetId, type);
    }
    return { ok: true, flashcardsCopiados: flash.copied || 0, deckId: flash.deckId || null };
  },

  // ESTATÍSTICAS GERAIS
  // ─────────────────────────────────────────

  estatisticasGerais(concursoIds) {
    // concursoIds: array de IDs a incluir. null = todos ativos com contarEstatisticas=true
    const concursos = this.getConcursos().filter(c =>
      concursoIds ? concursoIds.includes(c.id) : c.contarEstatisticas !== false
    );
    const ids = concursos.map(c => c.id);

    const todasMatsIdSet = new Set();
    ids.forEach(cid => {
      this.getMaterias(cid).forEach(m => todasMatsIdSet.add(m.id));
    });
    const matsArr = Array.from(todasMatsIdSet);

    const todasQuestoes = this.getQuestoes().filter(q => matsArr.includes(q.materiaId));
    const todasSessoes  = this.getSessoes().filter(s => matsArr.includes(s.materiaId));
    const todosTopicos  = this.getTopicos().filter(t => matsArr.includes(t.materiaId));
    const todosSimulados = this.getSimulados()
      .filter(s => ids.includes(s.concursoId))
      .map(s => ({ ...s, _pctCalculado: this.getSimuladoPct(s) }))
      .filter(s => s._pctCalculado != null);

    const stats = this.calcStats(todasQuestoes);
    const segundosTotais = this.totalSegundos(todasSessoes);
    const topicosEstudados = todosTopicos.filter(t => t.estudado).length;

    // Último simulado (mais recente)
    const ultimoSim = todosSimulados.sort((a,b) => b.criadoEm.localeCompare(a.criadoEm))[0];
    const mediaSimulados = todosSimulados.length > 0
      ? Math.round(todosSimulados.reduce((a,s) => a + s._pctCalculado, 0) / todosSimulados.length)
      : null;

    return {
      horasTotais: this.formatarTempo(segundosTotais),
      segundosTotais,
      questoesTotal: stats.resolvidas,
      taxaAcertos: stats.pct,
      topicosEstudados,
      totalTopicos: todosTopicos.length,
      ultimoSimulado: ultimoSim ? ultimoSim._pctCalculado : null,
      mediaSimulados,
      concursosAtivos: concursos.filter(c => !c.realizado).length,
      concursosRealizados: concursos.filter(c => c.realizado).length,
    };
  },

  // ─────────────────────────────────────────
  // BACKUP
  // ─────────────────────────────────────────

  // Auto-backup silencioso — chama API Python se disponível
  async _collectBackupLogos() {
    const logos = {};
    const concursos = this.getConcursos();

    for (const c of concursos) {
      if (!c || !c.id) continue;
      if (c.logoBase64) {
        logos[c.id] = c.logoBase64;
        continue;
      }
      if (window.pywebview && window.pywebview.api && c.logoPath) {
        try {
          const resp = await window.pywebview.api.get_logo_base64(c.id);
          if (resp && resp.ok && resp.base64) {
            logos[c.id] = `data:image/png;base64,${resp.base64}`;
          }
        } catch (e) {}
      }
    }

    return logos;
  },

  async autoBackup(options = {}) {
    const backup = await this._buildBackupPayload();
    const json = JSON.stringify(backup, null, 2);
    if (window.pywebview && window.pywebview.api) {
      return window.pywebview.api.salvar_backup(json, options.reason || 'salvo-manual').then(res => {
        if (res && res.ok) {
          this.setBackupNome(res.rotulo || 'Perfil Principal');
          this.markSavedState();
        }
        return res;
      });
    }
    return Promise.resolve({ ok: false });
  },

  async exportarBackup() {
    CT.toast('Salvando alterações do perfil atual...', '💾');
    const res = await this.autoBackup({ reason: 'salvo-manual' });
    if (res && res.ok) {
      CT.toast('Alterações salvas com backup de segurança!', '✅');
      return res;
    }
    if (res && !res.ok) {
      CT.toast('Erro ao salvar: ' + (res.motivo || 'desconhecido'), '❌');
    }
    return res;
  },

  async importarBackup(json, backupNome = 'Perfil Principal') {
    try {
      const data = typeof json === 'string' ? JSON.parse(json) : json;
      const logos = (data.logos && typeof data.logos === 'object') ? data.logos : {};
      const concursos = (data.concursos || []).map(c => {
        const logoBase64 = logos[c.id] || c.logoBase64 || null;
        return logoBase64 ? { ...c, logoBase64, logoPath: null } : c;
      });

      this._clearTrackStorage();
      this._set('ct_concursos',  concursos);
      this._set('ct_materias',   data.materias   || []);
      this._set('ct_topicos',    data.topicos    || []);
      this._set('ct_subtopicos', data.subtopicos || []);
      this._set('ct_sessoes',    data.sessoes    || []);
      this._set('ct_questoes',   data.questoes   || []);
      this._set('ct_simulados',  data.simulados  || []);
      this._set('ct_revisoes',   data.revisoes   || []);
      // Restore cronograma keys
      if (data.crono && typeof data.crono === 'object') {
        Object.keys(data.crono).forEach(k => {
          localStorage.setItem(k, data.crono[k]);
        });
      }
      if (window.pywebview && window.pywebview.api) {
        for (const concurso of concursos) {
          if (!concurso.id || !concurso.logoBase64) continue;
          try {
            const resp = await window.pywebview.api.salvar_logo(concurso.id, concurso.logoBase64);
            if (resp && resp.ok) concurso.logoPath = resp.path;
          } catch (e) {}
        }
        this._set('ct_concursos', concursos);
      }
      try {
        sessionStorage.removeItem('ct_concurso_ativo');
        sessionStorage.removeItem('ct_materia_ativa');
      } catch (e) {}
      this.setBackupNome(backupNome || 'Perfil Principal');
      if (!localStorage.getItem('ct_profile_genero')) this.setProfileGenero('masculino');
      this.markSavedState();
      return { ok: true };
    } catch(e) {
      return { ok: false, erro: e.message };
    }
  },

  limparTudo() {
    ['ct_concursos','ct_materias','ct_topicos','ct_subtopicos',
     'ct_sessoes','ct_questoes','ct_simulados','ct_revisoes']
    .forEach(k => localStorage.removeItem(k));

    const extras = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ct_')) {
        extras.push(key);
      }
    }
    extras.forEach(k => localStorage.removeItem(k));
    this.setBackupNome('');
  },

  // ─────────────────────────────────────────
  // SINGLE CONCURSO: EXPORT & IMPORT
  // ─────────────────────────────────────────

  importarConcurso(jsonStr) {
    try {
        const data = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
        if (!['concursotrack_single_export', 'track_concursos_single_export', 'track_concursos_template_export'].includes(data.type)) throw new Error('Formato de arquivo inválido.');

        const parseMaybe = (value, fallback) => {
          if (!value) return fallback;
          if (typeof value === 'string') {
            try { return JSON.parse(value); } catch (e) { return fallback; }
          }
          return value;
        };
        const sourceMaterias = Array.isArray(data.materias) ? data.materias : [];
        const sourceSimulados = Array.isArray(data.simulados) ? data.simulados : [];
        const materiaBySourceId = {};
        const materiaNameMap = {};
        const normalizeMateriaName = value => String(value || '').trim().toLowerCase();
        const isVirtualMateriaId = value => typeof value === 'string' && value.startsWith('v-');
        const remapMetricMap = sourceMap => {
          const targetMap = {};
          if (!sourceMap || typeof sourceMap !== 'object') return targetMap;
          Object.entries(sourceMap).forEach(([sourceId, value]) => {
            const remappedId = resolveImportedMateriaId({ sourceId });
            if (remappedId) targetMap[remappedId] = value;
          });
          return targetMap;
        };
        sourceMaterias.forEach(m => {
          if (m && m.id) materiaBySourceId[m.id] = m;
        });

        // 1. Salva o concurso
        const cData = data.concurso || {};
        const newCId = this._id();
        const materiaIdMap = {};
        const resolveImportedMateriaId = ({ sourceId, nome } = {}) => {
          if (isVirtualMateriaId(sourceId)) return sourceId;
          if (sourceId && materiaIdMap[sourceId]) return materiaIdMap[sourceId];
          const fallbackName = nome || (sourceId && materiaBySourceId[sourceId] ? materiaBySourceId[sourceId].nome : '');
          const normalizedName = normalizeMateriaName(fallbackName);
          if (normalizedName && materiaNameMap[normalizedName]) return materiaNameMap[normalizedName];
          return '';
        };
        const novoConcurso = {
            id: newCId,
            criadoEm: this._today(),
            nome: cData.nome || 'Novo Concurso',
            cargo: cData.cargo || '',
            salario: cData.salario || '',
            banca: cData.banca || '',
            logoBase64: cData.logoBase64 || null,
            logoEmoji: cData.logoEmoji || null,
            logoPath: null,
            dataProva: cData.dataProva || null,
            localProva: cData.localProva || '',
            linkEdital: cData.linkEdital || '',
            preEdital: !!cData.preEdital,
            pontuacaoMax: cData.pontuacaoMax ?? null,
            vagas: cData.vagas ?? null,
            realizado: false,
            contarEstatisticas: true,
            resultado: null,
            colocacao: null,
            totalCand: null,
            certas: null,
            erradas: null,
            branco: null,
            pontuacao: null,
            notaCorte: null,
            redacao: null,
            obs: cData.obs || '',
            coberto: 0,
            cobertoPre: 0,
            nomeado: { ativo: false },
            _esperandoReset: false
        };
        const listC = this.getConcursos();
        listC.push(novoConcurso);
        this._set('ct_concursos', listC);

        // 2. Importa Matérias, Tópicos e Subtópicos em cascata
        sourceMaterias.forEach(m => {
            const oldMId = m.id;
            const newMId = this._id();
            if (oldMId) materiaIdMap[oldMId] = newMId;
            const normalizedName = normalizeMateriaName(m.nome);
            if (normalizedName) materiaNameMap[normalizedName] = newMId;
            const { topicos, ...mData } = m;
            this.saveMateria({ ...mData, id: newMId, concursoId: newCId });

            (topicos || []).forEach(t => {
                const newTId = this._id();
                const { subtopicos, estudado, estudadoEm, revisaoData, logEstudo, _esperandoReset, ...tData } = t;
                // Força reset de estudos na importação
                this.saveTopico({
                    ...tData,
                    id: newTId,
                    materiaId: newMId,
                    concursoId: newCId,
                    estudado: false,
                    estudadoEm: null,
                    revisaoData: null,
                    _esperandoReset: false
                });

                (subtopicos || []).forEach(s => {
                    const newSId = this._id();
                    const listS = this._get('ct_subtopicos') || [];
                    const { estudado, estudadoEm, ...sData } = s;
                    listS.push({ ...sData, id: newSId, topicoId: newTId, materiaId: newMId, concursoId: newCId, estudado: false, estudadoEm: null });
                    this._set('ct_subtopicos', listS);
                });
            });
        });

        // 3. Estruturas auxiliares do concurso
        const estrutura = data.estrutura || data.crono || {};
        if (estrutura.cronoWeekly) {
            localStorage.setItem(`ct_crono_${newCId}`, typeof estrutura.cronoWeekly === 'string'
              ? estrutura.cronoWeekly
              : JSON.stringify(estrutura.cronoWeekly));
        }

        const cronoMats = parseMaybe(estrutura.cronoMats || estrutura.mats, []);
        if (Array.isArray(cronoMats) && cronoMats.length) {
            const remappedMats = cronoMats.map(item => ({
              ...item,
              materiaId: resolveImportedMateriaId({ sourceId: item.materiaId, nome: item.nome })
            }));
            localStorage.setItem(`ct_crono_mats_${newCId}`, JSON.stringify(remappedMats));

            const sugestoes = {};
            remappedMats.forEach(item => {
              if (item && item.nome && item.cor) sugestoes[item.nome] = item.cor;
            });
            localStorage.setItem(`ct_crono_sugestoes_${newCId}`, JSON.stringify(sugestoes));
        }

        if (estrutura.cronoMode) {
            localStorage.setItem(`ct_crono_modo_${newCId}`, estrutura.cronoMode);
        }

        const ciclo = parseMaybe(estrutura.ciclo, null);
        if (ciclo && Array.isArray(ciclo.entries)) {
            const entries = ciclo.entries.map(entry => ({
              ...entry,
              materiaId: resolveImportedMateriaId({ sourceId: entry.materiaId, nome: entry.nome }),
              remainingSeconds: Math.max(0, parseInt(entry.targetSeconds, 10) || 0),
              status: 'pending',
              skippedSeconds: 0,
              lastPendingSeconds: 0,
              updatedAt: ''
            }));
            const firstPendingIdx = entries.findIndex(entry => (parseInt(entry.targetSeconds, 10) || 0) > 0);
            localStorage.setItem(`ct_ciclo_${newCId}`, JSON.stringify({
              round: 1,
              currentIndex: firstPendingIdx >= 0 ? firstPendingIdx : 0,
              currentItemId: firstPendingIdx >= 0 ? entries[firstPendingIdx].id : '',
              sessionHistory: [],
              entries
            }));
        }

        const configProva = parseMaybe(estrutura.configProva, null);
        if (configProva && Array.isArray(configProva.groups)) {
            const grupos = configProva.groups.map(group => {
              if (!Array.isArray(group.items)) return group;
              const items = group.items
                .map(item => {
                  const remappedId = resolveImportedMateriaId({ sourceId: item.id });
                  return remappedId ? { ...item, id: remappedId } : null;
                })
                .filter(Boolean);
              return { ...group, items };
            });
            localStorage.setItem(`ct_config_prova_${newCId}`, JSON.stringify({ ...configProva, groups: grupos }));
        }

        // 4. Simulados do template
        if (sourceSimulados.length) {
            const simuladosImportados = this.getSimulados();
            sourceSimulados.forEach(sourceSim => {
              const sim = { ...sourceSim };
              sim.id = this._id();
              sim.concursoId = newCId;
              sim.criadoEm = sim.criadoEm || this._today();

              if (sim.notasMaterias && typeof sim.notasMaterias === 'object') {
                sim.notasMaterias = remapMetricMap(sim.notasMaterias);
              }

              if (sim.desempenhoPainel && typeof sim.desempenhoPainel === 'object') {
                const snap = { ...sim.desempenhoPainel };
                if (Array.isArray(snap.items)) {
                  snap.items = snap.items.map(item => {
                    const remappedId = resolveImportedMateriaId({ sourceId: item.materiaId, nome: item.nome });
                    return remappedId ? { ...item, materiaId: remappedId } : item;
                  });
                }
                if (Array.isArray(snap.materias)) {
                  snap.materias = snap.materias.map(item => {
                    const remappedId = resolveImportedMateriaId({ sourceId: item.materiaId, nome: item.nome });
                    return remappedId ? { ...item, materiaId: remappedId } : item;
                  });
                }
                snap.notasMaterias = remapMetricMap(snap.notasMaterias);
                sim.desempenhoPainel = snap;
              }

              simuladosImportados.push(sim);
            });
            this._set('ct_simulados', simuladosImportados);
        }

        // 5. Logo se houver Base64
        if (novoConcurso.logoBase64 && window.pywebview && window.pywebview.api) {
            window.pywebview.api.salvar_logo(newCId, novoConcurso.logoBase64).then(res => {
                if (res && res.ok) {
                    const list = this.getConcursos();
                    const idx = list.findIndex(x => x.id === newCId);
                    if (idx >= 0) {
                        list[idx].logoPath = res.path;
                        this._set('ct_concursos', list);
                    }
                }
            });
        }

        return { ok: true, id: newCId };
    } catch(e) {
        return { ok: false, erro: e.message };
    }
  },

  fusionarConcursos(origemId, destinoId) {
    if (!origemId || !destinoId || origemId === destinoId) return { ok: false, erro: 'IDs inválidos para fusão.' };

    const cOrigem = this.getConcurso(origemId);
    const cDestino = this.getConcurso(destinoId);
    if (cOrigem && cDestino) {
        cDestino.cobertoPre = (cDestino.cobertoPre || 0) + (cOrigem.coberto || 0);
        cDestino.origemPreNome = cOrigem.nome;
        this.saveConcurso(cDestino);
    }

    const sAll = this._get('ct_sessoes') || [];
    let countS = 0;
    sAll.forEach(s => {
      if (s.concursoId === origemId) {
        s.concursoId = destinoId;
        countS++;
      }
    });
    this._set('ct_sessoes', sAll);

    const qAll = this._get('ct_questoes') || [];
    let countQ = 0;
    qAll.forEach(q => {
      if (q.concursoId === origemId) {
        q.concursoId = destinoId;
        countQ++;
      }
    });
    this._set('ct_questoes', qAll);

    this.getMaterias(origemId).forEach(m => {
      this.vincularMateria(m.id, destinoId);
    });

    // ─────────────────────────────────────────
    // PRESERVAR E MESCLAR MÉTRICAS DO CICLO
    // ─────────────────────────────────────────
    
    let statsOrigem = [];
    let statsDestino = [];
    try { statsOrigem = JSON.parse(localStorage.getItem('ct_ciclo_stats_' + origemId) || '[]'); } catch(e){}
    try { statsDestino = JSON.parse(localStorage.getItem('ct_ciclo_stats_' + destinoId) || '[]'); } catch(e){}
    if (statsOrigem.length > 0) {
      statsOrigem.forEach(s => s.concursoId = destinoId);
      const statsFundido = statsDestino.concat(statsOrigem);
      localStorage.setItem('ct_ciclo_stats_' + destinoId, JSON.stringify(statsFundido));
    }

    let matsOrigem = [];
    let matsDestino = [];
    try { matsOrigem = JSON.parse(localStorage.getItem('ct_crono_mats_' + origemId) || '[]'); } catch(e){}
    try { matsDestino = JSON.parse(localStorage.getItem('ct_crono_mats_' + destinoId) || '[]'); } catch(e){}
    if (matsOrigem.length > 0) {
      matsOrigem.forEach(m => {
        const alvo = (m.nome || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
        const jaExiste = matsDestino.some(md => {
          const mAlvo = (md.nome || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
          return mAlvo === alvo;
        });
        if (!jaExiste) matsDestino.push(m);
      });
      localStorage.setItem('ct_crono_mats_' + destinoId, JSON.stringify(matsDestino));
    }
    
    let cicloDestino = null;
    try { cicloDestino = JSON.parse(localStorage.getItem('ct_ciclo_' + destinoId) || 'null'); } catch(e){}
    if (!cicloDestino || !cicloDestino.entries || cicloDestino.entries.length === 0) {
      let cicloOrigem = null;
      try { cicloOrigem = JSON.parse(localStorage.getItem('ct_ciclo_' + origemId) || 'null'); } catch(e){}
      if (cicloOrigem) {
        localStorage.setItem('ct_ciclo_' + destinoId, JSON.stringify(cicloOrigem));
      }
    }

    // Remove concurso de origem (Isso limpa chaves auxiliares também)
    this.deleteConcurso(origemId);

    return { ok: true, sessoes: countS, questoes: countQ };
  },

  // ─────────────────────────────────────────
  // ARQUIVAMENTO DE MÉTRICAS SEMANAIS
  // ─────────────────────────────────────────

  archiveWeeklyMetrics(weekKey) {
    if (!weekKey) return;
    const historyKey = 'ct_history_weeks';
    const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
    
    // Evita duplicados para a mesma semana
    if (history.some(h => h.weekKey === weekKey)) return;

    const stats = this.estatisticasGerais();
    const markers = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('ct_cest_')) {
        markers[k] = localStorage.getItem(k);
      }
    }

    history.push({
      weekKey: weekKey,
      dataArquivo: new Date().toISOString(),
      stats: stats,
      markers: markers
    });

    // Mantém apenas os últimos 52 registros (1 ano) para não estourar o LocalStorage
    if (history.length > 52) history.shift();

    this._set(historyKey, history);
    console.log(`[CT] Métricas da semana ${weekKey} arquivadas com sucesso.`);
  },

};

// Disponibiliza globalmente
window.CT = CT;

let _ctSavedStateSignature = null;
let _ctDirty = false;
let _ctAutoSaveTimer = null;
let _ctAutoSaveBusy = false;
let _ctQueuedAutoSaveTimer = null;
let _ctQueuedAutoSavePending = false;

const _ctOriginalSetItem = localStorage.setItem.bind(localStorage);
const _ctOriginalRemoveItem = localStorage.removeItem.bind(localStorage);

localStorage.setItem = function(key, value) {
  _ctOriginalSetItem(key, value);
  if (typeof key === 'string' && key.startsWith('ct_') && key !== 'ct_backup_nome' && key !== 'ct_profile_genero') {
    _ctDirty = true;
  }
};

localStorage.removeItem = function(key) {
  _ctOriginalRemoveItem(key);
  if (typeof key === 'string' && key.startsWith('ct_') && key !== 'ct_backup_nome' && key !== 'ct_profile_genero') {
    _ctDirty = true;
  }
};

function _ctRelevantStorageKeys() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (!key.startsWith('ct_')) continue;
    if (key === 'ct_backup_nome' || key === 'ct_profile_genero') continue;
    keys.push(key);
  }
  keys.sort();
  return keys;
}

CT._buildStateSignature = function() {
  const payload = {};
  _ctRelevantStorageKeys().forEach(key => {
    payload[key] = localStorage.getItem(key);
  });
  return JSON.stringify(payload);
};

CT.markSavedState = function() {
  _ctSavedStateSignature = this._buildStateSignature();
  _ctDirty = false;
};

CT.hasUnsavedChanges = function() {
  if (_ctSavedStateSignature === null) return false;
  return _ctDirty || this._buildStateSignature() !== _ctSavedStateSignature;
};

CT.queueAutoSave = function(reason = 'autosave', options = {}) {
  if (!window.pywebview || !window.pywebview.api) return false;
  const delay = Math.max(0, Number(options.delay ?? 1200) || 0);
  const showToast = options.toast === true;

  if (_ctQueuedAutoSaveTimer) window.clearTimeout(_ctQueuedAutoSaveTimer);
  _ctQueuedAutoSaveTimer = window.setTimeout(() => {
    _ctQueuedAutoSaveTimer = null;
    if (_ctAutoSaveBusy) {
      _ctQueuedAutoSavePending = true;
      return;
    }
    if (!this.hasUnsavedChanges()) return;
    _ctAutoSaveBusy = true;
    if (showToast) CT.toast('Salvando...', '💾');
    this.autoBackup({ reason })
      .then(res => {
        if (!showToast) return res;
        if (res && res.ok) {
          CT.toast('Salvo com sucesso!', '✅');
        } else {
          CT.toast('Erro ao salvar backup.', '❌');
        }
        return res;
      })
      .catch(() => {
        if (showToast) CT.toast('Erro ao salvar backup.', '❌');
        return null;
      })
      .finally(() => {
        _ctAutoSaveBusy = false;
        if (_ctQueuedAutoSavePending) {
          _ctQueuedAutoSavePending = false;
          this.queueAutoSave(reason, { delay: 500, toast: showToast });
        }
      });
  }, delay);
  return true;
};

CT.startAutoSave = function() {
  if (_ctAutoSaveTimer) return true;
  if (!window.pywebview || !window.pywebview.api) return false;

  _ctAutoSaveTimer = window.setInterval(() => {
    if (!this.hasUnsavedChanges()) return;
    this.queueAutoSave('autosave', { delay: 0 });
  }, 5 * 60 * 1000);
  return true;
};

// Atalho global Ctrl+S — salva backup real em disco
document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
    e.preventDefault();
    CT.toast('Salvando...', '💾');
    CT.autoBackup({ reason: 'salvo-manual' }).then(res => {
      if (res && res.ok) {
        CT.toast('Salvo com sucesso!', '✅');
      } else {
        CT.toast('Erro ao salvar backup.', '❌');
      }
    }).catch(() => {
      CT.toast('Erro ao salvar backup.', '❌');
    });
  }
});

// ─────────────────────────────────────────────────────────────
// DIÁLOGO DE FECHAMENTO (chamado pelo Python ao fechar janela)
// ─────────────────────────────────────────────────────────────
window.mostrarDialogFechamento = function() {
  if (window.CT && typeof CT.hasUnsavedChanges === 'function' && !CT.hasUnsavedChanges()) {
    window.pywebview.api.fecharApp();
    return;
  }
  // Remove instância anterior se existir
  const antigo = document.getElementById('ct-dialog-fechamento');
  if (antigo) antigo.remove();

  const overlay = document.createElement('div');
  overlay.id = 'ct-dialog-fechamento';
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:99999',
    'background:rgba(0,0,0,0.75)', 'backdrop-filter:blur(6px)',
    'display:flex', 'align-items:center', 'justify-content:center',
    'font-family:var(--sans,"Inter",sans-serif)',
    'animation:ctFadeIn 0.2s ease',
  ].join(';');

  overlay.innerHTML = `
    <style>
      @keyframes ctFadeIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
      #ct-dialog-fechamento .ct-df-card {
        background: var(--bg2, #181c2a);
        border: 1px solid rgba(255,255,255,0.08);
        border-top: 3px solid #f87171;
        border-radius: 14px;
        padding: 36px 40px;
        width: 420px;
        max-width: 94vw;
        box-shadow: 0 24px 60px rgba(0,0,0,0.7);
        animation: ctFadeIn 0.25s cubic-bezier(0.175,0.885,0.32,1.275);
        text-align: center;
      }
      #ct-dialog-fechamento .ct-df-icon { font-size: 48px; margin-bottom: 12px; }
      #ct-dialog-fechamento h2 {
        color: var(--text, #e8eaf2);
        font-size: 18px;
        font-weight: 700;
        margin: 0 0 8px;
      }
      #ct-dialog-fechamento p {
        color: var(--text2, #9ea3b8);
        font-size: 13px;
        margin: 0 0 28px;
        line-height: 1.6;
      }
      #ct-dialog-fechamento .ct-df-btns {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      #ct-dialog-fechamento button {
        width: 100%;
        padding: 12px 20px;
        border-radius: 8px;
        border: none;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.15s, transform 0.15s;
        font-family: inherit;
      }
      #ct-dialog-fechamento button:hover { opacity: 0.88; transform: translateY(-1px); }
      #ct-dialog-fechamento button:active { transform: translateY(0); }
      #ct-df-btn-salvar  { background: linear-gradient(135deg,#4f8ef7,#7c5df7); color:#fff; }
      #ct-df-btn-sair    { background: rgba(248,113,113,0.15); color:#f87171; border:1px solid rgba(248,113,113,0.3) !important; }
      #ct-df-btn-cancelar{ background: rgba(255,255,255,0.05); color:var(--text2,#9ea3b8); border:1px solid rgba(255,255,255,0.08) !important; }
    </style>
    <div class="ct-df-card">
      <div class="ct-df-icon">⚠️</div>
      <h2>Deseja salvar antes de sair?</h2>
      <p>Suas alterações desta sessão ainda não foram salvas no arquivo de backup.<br>Recomendamos salvar para não perder nenhum dado.</p>
      <div class="ct-df-btns">
        <button id="ct-df-btn-salvar">💾 Salvar e Fechar</button>
        <button id="ct-df-btn-sair">🚪 Fechar sem Salvar</button>
        <button id="ct-df-btn-cancelar">✖ Cancelar</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Salvar e Fechar
  document.getElementById('ct-df-btn-salvar').addEventListener('click', () => {
    const btn = document.getElementById('ct-df-btn-salvar');
    btn.textContent = 'Salvando...';
    btn.disabled = true;
    CT.autoBackup({ reason: 'fechamento' }).then(res => {
      if (res && res.ok) {
        CT.toast('Salvo! Encerrando...', '✅');
        setTimeout(() => window.pywebview.api.fecharApp(), 600);
      } else {
        btn.textContent = '❌ Falha ao salvar. Tentar novamente?';
        btn.disabled = false;
      }
    }).catch(() => {
      btn.textContent = '❌ Falha ao salvar. Tentar novamente?';
      btn.disabled = false;
    });
  });

  // Fechar sem salvar
  document.getElementById('ct-df-btn-sair').addEventListener('click', () => {
    window.pywebview.api.fecharApp();
  });

  // Cancelar
  document.getElementById('ct-df-btn-cancelar').addEventListener('click', () => {
    overlay.remove();
  });
};

// Executa limpeza automática ao carregar
CT.installAlertOverride();
CT.limparLixo();
CT.markSavedState();
if (typeof window.addEventListener === 'function') {
  window.addEventListener('pywebviewready', () => {
    CT.startAutoSave();
  });
}
CT.startAutoSave();

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

  // ─────────────────────────────────────────
  // UTILS
  // ─────────────────────────────────────────

  _get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  },

  _set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
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
    this._set('ct_revisoes', this.getRevisoes().filter(r => topicosAtivos.has(r.topicoId)));
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
    const all = this._get('ct_materias');
    return concursoId ? all.filter(m => m.concursoId === concursoId || (m.concursosB && m.concursosB.includes(concursoId))) : all;
  },

  getMateria(id) {
    return this._get('ct_materias').find(m => m.id === id) || null;
  },

  saveMateria(data) {
    const list = this._get('ct_materias');
    const isCollidable = data.id && data.id.startsWith('mat_');
    const idx = list.findIndex(m => m.id === data.id);

    if (idx >= 0 && isCollidable && list[idx].concursoId !== data.concursoId) {
      list.push({ ...data, id: this._id() });
    } else if (idx >= 0) {
      list[idx] = { ...list[idx], ...data };
    } else {
      list.push({ id: this._id(), ...data });
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
        this._set('ct_revisoes', this.getRevisoes().filter(r => !topIds.includes(r.topicoId)));
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
    list.push({ id: this._id(), data: this._today(), horaInicio: new Date().toISOString(), ...dados });
    this._set('ct_questoes', list);
  },

  excluirLancamentoQuestoes(id) {
    if (!id) return false;
    const list = this._get('ct_questoes');
    const next = list.filter(q => q.id !== id);
    if (next.length === list.length) return false;
    this._set('ct_questoes', next);
    return true;
  },

  desfazerUltimoLancamento(filtro) {
    const list = this._get('ct_questoes');
    // Encontra o último lançamento que bate com o filtro
    for (let i = list.length - 1; i >= 0; i--) {
      const q = list[i];
      const match =
        (!filtro.topicoId || q.topicoId === filtro.topicoId) &&
        (!filtro.subtopId || q.subtopId === filtro.subtopId);
      if (match) { list.splice(i, 1); break; }
    }
    this._set('ct_questoes', list);
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

  registrarSessao(dados) {
    // dados: { concursoId, materiaId, duracaoSegundos, origem? }
    const list = this._get('ct_sessoes');
    const novaSessao = { id: this._id(), data: this._today(), horaInicio: new Date().toISOString(), origem: 'manual', ...dados };
    list.push(novaSessao);
    this._set('ct_sessoes', list);
    return novaSessao.id;
  },

  excluirSessao(id) {
    if (!id) return false;
    const list = this._get('ct_sessoes');
    const next = list.filter(s => s.id !== id);
    if (next.length === list.length) return false;
    this._set('ct_sessoes', next);
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

  agendarRevisao(topicoId, data) {
    const list = this._get('ct_revisoes');
    // Marca revisões anteriores como concluídas/substituídas (preserva histórico)
    list.forEach(r => {
      if (r.topicoId === topicoId && !r.concluida) {
        r.concluida = true;
        r.substituida = true;
        r.substituidaEm = this._today();
      }
    });
    list.push({ id: this._id(), topicoId, data, concluida: false, agendadaEm: this._today() });
    this._set('ct_revisoes', list);
  },

  concluirRevisao(topicoId, proximaData) {
    const list = this._get('ct_revisoes');
    const idx = list.findIndex(r => r.topicoId === topicoId && !r.concluida);
    if (idx >= 0) list[idx].concluida = true;
    this._set('ct_revisoes', list);
    if (proximaData) this.agendarRevisao(topicoId, proximaData);
  },

  // Classifica revisões: atrasadas, hoje, futuras
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
  // SMART LINKING (Cross-Contest)
  // ─────────────────────────────────────────

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
          if (m.cadernos && m.cadernos.length > 0) {
            candidates.push({ ...m, contestName: contestMap[m.concursoId] || 'Outro Concurso' });
          }
        }
      });
    } else if (type === 'topico') {
      const all = this._get('ct_topicos');
      all.forEach(t => {
        if (t.concursoId !== currentConcursoId && t.nome.trim().toLowerCase() === searchName) {
          if (t.cadernos && t.cadernos.length > 0) {
            candidates.push({ ...t, contestName: contestMap[t.concursoId] || 'Outro Concurso' });
          }
        }
      });
    } else if (type === 'subtopico') {
      const all = this._get('ct_subtopicos');
      all.forEach(s => {
        if (s.concursoId !== currentConcursoId && s.nome.trim().toLowerCase() === searchName) {
          if (s.cadernos && s.cadernos.length > 0) {
            candidates.push({ ...s, contestName: contestMap[s.concursoId] || 'Outro Concurso' });
          }
        }
      });
    }

    return candidates;
  },

  importMaterials(targetId, sourceId, type) {
    let source;
    if (type === 'materia') {
      source = this.getMateria(sourceId);
      const target = this.getMateria(targetId);
      if (source && target && source.cadernos) {
        target.cadernos = [...(target.cadernos || []), ...source.cadernos];
        this.saveMateria(target);
      }
    } else if (type === 'topico') {
      source = this.getTopico(sourceId);
      const target = this.getTopico(targetId);
      if (source && target && source.cadernos) {
        target.cadernos = [...(target.cadernos || []), ...source.cadernos];
        this.saveTopico(target);
      }
    } else if (type === 'subtopico') {
      source = this.getSubtopicos().find(x => x.id === sourceId);
      const target = this.getSubtopicos().find(x => x.id === targetId);
      if (source && target && source.cadernos) {
        target.cadernos = [...(target.cadernos || []), ...source.cadernos];
        this.saveSubtopico(target);
      }
    }
  },

  // ─────────────────────────────────────────
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

  async exportarConcurso(id) {
    const c = this.getConcurso(id);
    if (!c) return;

    // Obter logo se existir no disco
    let logoData = c.logoBase64 || null;
    if (window.pywebview && window.pywebview.api) {
        try {
            const resp = await window.pywebview.api.get_logo_base64(id);
            if (resp && resp.ok) logoData = `data:image/png;base64,${resp.base64}`;
        } catch(e) {}
    }

    const materias = this.getMaterias(id).map(m => {
      const tAll = this.getTopicos(m.id).map(t => {
        const sAll = (this._get('ct_subtopicos') || []).filter(s => s.topicoId === t.id).map(s => {
            const { id, topicoId, concursoId, estudado, estudadoEm, ...sRest } = s;
            return sRest;
        });
            const { id, materiaId, concursoId, estudado, estudadoEm, revisaoData, logEstudo, _esperandoReset, ...tRest } = t;
            return { ...tRest, subtopicos: sAll };
        });
        const { id, concursoId, ...mRest } = m;
        return { id, ...mRest, topicos: tAll };
    });
    const simulados = this.getSimulados(id).map(sim => {
      const { id: simId, concursoId, ...simData } = sim;
      return { ...simData };
    });

    const concursoTemplate = {
      nome: c.nome || '',
      cargo: c.cargo || '',
      banca: c.banca || '',
      logoEmoji: c.logoEmoji || null,
      logoBase64: logoData,
      dataProva: c.dataProva || null,
      preEdital: !!c.preEdital,
      pontuacaoMax: c.pontuacaoMax ?? null,
      vagas: c.vagas ?? null,
    };

    const exportData = {
      type: 'track_concursos_template_export',
      version: '2.0',
      templateKind: 'contest',
      rights: {
        copyright: 'Copyright (c) 2026 Michel Araujo. Todos os direitos reservados.',
        licenseType: 'uso-pessoal-nao-comercial',
        allowPersonalUse: true,
        allowCommercialUse: false,
        allowModification: false,
        allowRedistribution: false,
        notice: 'Este arquivo foi gerado pelo Track Concursos para uso pessoal e nao comercial. Nao e permitida sua revenda, redistribuicao ou modificacao sem autorizacao previa do autor.'
      },
      concurso: concursoTemplate,
      materias: materias,
      simulados: simulados,
      estrutura: {
          cronoWeekly: localStorage.getItem(`ct_crono_${id}`),
          cronoMats: localStorage.getItem(`ct_crono_mats_${id}`),
          cronoMode: localStorage.getItem(`ct_crono_modo_${id}`),
          ciclo: localStorage.getItem(`ct_ciclo_${id}`),
          configProva: localStorage.getItem(`ct_config_prova_${id}`)
      }
    };

    if (window.pywebview && window.pywebview.api) {
        const jsonStr = JSON.stringify(exportData, null, 2);
        const fileName = ('template_' + (c.nome || 'concurso')).replace(/[^a-z0-9]/gi, '_').toLowerCase();
        window.pywebview.api.salvar_json_concurso(fileName, jsonStr).then(res => {
            if (res && res.ok) {
                alert('✅ Template do edital exportado com sucesso!\nSalvo em: ' + res.caminho);
            } else if (res && res.motivo !== 'cancelado') {
                alert('❌ Erro ao exportar template: ' + res.motivo);
            }
        });
    } else {
        const json = JSON.stringify(exportData, null, 2);
        const a = document.createElement('a');
        a.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(json));
        a.setAttribute('download', 'Track_Concursos_template_' + (c.nome||'concurso') + '.json');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
  },

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
            banca: cData.banca || '',
            logoBase64: cData.logoBase64 || null,
            logoEmoji: cData.logoEmoji || null,
            logoPath: null,
            dataProva: cData.dataProva || null,
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
            obs: '',
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
                    listS.push({ ...sData, id: newSId, topicoId: newTId, concursoId: newCId, estudado: false, estudadoEm: null });
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

CT.startAutoSave = function() {
  if (_ctAutoSaveTimer) return true;
  if (!window.pywebview || !window.pywebview.api) return false;

  _ctAutoSaveTimer = window.setInterval(() => {
    if (_ctAutoSaveBusy || !this.hasUnsavedChanges()) return;
    _ctAutoSaveBusy = true;
    this.autoBackup({ reason: 'autosave' })
      .catch(() => null)
      .finally(() => {
        _ctAutoSaveBusy = false;
      });
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
CT.limparLixo();
CT.markSavedState();
if (typeof window.addEventListener === 'function') {
  window.addEventListener('pywebviewready', () => {
    CT.startAutoSave();
  });
}
CT.startAutoSave();

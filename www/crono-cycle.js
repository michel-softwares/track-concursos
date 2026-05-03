
(function () {
  // Remove dash-only restriction to allow timer bridge on all pages

  var TIMER_KEY = 'ct_timer_state';
  function getTimerState() {
    try { return JSON.parse(sessionStorage.getItem(TIMER_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveTimerState(s) {
    sessionStorage.setItem(TIMER_KEY, JSON.stringify(s));
    // Trigger storage event for cross-tab sync if needed
    window.dispatchEvent(new Event('storage'));
  }

  function normName(nome) {
    return (nome || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
  }
  function sanitizeName(nome) {
    return (nome || '').toString().replace(/\s+/g, ' ').trim().slice(0, 80);
  }
  function escapeHtml(value) {
    return (value == null ? '' : String(value)).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }
  function abbreviateSubjectName(nome) {
    var n = sanitizeName(nome);
    // Common exam abbreviations
    n = n.replace(/\bDireito\b/gi, 'Dir.');
    n = n.replace(/\bConhecimentos\b/gi, 'Con.');
    n = n.replace(/\bAtualidades\b/gi, 'At.');
    n = n.replace(/\bAdministrativo\b/gi, 'Adm.');
    return n;
  }
  var NEUTRAL_CARD_COLOR = '#607d8b';
  var AUTO_COLOR_PALETTE = ['#f55a5a','#4f8ef7','#7c5cfc','#3ecf8e','#f5c842','#f5874a','#00bcd4','#e91e8c','#8bc34a','#ff9800','#9c27b0','#ff5722','#009688','#795548','#3f51b5','#cddc39','#03a9f4','#e91e63','#4caf50'];
  function isSpecialNeutralName(nome) {
    var normalized = normName(nome);
    return normalized === 'SIMULADO' || normalized === 'REVISAO' || normalized.indexOf('REVIS') === 0;
  }
  function toHexChannel(value) {
    return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');
  }
  function hslToHex(h, s, l) {
    var hue = ((h % 360) + 360) % 360;
    var sat = Math.max(0, Math.min(100, s)) / 100;
    var light = Math.max(0, Math.min(100, l)) / 100;
    var chroma = (1 - Math.abs((2 * light) - 1)) * sat;
    var x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
    var match = light - (chroma / 2);
    var red = 0;
    var green = 0;
    var blue = 0;

    if (hue < 60) {
      red = chroma; green = x;
    } else if (hue < 120) {
      red = x; green = chroma;
    } else if (hue < 180) {
      green = chroma; blue = x;
    } else if (hue < 240) {
      green = x; blue = chroma;
    } else if (hue < 300) {
      red = x; blue = chroma;
    } else {
      red = chroma; blue = x;
    }

    return '#' + toHexChannel((red + match) * 255) + toHexChannel((green + match) * 255) + toHexChannel((blue + match) * 255);
  }
  function getDistinctMateriaColor(index) {
    if (index < AUTO_COLOR_PALETTE.length) return AUTO_COLOR_PALETTE[index];
    return hslToHex((index * 137.508) % 360, 72, 58);
  }
  function getCid() {
    return window._cCid || window.cId || sessionStorage.getItem('ct_concurso_ativo') || '';
  }
  function getMateriasAtivas() {
    var cid = getCid();
    if (!cid || typeof CT === 'undefined' || typeof CT.getMaterias !== 'function') return [];
    try { return CT.getMaterias(cid) || []; } catch (e) { return []; }
  }
  function resolveMateriaId(nome) {
    var alvo = normName(nome);
    if (!alvo) return '';
    var materias = getMateriasAtivas();
    var exata = materias.find(function (m) { return normName(m.nome) === alvo; });
    if (exata) return exata.id;
    var aproximada = materias.find(function (m) {
      var atual = normName(m.nome);
      return atual.indexOf(alvo) >= 0 || alvo.indexOf(atual) >= 0;
    });
    return aproximada ? aproximada.id : '';
  }
  function isVirtualMateriaId(materiaId) {
    var id = (materiaId || '').toString();
    return !id || id.indexOf('v-') === 0;
  }
  function openMateriaTab(materiaId) {
    if (isVirtualMateriaId(materiaId)) return false;
    if (typeof window.abrirMateria === 'function') {
      window.abrirMateria(materiaId);
      return true;
    }
    sessionStorage.setItem('ct_materia_ativa', materiaId);
    window.location.href = 'aba_materia.html';
    return true;
  }
  function hydrateCronoMat(item, forceIdx) {
    if (!item) return null;
    var rawNome = typeof item === 'string' ? item : (item.nome || '');
    var nome = sanitizeName(rawNome).toUpperCase();
    if (!nome) return null;
    
    // Core Logic: Never overwrite a user color if provided
    var cor = (typeof item === 'object' && item.cor) ? item.cor : null;
    if (!cor) {
       if (isSpecialNeutralName(nome)) {
         cor = NEUTRAL_CARD_COLOR;
       } else {
         // More robust hashing to separate subjects with similar prefixes
         var h = 0;
         for (var i = 0; i < nome.length; i++) {
            h = (h << 5) - h + nome.charCodeAt(i);
            h |= 0; // Convert to 32bit int
         }
         // If no idx provided, use h to pick a palette index
         var pIdx = (typeof forceIdx === 'number') ? forceIdx : Math.abs(h);
         cor = getDistinctMateriaColor(pIdx);
       }
    }

    return {
      nome: nome,
      cor: cor,
      materiaId: (typeof item === 'object' && item.materiaId) ? item.materiaId : (resolveMateriaId(nome) || '')
    };
  }

  window._getCronoMats = function () {
    var raw = [];
    try { raw = JSON.parse(localStorage.getItem('ct_crono_mats_' + (getCid() || '')) || '[]'); } catch (e) { raw = []; }
    var mats = [];
    raw.forEach(function (item, idx) {
      var mat = hydrateCronoMat(item, idx); // Use idx as secondary seed only if hash collides? No, hydrate uses hash.
      if (!mat) return;
      if (!mats.some(function (m) { return normName(m.nome) === normName(mat.nome); })) mats.push(mat);
    });
    return mats;
  };
  window._saveCronoMats = function (mats) {
    var list = [];
    var seen = {};
    (mats || []).forEach(function (item, idx) {
      if (!item) return;
      var mat = hydrateCronoMat(item, idx);
      if (!mat || !mat.nome) return;
      
      var normalized = normName(mat.nome);
      if (normalized && !seen[normalized]) {
         seen[normalized] = true;
         list.push(mat);
      }
    });
    localStorage.setItem('ct_crono_mats_' + (getCid() || ''), JSON.stringify(list));
    // Suggestion cache
    var sug = {};
    list.forEach(function (m) { sug[m.nome] = m.cor; });
    localStorage.setItem('ct_crono_sugestoes_' + (getCid() || ''), JSON.stringify(sug));
    
    if (typeof window.renderCrono === 'function') window.renderCrono();
  };

  function cycleKey() { return 'ct_ciclo_' + (getCid() || ''); }
  function cycleStatsKey() { return 'ct_ciclo_stats_' + (getCid() || ''); }
  function cycleModeKey() { 
    var cid = getCid();
    return cid ? ('ct_crono_modo_' + cid) : 'ct_crono_modo_global'; 
  }
  function getViewMode() {
    var mode = localStorage.getItem(cycleModeKey());
    if (!mode && getCid()) mode = localStorage.getItem('ct_crono_modo_global');
    return mode === 'cycle' ? 'cycle' : 'weekly';
  }
  function setViewMode(mode) {
    var val = mode === 'cycle' ? 'cycle' : 'weekly';
    localStorage.setItem(cycleModeKey(), val);
    localStorage.setItem('ct_crono_modo_global', val); // Always keep a global fallback
  }
  function parseDurationInput(value) {
    var raw = (value || '').toString().trim().toLowerCase();
    if (!raw) return 0;
    raw = raw.replace(',', '.').replace(/\s+/g, '');
    if (/^\d+(\.\d+)?$/.test(raw)) return Math.max(0, Math.round(parseFloat(raw) * 3600));
    var hhmm = raw.match(/^(\d+):(\d{1,2})$/);
    if (hhmm) return (parseInt(hhmm[1], 10) * 3600) + (parseInt(hhmm[2], 10) * 60);
    var hm = raw.match(/^(\d+)h(?:(\d{1,2})m?)?$/);
    if (hm) return (parseInt(hm[1], 10) * 3600) + ((parseInt(hm[2] || '0', 10)) * 60);
    var onlyMin = raw.match(/^(\d{1,3})m(?:in)?$/);
    if (onlyMin) return parseInt(onlyMin[1], 10) * 60;
    return 0;
  }
  function formatDurationInput(segundos) {
    var total = Math.max(0, Math.floor(segundos || 0));
    var h = Math.floor(total / 3600);
    var m = Math.floor((total % 3600) / 60);
    if (h > 0) return h + 'h' + String(m).padStart(2, '0');
    return m > 0 ? m + 'min' : '';
  }
  function formatHMS(segundos) {
    var total = Math.max(0, Math.floor(segundos || 0));
    var h = Math.floor(total / 3600);
    var m = Math.floor((total % 3600) / 60);
    var s = total % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }
  function importFromContest() {
    var cid = getCid();
    if (!cid) return [];
    var materias = getMateriasAtivas();
    if (!materias || !materias.length) return [];
    
    var list = [];
    var seen = {};
    var nextColorIndex = 0;
    materias.forEach(function (m) {
      if (!m.nome) return;
      var abrName = abbreviateSubjectName(m.nome);
      var normalized = normName(abrName);
      if (!normalized || seen[normalized]) return;
      seen[normalized] = true;
      var hydrated = hydrateCronoMat({
         nome: abrName,
         cor: getDistinctMateriaColor(nextColorIndex++),
         materiaId: m.id
      });
      list.push(hydrated);
    });
    if (false) {
    
    // Always add special cards (SIMULADO and REVISÃO) at the end
    list.push(hydrateCronoMat({ nome: 'SIMULADO', cor: '#607d8b', materiaId: 'v-simulado' }));
    list.push(hydrateCronoMat({ nome: 'REVISÃO', cor: '#607d8b', materiaId: 'v-revisao' }));
    }
    list = list.filter(function (item) { return !isSpecialNeutralName(item && item.nome); });
    list.push(hydrateCronoMat({ nome: 'SIMULADO', cor: NEUTRAL_CARD_COLOR, materiaId: 'v-simulado' }));
    list.push(hydrateCronoMat({ nome: 'REVISAO', cor: NEUTRAL_CARD_COLOR, materiaId: 'v-revisao' }));

    window._saveCronoMats(list);
    return list;
  }
  function loadCycleRaw() {
    try { return JSON.parse(localStorage.getItem(cycleKey()) || '{}'); } catch (e) { return {}; }
  }
  function saveCycleRaw(raw) {
    var key = cycleKey();
    if (!key || key === 'ct_ciclo_') return;
    localStorage.setItem(key, JSON.stringify(raw || {}));
    window.dispatchEvent(new CustomEvent('ct-cycle-updated', { detail: { concursoId: getCid(), data: raw || {} } }));
  }
  function baseIdFromName(nome) {
    return 'base_' + normName(nome);
  }
  function getMatByBaseId(baseId) {
    return window._getCronoMats().find(function (mat) { return baseIdFromName(mat.nome) === baseId; }) || null;
  }
  function buildCycleEntry(baseId, prev) {
    var mat = getMatByBaseId(baseId);
    if (!mat) return null;
    var old = prev || {};
    var targetSeconds = Math.max(0, parseInt(old.targetSeconds, 10) || 0);
    var remainingSeconds = old.remainingSeconds == null ? targetSeconds : Math.max(0, parseInt(old.remainingSeconds, 10) || 0);
    if (remainingSeconds > targetSeconds) remainingSeconds = targetSeconds;
    var status = old.status === 'done' || old.status === 'skipped' ? old.status : 'pending';
    return {
      id: old.id || ('entry_' + Date.now() + '_' + Math.random().toString(16).slice(2, 7)),
      baseId: baseId,
      nome: mat.nome,
      cor: mat.cor,
      materiaId: mat.materiaId || old.materiaId || resolveMateriaId(mat.nome) || '',
      targetSeconds: targetSeconds,
      remainingSeconds: status === 'pending' ? remainingSeconds : 0,
      status: status,
      skippedSeconds: Math.max(0, parseInt(old.skippedSeconds, 10) || 0),
      lastPendingSeconds: Math.max(0, parseInt(old.lastPendingSeconds, 10) || 0),
      updatedAt: old.updatedAt || ''
    };
  }
  function saveCycle(data) {
    var raw = data || {};
    if (raw && raw.items && raw.items.length) {
      var current = raw.items[raw.currentIndex];
      raw.currentItemId = current && current.status === 'pending' && current.targetSeconds > 0 ? current.id : '';
    }
    saveCycleRaw({
      round: Math.max(1, parseInt(raw.round, 10) || 1),
      currentIndex: Math.max(0, parseInt(raw.currentIndex, 10) || 0),
      currentItemId: raw.currentItemId || '',
      sessionHistory: raw.sessionHistory || [],
      entries: (raw.items || []).map(function (item) {
        return {
          id: item.id,
          baseId: item.baseId || baseIdFromName(item.nome),
          materiaId: item.materiaId || '',
          targetSeconds: Math.max(0, parseInt(item.targetSeconds, 10) || 0),
          remainingSeconds: Math.max(0, parseInt(item.remainingSeconds, 10) || 0),
          status: item.status || 'pending',
          skippedSeconds: Math.max(0, parseInt(item.skippedSeconds, 10) || 0),
          lastPendingSeconds: Math.max(0, parseInt(item.lastPendingSeconds, 10) || 0),
          updatedAt: item.updatedAt || ''
        };
      })
    });
  }
  function logCycleStat(entry) {
    var key = cycleStatsKey();
    if (!key || key === 'ct_ciclo_stats_') return;
    var list = [];
    try { list = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { list = []; }
    list.push({ id: 'cycle_stat_' + Date.now() + '_' + Math.random().toString(16).slice(2, 7), data: CT._today(), criadoEm: new Date().toISOString(), concursoId: getCid(), ...entry });
    localStorage.setItem(key, JSON.stringify(list));
  }
  function resetCycle(data) {
    var round = Math.max(1, parseInt(data && data.round, 10) || 1);
    
    // Log finalização do ciclo anterior antes de subir o round
    logCycleStat({ 
      materiaNome: 'CICLO COMPLETO', 
      round: round, 
      origem: 'ciclo_reset', 
      concluida: true,
      dataFim: new Date().toISOString()
    });

    var nextRound = round + 1;
    var items = (data && data.items || []).map(function (item) {
      return { ...item, status: 'pending', remainingSeconds: Math.max(0, parseInt(item.targetSeconds, 10) || 0), skippedSeconds: 0, lastPendingSeconds: 0, updatedAt: new Date().toISOString() };
    });
    
    // Log início do novo ciclo
    logCycleStat({ 
      materiaNome: 'CICLO INICIADO', 
      round: nextRound, 
      origem: 'ciclo_start',
      dataInicio: new Date().toISOString()
    });

    return { round: nextRound, currentIndex: items.findIndex(function (item) { return item.targetSeconds > 0; }), items: items, sessionHistory: [] };
  }
  function restartCycle(data) {
    var next = resetCycle(data || getCycleData({ skipAutoRestart: true }));
    saveCycle(next);
    if (typeof window.renderCrono === 'function') window.renderCrono();
    return next;
  }
  function getCycleData(options) {
    var config = options || {};
    var saved = loadCycleRaw();
    if (!Array.isArray(saved.entries) && Array.isArray(saved.orderIds)) {
      saved.entries = [];
      saved.orderIds = [];
      saved.currentItemId = '';
      saved.currentIndex = 0;
      saveCycleRaw(saved);
    }
    var items = (saved.entries || []).map(function (entry) {
      return buildCycleEntry(entry.baseId || baseIdFromName(entry.nome || ''), entry);
    }).filter(Boolean);
    var data = { round: Math.max(1, parseInt(saved.round, 10) || 1), currentIndex: Math.max(0, parseInt(saved.currentIndex, 10) || 0), currentItemId: saved.currentItemId || '', items: items, sessionHistory: saved.sessionHistory || [] };
    if (!items.length) return data;
    if (data.currentItemId) {
      var currentById = items.findIndex(function (item) { return item.id === data.currentItemId; });
      if (currentById >= 0) data.currentIndex = currentById;
    }
    var pendingIndexes = items.map(function (item, idx) { return item.status === 'pending' && item.targetSeconds > 0 ? idx : -1; }).filter(function (idx) { return idx >= 0; });
    if (!pendingIndexes.length && items.some(function (item) { return item.targetSeconds > 0; })) {
      data.currentIndex = 0;
      data.currentItemId = '';
    } else if (!items[data.currentIndex] || items[data.currentIndex].status !== 'pending' || items[data.currentIndex].targetSeconds <= 0) data.currentIndex = pendingIndexes.length ? pendingIndexes[0] : 0;
    if (!config.skipPersist) saveCycle(data);
    return data;
  }
  function advanceCycle(data, fromIndex) {
    var nextIndex = -1;
    for (var i = fromIndex + 1; i < data.items.length; i++) if (data.items[i].status === 'pending' && data.items[i].targetSeconds > 0) { nextIndex = i; break; }
    if (nextIndex < 0) for (var j = 0; j < fromIndex; j++) if (data.items[j].status === 'pending' && data.items[j].targetSeconds > 0) { nextIndex = j; break; }
    data.currentIndex = nextIndex >= 0 ? nextIndex : fromIndex;
    data.currentItemId = nextIndex >= 0 && data.items[nextIndex] ? data.items[nextIndex].id : '';
    return data;
  }
  function formatCycleTime(segundos) {
    var s = Math.max(0, Math.floor(segundos || 0));
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    if (h > 0) return h + 'h' + String(m).padStart(2, '0');
    if (m > 0) return m + 'min';
    return s + 's';
  }
  function formatCycleClock(segundos) {
    var s = Math.max(0, Math.floor(segundos || 0));
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    return h + 'h' + String(m).padStart(2, '0');
  }
  function formatCycleDelta(segundos) {
    var value = Math.round(segundos || 0);
    var sign = value >= 0 ? '+' : '-';
    var abs = Math.abs(value);
    var h = Math.floor(abs / 3600);
    var m = Math.floor((abs % 3600) / 60);
    if (h > 0 && m > 0) return sign + h + 'h' + String(m).padStart(2, '0');
    if (h > 0) return sign + h + 'h';
    return sign + m + 'min';
  }
  function updateCycleHours(itemId, horas) {
    var data = getCycleData({ skipAutoRestart: true });

    var item = data.items.find(function (it) { return it.id === itemId; });
    if (!item) return data;
    var newTarget = Math.max(0, parseDurationInput(horas));
    var oldTarget = Math.max(0, parseInt(item.targetSeconds, 10) || 0);
    var studied = item.status === 'done' ? oldTarget : Math.max(0, oldTarget - (parseInt(item.remainingSeconds, 10) || 0));
    item.targetSeconds = newTarget;
    if (item.status === 'pending') item.remainingSeconds = Math.max(0, newTarget - studied);
    item.materiaId = item.materiaId || resolveMateriaId(item.nome) || '';
    if (item.status === 'pending' && item.remainingSeconds === 0 && newTarget > 0) item.status = 'done';
    saveCycle(data);
    return data;
  }
  function reactivateCycleItem(itemId) {
    var raw = loadCycleRaw();
    var entryIdx = (raw.entries || []).findIndex(function(e) { return e.id === itemId; });
    if (entryIdx >= 0) {
        var entry = raw.entries[entryIdx];
        entry.status = 'pending';
        entry.remainingSeconds = Math.max(0, parseInt(entry.targetSeconds, 10) || 0);
        entry.skippedSeconds = 0;
        entry.lastPendingSeconds = 0;
        
        var firstPendingIdx = raw.entries.findIndex(function(e) { return e.status === 'pending' && parseInt(e.targetSeconds, 10) > 0; });
        if (firstPendingIdx >= 0) {
            raw.currentIndex = firstPendingIdx;
            raw.currentItemId = raw.entries[firstPendingIdx].id;
        }

        saveCycleRaw(raw);
    }
  }
  function moveCycleItem(itemId, direction) {
    var mats = window._getCronoMats();
    var idx = mats.findIndex(function (m) { return 'ciclo_' + normName(m.nome) === itemId; });
    if (idx < 0) return;
    var next = idx + direction;
    if (next < 0 || next >= mats.length) return;
    var swap = mats[idx];
    mats[idx] = mats[next];
    mats[next] = swap;
    window._saveCronoMats(mats);
    var data = getCycleData({ skipPersist: true, skipAutoRestart: true });
    saveCycle(data);
  }
  function placeCycleItem(itemId, targetIndex) {
    var raw = loadCycleRaw();
    raw.entries = Array.isArray(raw.entries) ? raw.entries.slice() : [];
    var nextIndex = Math.max(0, Math.min(targetIndex, raw.entries.length));
    if (itemId.indexOf('entry_') === 0) {
      var fromIndex = raw.entries.findIndex(function (entry) { return entry.id === itemId; });
      if (fromIndex < 0) return;
      var moving = raw.entries.splice(fromIndex, 1)[0];
      if (fromIndex < nextIndex) nextIndex--;
      raw.entries.splice(nextIndex, 0, moving);
      raw.currentIndex = nextIndex;
      raw.currentItemId = moving.id;
      saveCycleRaw(raw);
      return;
    }
    var created = buildCycleEntry(itemId);
    if (!created) return;
    raw.entries.splice(nextIndex, 0, created);
    if (!raw.currentItemId) {
      raw.currentItemId = created.id;
      raw.currentIndex = nextIndex;
    }
    saveCycleRaw(raw);
  }
  function removeCycleItem(itemId) {
    var raw = loadCycleRaw();
    raw.entries = Array.isArray(raw.entries) ? raw.entries.filter(function (entry) { return entry.id !== itemId; }) : [];
    if (raw.currentItemId === itemId) raw.currentItemId = raw.entries[0] ? raw.entries[0].id : '';
    raw.currentIndex = Math.max(0, Math.min(parseInt(raw.currentIndex, 10) || 0, Math.max(raw.entries.length - 1, 0)));
    saveCycleRaw(raw);
  }
  function finalizeCycleItem(itemId) {
    var data = getCycleData({ skipAutoRestart: true });
    var index = data.items.findIndex(function (item) { return item.id === itemId; });
    if (index < 0) return data;
    var item = data.items[index];
    if (!item.targetSeconds) return data;
    if (item.status === 'done' && Math.max(0, parseInt(item.remainingSeconds, 10) || 0) === 0) return data;
    var pendingSeconds = Math.max(0, parseInt(item.remainingSeconds, 10) || 0);
    var studiedSeconds = Math.max(0, parseInt(item.targetSeconds, 10) || 0) - pendingSeconds;
    item.status = pendingSeconds === 0 ? 'done' : 'skipped';
    item.lastPendingSeconds = pendingSeconds;
    item.skippedSeconds = pendingSeconds;
    item.remainingSeconds = 0;
    item.updatedAt = new Date().toISOString();
    logCycleStat({ materiaId: item.materiaId || null, materiaNome: item.nome, targetSeconds: item.targetSeconds, studiedSeconds: studiedSeconds, skippedSeconds: pendingSeconds, concluida: pendingSeconds === 0, round: data.round, origem: pendingSeconds === 0 ? 'ciclo_completo' : 'ciclo_finalizado' });
    data = advanceCycle(data, index);
    saveCycle(data);
    if (typeof window.renderCrono === 'function') window.renderCrono();
    return data;
  }
  function syncCycleSession(payload) {
    if (!payload || !payload.itemId) return null;
    var data = getCycleData({ skipAutoRestart: true });
    if (payload.sessaoId && Array.isArray(data.sessionHistory) && data.sessionHistory.some(function (s) { return s.id === payload.sessaoId || s.sessaoId === payload.sessaoId; })) return data;
    var index = data.items.findIndex(function (item) { return item.id === payload.itemId; });
    if (index < 0) return null;
    var item = data.items[index];
    item.materiaId = payload.materiaId || item.materiaId || '';
    item.remainingSeconds = Math.max(0, parseInt(payload.remainingSeconds, 10) || 0);
    var studiedSecs = Math.max(0, parseInt(payload.studiedSeconds, 10) || 0);
    item.updatedAt = new Date().toISOString();
    data.currentIndex = index;
    
    if (studiedSecs > 0) {
      data.sessionHistory = data.sessionHistory || [];
      data.sessionHistory.push({
        id: payload.sessaoId || ('cyc_sess_' + Date.now() + '_' + Math.random().toString(16).slice(2, 7)),
        sessaoId: payload.sessaoId || null,
        itemId: item.id,
        nome: item.nome,
        duracao: studiedSecs,
        ts: Date.now()
      });
    }
    if (item.remainingSeconds === 0 && item.targetSeconds > 0) {
      item.status = 'done';
      item.lastPendingSeconds = 0;
      item.skippedSeconds = 0;
      logCycleStat({ materiaId: item.materiaId || null, materiaNome: item.nome, targetSeconds: item.targetSeconds, studiedSeconds: item.targetSeconds, skippedSeconds: 0, concluida: true, round: data.round, origem: 'ciclo_timer' });
      data = advanceCycle(data, index);
    } else item.status = 'pending';
    saveCycle(data);
    if (typeof window.renderCrono === 'function') window.renderCrono();
    return data;
  }

  window.CTCycle = {
    getData: function (options) { return getCycleData(options || {}); },
    handleTimerSave: function (payload) { return syncCycleSession(payload); },
    finalizeItem: function (itemId) { return finalizeCycleItem(itemId); },
    openTimerForItem: function (item) { openCycleTimer(item); },
    restart: function () { return restartCycle(getCycleData({ skipAutoRestart: true })); },
    refundCycleTime: function (itemId, sec, sessaoId) { return refundCycleTime(itemId, sec, sessaoId); }
  };
  var cycleTimer = {
    preset: null,
    pending: null,
    bound: false,
    autoStop: false
  };
  
  function refundCycleTime(itemId, secondsToRefund, sessaoId) {
    var data = getCycleData({ skipAutoRestart: true });
    
    if (sessaoId && Array.isArray(data.sessionHistory)) {
      data.sessionHistory = data.sessionHistory.filter(function(s) { return s.id !== sessaoId; });
    }
    
    var index = data.items.findIndex(function (item) { return item.id === itemId; });
    if (index < 0) return;
    
    var item = data.items[index];
    if (item.status === 'done') {
      item.status = 'pending';
      data.currentIndex = index;
    }
    
    var r = typeof item.remainingSeconds === 'number' ? item.remainingSeconds : item.targetSeconds;
    item.remainingSeconds = Math.min(item.targetSeconds, r + secondsToRefund);
    
    saveCycle(data);
    if (typeof window.renderCrono === 'function') window.renderCrono();
  }
  function ensureTimerNodes() {
    var panel = document.getElementById('timerPopup');
    if (!panel) return null;
    var hint = document.getElementById('tpCycleHint');
    if (!hint) {
      hint = document.createElement('div');
      hint.id = 'tpCycleHint';
      hint.style.cssText = 'display:none;margin-bottom:10px;padding:10px 12px;border-radius:10px;background:rgba(79,142,247,.12);border:1px solid rgba(79,142,247,.24);font-size:12px;color:var(--text2);line-height:1.45';
      var freePanel = document.getElementById('tpFreePanel');
      if (freePanel) freePanel.insertBefore(hint, freePanel.firstChild);
    }
    return {
      fab: document.getElementById('timerFab'),
      panel: panel,
      play: document.getElementById('tpBtnPlay'),
      stop: document.getElementById('tpBtnStop'),
      reset: document.getElementById('tpBtnReset'),
      close: document.getElementById('tpClose'),
      freeTime: document.getElementById('tpFreeTime'),
      freeStatus: document.getElementById('tpFreeStatus'),
      ring: document.getElementById('tpRingProg'),
      badge: document.getElementById('fabBadge'),
      tabFree: document.getElementById('tpTabFree'),
      matSelect: document.getElementById('tpMatSelect'),
      modalMat: document.getElementById('tpModalMateria'),
      modalSave: document.getElementById('tpBtnModalSave'),
      modalCancel: document.getElementById('tpBtnModalCancel'),
      hint: hint
    };
  }
  function setTimerLocked(locked) {
    var nodes = ensureTimerNodes();
    if (!nodes) return;
    if (nodes.matSelect) nodes.matSelect.disabled = !!locked;
    if (nodes.modalMat) nodes.modalMat.disabled = !!locked;
  }
  function clearCycleTimer() {
    var state = getTimerState();
    state.cyclePreset = null;
    saveTimerState(state);
    
    cycleTimer.preset = null;
    cycleTimer.pending = null;
    setTimerLocked(false);
    var nodes = ensureTimerNodes();
    if (nodes && nodes.hint) nodes.hint.style.display = 'none';
  }
  function syncCycleTimerUI() {
    var state = getTimerState();
    cycleTimer.preset = state.cyclePreset || null;
    
    var nodes = ensureTimerNodes();
    if (!nodes || !cycleTimer.preset) return;
    
    var studiedSeconds = Math.max(0, parseInt(state.freeSeconds, 10) || 0);
    var remainingSeconds = Math.max(0, cycleTimer.preset.startRemaining - studiedSeconds);
    cycleTimer.pending = { itemId: cycleTimer.preset.itemId, materiaId: cycleTimer.preset.materiaId || '', studiedSeconds: studiedSeconds, remainingSeconds: remainingSeconds };
    
    var isRevision = !!state.isRevisionCard;
    
    if (nodes.matSelect && cycleTimer.preset.materiaId && !nodes.matSelect.disabled) {
      if (!isRevision) {
        nodes.matSelect.value = cycleTimer.preset.materiaId;
        nodes.matSelect.disabled = true;
        nodes.matSelect.dispatchEvent(new Event('change'));
      }
    }
    if (nodes.modalMat && cycleTimer.preset.materiaId && !nodes.modalMat.disabled) {
      if (!isRevision) {
        nodes.modalMat.value = cycleTimer.preset.materiaId;
        nodes.modalMat.disabled = true;
        nodes.modalMat.dispatchEvent(new Event('change'));
      }
    }
    
    // UI feedback in the popup (handled by timer-popup.js, but we can add meta info)
    if (nodes.hint) {
      nodes.hint.style.display = '';
      nodes.hint.innerHTML = '<strong style="display:block;color:var(--text);margin-bottom:4px">Ciclo de estudos</strong>' + cycleTimer.preset.materiaNome + '<br>' + formatHMS(studiedSeconds) + ' estudado(s) de ' + formatHMS(cycleTimer.preset.startRemaining) + ' planejado(s)';
    }
    if (state.freeRunning && remainingSeconds <= 0 && !cycleTimer.autoStop) {
      cycleTimer.autoStop = true;
      setTimeout(function () {
        if (nodes.stop) nodes.stop.click();
        setTimeout(function () { cycleTimer.autoStop = false; }, 400);
      }, 0);
    }
  }
  function openCycleTimer(item) {
    console.log('[CycleTimer] openCycleTimer called for:', item.nome);

    // Step 1: Find the timer panel and fab directly in the DOM
    var panel = document.getElementById('timerPopup');
    var fab = document.getElementById('timerFab');

    if (!panel) return;
    if (!fab) return;

    // Step 2: Set up the cycle preset
    var materiaId = item.materiaId || resolveMateriaId(item.nome) || '';
    cycleTimer.preset = {
      itemId: item.id,
      materiaId: materiaId,
      materiaNome: item.nome,
      startRemaining: item.remainingSeconds || item.targetSeconds,
      targetSeconds: item.targetSeconds
    };
    cycleTimer.pending = null;

    // Step 3: Update shared timer state in sessionStorage
    var state = getTimerState();
    state.mode = 'free';
    state.open = true;
    state.minimized = false;
    state.freeRunning = false;
    state.freeSeconds = 0;
    state.lastTick = null;
    state.selectedMateria = materiaId || '';
    state.selectedTopic = '';
    state.selectedSubtopic = '';
    state.cyclePreset = cycleTimer.preset;
    
    // Special Logic for SIMULADO & REVISÃO
    var n = normName(item.nome);
    state.selectedTipo = 'Estudo'; // Default
    state.isRevisionCard = false;
    
    if (n === 'REVISAO') {
       state.selectedTipo = 'Revisão';
       state.isRevisionCard = true;
       state.selectedMateria = ''; // DON'T LOCK - let user choose
    } else if (n === 'SIMULADO') {
       state.selectedTipo = 'Simulado';
    }

    saveTimerState(state);

    // Step 4: Open the official popup flow when available, with direct DOM fallback.
    if (typeof window.setTimerMode === 'function') window.setTimerMode('free');
    if (typeof window.openTimerPopup === 'function') {
      window.openTimerPopup();
    } else {
      panel.style.display = 'block';
      panel.classList.remove('minimized');
      fab.style.display = 'flex';
    }

    // Step 5: Tell timer-popup.js to refresh its internal state from sessionStorage
    if (typeof window._refreshTimerState === 'function') {
      window._refreshTimerState();
    }

    // Step 6: Switch to Free mode tab
    var tabFree = document.getElementById('tpTabFree');
    var tabPomo = document.getElementById('tpTabPomo');
    var freePanel = document.getElementById('tpFreePanel');
    var pomoPanel = document.getElementById('tpPomoPanel');
    if (tabFree) { tabFree.classList.add('active'); }
    if (tabPomo) { tabPomo.classList.remove('active'); }
    if (freePanel) { freePanel.style.display = 'block'; }
    if (pomoPanel) { pomoPanel.style.display = 'none'; }

    // Step 7: Pre-select the materia in the dropdown
    var matSelect = document.getElementById('tpMatSelect');
    if (matSelect && materiaId) {
      matSelect.value = materiaId;
      matSelect.disabled = true;
      matSelect.dispatchEvent(new Event('change'));
    }
    var modalMat = document.getElementById('tpModalMateria');
    if (modalMat && materiaId) {
      modalMat.value = materiaId;
      modalMat.disabled = true;
    }

    console.log('[CycleTimer] Panel shown. Syncing UI...');
    syncCycleTimerUI();
  }
  function bindTimerBridge() {
    if (cycleTimer.bound) return;
    var nodes = ensureTimerNodes();
    if (!nodes || !nodes.play || !nodes.modalSave) {
      setTimeout(bindTimerBridge, 500);
      return;
    }
    cycleTimer.bound = true;
    nodes.play.addEventListener('click', function () { if (cycleTimer.preset) setTimeout(syncCycleTimerUI, 30); });
    nodes.stop.addEventListener('click', function () { if (cycleTimer.preset) setTimeout(syncCycleTimerUI, 30); });
    nodes.reset.addEventListener('click', function () {
      if (!cycleTimer.preset) return;
      setTimeout(function () {
        var state = getTimerState();
        state.freeRunning = false;
        state.freeSeconds = 0;
        state.lastTick = null;
        saveTimerState(state);
        syncCycleTimerUI();
      }, 0);
    });
    nodes.modalSave.addEventListener('click', function () {
      if (!cycleTimer.preset || !cycleTimer.pending) return;
      setTimeout(function () {
        clearCycleTimer();
      }, 0);
    });
    nodes.modalCancel.addEventListener('click', function () { if (cycleTimer.preset) setTimeout(clearCycleTimer, 0); });
    window.setInterval(syncCycleTimerUI, 250);
  }

  function ensureCronoStyles() {
    if (document.getElementById('cronoCycleStyles')) return;
    var style = document.createElement('style');
    style.id = 'cronoCycleStyles';
    style.textContent = ''
      + '.crono-flip-scene{position:relative;flex:1;min-height:0;perspective:1800px;}'
      + '.crono-flip-card{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .55s cubic-bezier(.22,.61,.36,1);}'
      + '.crono-flip-card.is-back{transform:rotateY(180deg);}'
      + '.crono-face{position:absolute;inset:0;display:flex;flex-direction:column;gap:16px;backface-visibility:hidden;-webkit-backface-visibility:hidden;}'
      + '.crono-face.back{transform:rotateY(180deg);}'
      + '.crono-scroll{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding-right:4px;}'
      + '.crono-scroll::-webkit-scrollbar{width:6px;}'
      + '.crono-scroll::-webkit-scrollbar-track{background:transparent;}'
      + '.crono-scroll::-webkit-scrollbar-thumb{background:var(--border2);border-radius:10px;}'
      + '.crono-scroll::-webkit-scrollbar-thumb:hover{background:var(--text3);}'
      + '.crono-chip-full{white-space:normal;line-height:1.2;max-width:100%;}'
      + '.crono-cycle-palette{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;padding:12px;border-radius:12px;background:var(--bg3);border:1px solid var(--border);}'
      + '.crono-cycle-chip{background:var(--cor);border-radius:8px;padding:7px 10px;font-size:12px;font-weight:700;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.8);cursor:pointer;display:flex;align-items:flex-start;gap:8px;user-select:none;max-width:100%;transition:transform .15s ease;text-transform:uppercase;}'
      + '.crono-cycle-chip:hover{transform:scale(1.02);box-shadow:0 4px 12px rgba(0,0,0,0.2);}'
      + '.crono-cycle-list{display:flex;flex-direction:column;gap:6px;}'
      + '.crono-cycle-card{position:relative;display:grid;grid-template-columns:22px minmax(0,1fr) 90px;gap:8px;align-items:center;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:4px 8px;transition:border-color .15s ease,box-shadow .15s ease;}'
      + '.crono-cycle-card.current{border-color:var(--accent);box-shadow:0 0 0 1px rgba(79,142,247,.18);}'
      + '.crono-cycle-card.done{border-color:rgba(62,207,142,.45);background:rgba(62,207,142,.07);}'
      + '.crono-cycle-card.skipped{border-color:rgba(245,200,66,.45);}'
      + '.crono-cycle-card.drag-over{border-color:var(--accent2);box-shadow:0 0 0 1px rgba(124,92,252,.24);}'
      + '.crono-cycle-slot{display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:999px;background:rgba(255,255,255,.05);font-size:9px;font-weight:700;color:var(--text2);}'
      + '.crono-cycle-left{min-width:0;}'
      + '.crono-cycle-name{font-size:11px;font-weight:700;color:var(--text);line-height:1.15;word-break:break-word;padding-right:12px;text-transform:uppercase;}'
      + '.crono-cycle-meta{font-size:10px;color:var(--text3);margin-top:2px;line-height:1.2;}'
      + '.crono-cycle-right{display:flex;justify-content:flex-end;}'
      + '.crono-cycle-right input{width:90px;background:var(--bg2);border:1px solid var(--border2);border-radius:4px;padding:2px 6px;color:var(--text);font-size:10px;font-family:var(--mono);outline:none;text-align:center;height:20px;}'
      + '.crono-cycle-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 6px;border-radius:999px;font-size:9px;font-weight:700;margin-top:4px;}'
      + '.crono-cycle-badge.current{background:rgba(79,142,247,.14);color:var(--accent);}'
      + '.crono-cycle-badge.done{background:rgba(62,207,142,.14);color:var(--green);}'
      + '.crono-cycle-badge.skipped{background:rgba(245,200,66,.14);color:var(--yellow);}'
      + '.crono-cycle-drop-end{padding:12px;border:1px dashed var(--border);border-radius:12px;text-align:center;font-size:11px;color:var(--text3);margin-top:2px;}'
      + '.crono-cycle-drop-end.drag-over{border-color:var(--accent2);color:var(--accent2);}'
      + '.crono-dash-row{display:flex;align-items:center;gap:10px;padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);margin-bottom:0;position:relative;z-index:2;box-shadow:0 1px 3px rgba(0,0,0,0.2);transition:transform .2s ease;}'
      + '.crono-dash-row:hover{transform:translateY(-1px);}'
      + '.crono-dash-row.current{border-color:var(--accent);box-shadow:0 0 0 1px rgba(79,142,247,.25);}'
      + '.crono-dash-row.done{border-color:rgba(62,207,142,.4);background:rgba(62,207,142,.08);}'
      + '.crono-dash-row.skipped{border-color:rgba(245,200,66,.35);}'
      + '.crono-dash-order{width:26px;height:26px;border-radius:999px;background:rgba(255,255,255,.06);text-shadow:0 1px 2px rgba(0,0,0,0.5);border:2px solid var(--bg3);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--text2);flex-shrink:0;z-index:3;}'
      + '.crono-dash-name{flex:1;min-width:0;font-size:13px;font-weight:700;color:var(--text);line-height:1.25;word-break:break-word;text-transform:uppercase;}'
      + '.crono-dash-time{border:none;border-radius:999px;padding:6px 12px;font-size:11px;font-weight:700;cursor:pointer;background:rgba(79,142,247,.14);color:var(--accent);flex-shrink:0;display:flex;align-items:center;gap:6px;transition:all .2s ease;}'
      + '.crono-dash-time:hover{background:var(--accent);color:#fff;}'
      + '.crono-dash-time.done{background:rgba(62,207,142,.16);color:#27a06b;}'
      + '.crono-dash-time.done:hover{background:var(--green);color:#fff;}'
      + '.crono-dash-empty{font-size:12px;color:var(--text3);text-align:center;padding:16px 8px;}'
      + '@media (max-width:680px){.crono-cycle-card{grid-template-columns:26px minmax(0,1fr);} .crono-cycle-right{grid-column:1 / -1;justify-content:stretch;} .crono-cycle-right input{width:100%;}}';
    document.head.appendChild(style);
  }
  function patchCronoGridNames() {
    var chips = document.querySelectorAll('#cronoGrid [title*="clique"]');
    chips.forEach(function (chip) {
      var fullName = (chip.title || '').split(' - ')[0].split(' — ')[0].trim();
      if (!fullName) return;
      var prefix = '';
      if ((chip.textContent || '').trim().startsWith('✓')) prefix = '✓ ';
      if ((chip.textContent || '').trim().startsWith('✗')) prefix = '✗ ';
      chip.textContent = prefix + fullName;
      chip.style.whiteSpace = 'normal';
      chip.style.textOverflow = 'clip';
      chip.style.lineHeight = '1.2';
      chip.style.padding = '4px 6px';
      chip.style.minHeight = '30px';
    });
  }
  function updateDashboardCardHeader() {
    var grid = document.getElementById('cronoGrid');
    if (!grid || !grid.parentElement) return;
    var header = grid.parentElement.querySelector('.card-header');
    if (!header) return;
    var title = header.querySelector('.card-title');
    var button = header.querySelector('button');
    var mode = getViewMode();
    if (title) title.innerHTML = mode === 'cycle' ? '🔄 Ciclo de estudos' : '📅 Cronograma semanal';
    if (button) button.textContent = mode === 'cycle' ? '✏️ Editar ciclo' : '✏️ Editar';
  }
  function renderCycleDashboard() {
    ensureCronoStyles();
    var grid = document.getElementById('cronoGrid');
    if (!grid) return;
    grid.innerHTML = '';
    var data = getCycleData();
    if (!data.items.length) {
      var empty = document.createElement('div');
      empty.className = 'crono-dash-empty';
empty.textContent = 'Monte as matérias e escolha o ciclo de estudos para organizar sua sequência.';
      grid.appendChild(empty);
      updateDashboardCardHeader();
      return;
    }
    var cycleComplete = data.items.some(function (item) { return item.targetSeconds > 0; })
      && !data.items.some(function (item) { return item.status === 'pending' && item.targetSeconds > 0; });
    var pathWrapper = document.createElement('div');
    pathWrapper.style.cssText = 'position:relative;margin:8px 0;padding-right:24px;';
    
    var leftLine = document.createElement('div');
    leftLine.style.cssText = 'position:absolute;top:20px;bottom:20px;left:24px;width:0;border-left:2px dashed var(--text3);pointer-events:none;opacity:0.6;z-index:1;';
    var leftHead = document.createElement('div');
    leftHead.style.cssText = 'position:absolute;bottom:-2px;left:-6px;width:10px;height:10px;border-bottom:2px solid var(--text3);border-right:2px solid var(--text3);transform:rotate(45deg);';
    leftLine.appendChild(leftHead);
    pathWrapper.appendChild(leftLine);
    
    var returnArrow = document.createElement('div');
    returnArrow.style.cssText = 'position:absolute;top:20px;bottom:20px;right:0;width:30px;border-top:2px dashed var(--text3);border-right:2px dashed var(--text3);border-bottom:2px dashed var(--text3);border-radius:0 16px 16px 0;pointer-events:none;opacity:0.6;';
    var returnHead = document.createElement('div');
    returnHead.style.cssText = 'position:absolute;top:-6px;right:12px;width:10px;height:10px;border-top:2px solid var(--text3);border-left:2px solid var(--text3);transform:rotate(-45deg);';
    var returnHeadOut = document.createElement('div');
    returnHeadOut.style.cssText = 'position:absolute;bottom:-6px;left:-2px;width:10px;height:10px;border-bottom:2px solid var(--text3);border-right:2px solid var(--text3);transform:rotate(-45deg);';
    returnArrow.appendChild(returnHead);
    returnArrow.appendChild(returnHeadOut);
    pathWrapper.appendChild(returnArrow);
    
    var itemsContainer = document.createElement('div');
    itemsContainer.style.cssText = 'position:relative;z-index:2;display:flex;flex-direction:column;gap:6px;';

    data.items.forEach(function (item, idx) {
      var row = document.createElement('div');
      row.className = 'crono-dash-row'
        + (idx === data.currentIndex && item.status === 'pending' && item.targetSeconds > 0 ? ' current' : '')
        + (item.status === 'done' ? ' done' : '')
        + (item.status === 'skipped' ? ' skipped' : '');
      
      var order = document.createElement('div');
      order.className = 'crono-dash-order';
      order.textContent = String(idx + 1).padStart(2, '0');
      
      var name = document.createElement('div');
      name.className = 'crono-dash-name';
      name.style.position = 'relative';
      name.style.zIndex = '4';
      if (!isVirtualMateriaId(item.materiaId)) {
        name.title = 'Abrir aba da matéria';
        name.style.cursor = 'pointer';
        name.style.textDecoration = 'none';
        name.tabIndex = 0;
        name.setAttribute('role', 'button');
        name.onclick = function (e) {
          if (e) { e.preventDefault(); e.stopPropagation(); }
          openMateriaTab(item.materiaId);
        };
        name.onkeydown = function (e) {
          if (!e) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openMateriaTab(item.materiaId);
          }
        };
      }
      name.textContent = (item.status === 'done' ? '✅ ' : '') + item.nome;
      
      var timeBtn = document.createElement('button');
      timeBtn.type = 'button';
      timeBtn.className = 'crono-dash-time' + (item.status === 'done' ? ' done' : '');
      timeBtn.style.position = 'relative';
      timeBtn.style.zIndex = '4';
      timeBtn.innerHTML = '<span style="font-size:12px;opacity:0.9">⏱️</span> ' + (item.targetSeconds ? formatCycleClock(item.status === 'pending' ? item.remainingSeconds || item.targetSeconds : 0) : 'Definir');
      timeBtn.title = item.targetSeconds ? 'Clique para abrir o cronometro dessa materia' : 'Defina as horas primeiro no ciclo de estudos';

      if (item.cor) {
        row.style.background = item.cor;
        row.style.borderColor = 'rgba(0,0,0,0.1)';
        
        name.style.color = '#fff';
        name.style.textShadow = '0 1px 2px rgba(0,0,0,0.8)';
        
        order.style.background = 'rgba(0,0,0,0.15)';
        order.style.color = '#fff';
        order.style.borderColor = 'rgba(255,255,255,0.2)';
        order.style.textShadow = '0 1px 2px rgba(0,0,0,0.5)';
        
        timeBtn.style.background = 'rgba(0,0,0,0.2)';
        timeBtn.style.color = '#fff';
        timeBtn.style.textShadow = '0 1px 2px rgba(0,0,0,0.5)';
        timeBtn.onmouseover = function() { timeBtn.style.background = 'rgba(0,0,0,0.35)'; };
        timeBtn.onmouseout = function() { timeBtn.style.background = 'rgba(0,0,0,0.2)'; };
      }

      if (item.status === 'done' || item.status === 'skipped') {
        row.style.opacity = '0.5';
      }

      timeBtn.onclick = function (e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        console.log('[CycleTimer] Click detected for:', item.nome);
        if (!item.targetSeconds) {
           if (typeof window.abrirModalCrono === 'function') window.abrirModalCrono();
           return;
        }
        // Force pop-up to show
        openCycleTimer(item);
      };
      var actsWrap = document.createElement('div');
      actsWrap.style.cssText = 'display:flex;gap:6px;align-items:stretch;position:relative;z-index:4;';
      
      var manBtn = document.createElement('button');
      manBtn.type = 'button';
      manBtn.innerHTML = '📝';
      manBtn.title = 'Lançamento manual de estudo e questões';
      manBtn.style.cssText = 'background:rgba(0,0,0,0.15); border:1px solid rgba(255,255,255,0.05); color:#fff; border-radius:8px; width:36px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:14px; transition:0.2s';
      manBtn.onmouseover = function() { this.style.background = 'rgba(255,255,255,0.2)'; };
      manBtn.onmouseout = function() { this.style.background = 'rgba(0,0,0,0.15)'; };
      
      if (!item.targetSeconds) manBtn.style.display = 'none';
      if (item.status === 'done' || item.status === 'skipped') manBtn.style.display = 'none';
      
      manBtn.onclick = function() {
        openManualEntryModal(item);
      };

      actsWrap.appendChild(timeBtn);
      actsWrap.appendChild(manBtn);
      row.appendChild(order);
      row.appendChild(name);
      row.appendChild(actsWrap);
      itemsContainer.appendChild(row);
    });
    pathWrapper.appendChild(itemsContainer);
    grid.appendChild(pathWrapper);

    if (cycleComplete) {
      var completeBox = document.createElement('div');
      completeBox.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;background:rgba(62,207,142,0.08);border:1px solid rgba(62,207,142,0.35);border-radius:12px;margin-top:10px;color:var(--text);';
      completeBox.innerHTML = '<div style="min-width:0;"><strong style="display:block;font-size:13px;color:var(--green);margin-bottom:2px;">Ciclo concluido</strong><span style="font-size:11px;color:var(--text3);">Confira a carga estudada antes de iniciar uma nova rodada.</span></div>';
      var restartBtn = document.createElement('button');
      restartBtn.type = 'button';
      restartBtn.textContent = 'Reiniciar ciclo';
      restartBtn.style.cssText = 'border:1px solid rgba(62,207,142,0.55);background:rgba(62,207,142,0.16);color:var(--green);border-radius:8px;padding:8px 10px;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap;';
      restartBtn.onclick = function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (confirm('Reiniciar o ciclo agora? O resumo atual sera zerado para a nova rodada.')) {
          restartCycle(data);
        }
      };
      completeBox.appendChild(restartBtn);
      grid.appendChild(completeBox);
    }

    var totalTarget = 0;
    var totalStudied = 0;
    data.items.forEach(function (item) {
      if (item.targetSeconds) totalTarget += item.targetSeconds;
    });
    totalStudied = (data.sessionHistory || []).reduce(function(acc, s) { return acc + (s.duracao || 0); }, 0);

    var footer = document.createElement('div');
    footer.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:var(--bg3);border:1px solid var(--border);border-radius:12px;margin-top:10px;color:var(--text);font-size:13px;font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,0.2);';
    
    var leftStats = document.createElement('div');
    leftStats.innerHTML = '<span style="color:var(--text3);font-size:10px;font-weight:800;letter-spacing:0.5px">CARGA ESTUDADA</span><br><span id="cycleCargaEstudadaValue" class="crono-cycle-studied-value" style="font-size:15px;color:var(--accent)">⏱️ ' + formatCycleClock(totalStudied) + '</span>';
    
    var rightStats = document.createElement('div');
    rightStats.style.textAlign = 'right';
    rightStats.innerHTML = '<span style="color:var(--text3);font-size:10px;font-weight:800;letter-spacing:0.5px">META DO CICLO</span><br><span id="cycleMetaValue" class="crono-cycle-target-value" style="font-size:15px;color:var(--green)">🎯 ' + formatCycleClock(totalTarget) + '</span>';

    var progressWrapper = document.createElement('div');
    progressWrapper.style.cssText = 'flex:1;margin:0 24px;height:6px;background:var(--bg2);border:1px solid var(--border2);border-radius:999px;position:relative;overflow:hidden;';
    var pct = totalTarget > 0 ? Math.min(100, Math.max(0, (totalStudied / totalTarget) * 100)) : 0;
    var progressBar = document.createElement('div');
    progressBar.style.cssText = 'position:absolute;inset:0;width:' + pct + '%;background:var(--accent);border-radius:999px;transition:width 0.5s ease;';
    progressWrapper.appendChild(progressBar);

    footer.appendChild(leftStats);
    footer.appendChild(progressWrapper);
    footer.appendChild(rightStats);

    footer.style.cursor = 'pointer';
    footer.title = 'Ver carga estudada por materia';
    footer.addEventListener('mouseover', function() { footer.style.background = 'var(--bg2)'; footer.style.borderColor = 'var(--accent)'; });
    footer.addEventListener('mouseout', function() { footer.style.background = 'var(--bg3)'; footer.style.borderColor = 'var(--border)'; });
    footer.addEventListener('click', function() {
      openCycleSessionsModal(data);
    });

    grid.appendChild(footer);

    updateDashboardCardHeader();
  }

  function buildCycleLoadSummary(data) {
    var history = Array.isArray(data && data.sessionHistory) ? data.sessionHistory : [];
    var studiedByItem = {};
    history.forEach(function (session) {
      if (!session || !session.itemId) return;
      studiedByItem[session.itemId] = (studiedByItem[session.itemId] || 0) + Math.max(0, parseInt(session.duracao, 10) || 0);
    });

    var rows = (data && data.items || []).filter(function (item) {
      return item && Math.max(0, parseInt(item.targetSeconds, 10) || 0) > 0;
    }).map(function (item, index) {
      var target = Math.max(0, parseInt(item.targetSeconds, 10) || 0);
      var remaining = Math.max(0, item.remainingSeconds == null ? target : parseInt(item.remainingSeconds, 10) || 0);
      var skipped = Math.max(0, parseInt(item.skippedSeconds || item.lastPendingSeconds, 10) || 0);
      var inferredStudied = item.status === 'skipped'
        ? Math.max(0, target - skipped)
        : Math.max(0, target - remaining);
      var studied = Math.max(studiedByItem[item.id] || 0, inferredStudied);
      return {
        id: item.id,
        index: index + 1,
        nome: item.nome || 'Materia',
        cor: item.cor || 'var(--accent)',
        target: target,
        studied: studied,
        diff: studied - target,
        remaining: Math.max(0, target - studied),
        status: item.status || 'pending'
      };
    });

    return {
      rows: rows,
      target: rows.reduce(function (acc, row) { return acc + row.target; }, 0),
      studied: rows.reduce(function (acc, row) { return acc + row.studied; }, 0)
    };
  }

  function openCycleSessionsModal(data) {
    var overlay = document.getElementById('cycleSessOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'cycleSessOverlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px;animation: popIn 0.2s ease;';
      document.body.appendChild(overlay);
    } else {
      overlay.innerHTML = '';
      overlay.style.display = 'flex';
    }

    var panel = document.createElement('div');
    panel.style.cssText = 'width:460px;max-width:100%;max-height:84vh;background:var(--bg2);border:1px solid var(--border2);border-radius:16px;display:flex;flex-direction:column;box-shadow:0 10px 50px rgba(0,0,0,0.6);overflow:hidden;';

    var header = document.createElement('div');
    header.style.cssText = 'padding:16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--bg3);';
    header.innerHTML = '<span style="font-size:14px;font-weight:700;color:var(--text);letter-spacing:1px;text-transform:uppercase;">Carga estudada do ciclo</span>';

    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = 'x';
    closeBtn.style.cssText = 'background:none;border:none;color:var(--text3);font-size:18px;cursor:pointer;line-height:1;transition:color 0.15s;';
    closeBtn.onmouseover = function() { this.style.color = 'var(--red)'; };
    closeBtn.onmouseout = function() { this.style.color = 'var(--text3)'; };
    closeBtn.onclick = function() { overlay.style.display = 'none'; };
    header.appendChild(closeBtn);

    var listWrap = document.createElement('div');
    listWrap.style.cssText = 'padding:14px 16px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:10px;';

    var summary = buildCycleLoadSummary(data || {});
    if (summary.rows.length === 0) {
      listWrap.innerHTML = '<div style="color:var(--text3);font-size:13px;text-align:center;padding:30px 10px;line-height:1.5">Nenhuma meta de ciclo definida.<br><span style="font-size:11px;opacity:0.7">Defina a carga horaria das materias para acompanhar a comparacao.</span></div>';
    } else {
      summary.rows.forEach(function(rowData) {
        var diff = rowData.diff;
        var isPending = rowData.status === 'pending';
        var isMissingFinalized = rowData.status === 'skipped' && diff < 0;
        var statusColor = isPending ? 'var(--text3)' : (isMissingFinalized ? 'var(--red)' : 'var(--green)');
        var pct = rowData.target > 0 ? Math.max(0, Math.min(130, (rowData.studied / rowData.target) * 100)) : 0;
        var row = document.createElement('div');
        row.style.cssText = 'padding:12px;background:var(--bg3);border:1px solid var(--border);border-radius:10px;font-size:12px;box-shadow:0 2px 4px rgba(0,0,0,0.1);display:flex;flex-direction:column;gap:10px;';

        var top = document.createElement('div');
        top.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;';
        top.innerHTML =
          '<div style="min-width:0;display:flex;align-items:center;gap:8px;">' +
            '<span style="width:8px;height:28px;border-radius:999px;background:' + rowData.cor + ';flex-shrink:0;"></span>' +
            '<div style="min-width:0;">' +
              '<strong style="color:var(--text);display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(rowData.nome) + '</strong>' +
              '<span style="color:var(--text3);font-size:10px;text-transform:uppercase;letter-spacing:0.5px">Meta ' + formatCycleClock(rowData.target) + ' | estudado ' + formatCycleClock(rowData.studied) + '</span>' +
            '</div>' +
          '</div>';

        var right = document.createElement('div');
        right.style.cssText = 'font-family:var(--mono);font-weight:800;font-size:14px;letter-spacing:-0.4px;white-space:nowrap;color:' + statusColor + ';';
        right.textContent = isPending ? ('faltam ' + formatCycleClock(rowData.remaining)) : formatCycleDelta(diff);
        top.appendChild(right);

        var bar = document.createElement('div');
        bar.style.cssText = 'height:6px;background:var(--bg2);border:1px solid var(--border2);border-radius:999px;overflow:hidden;';
        var fill = document.createElement('div');
        fill.style.cssText = 'height:100%;width:' + pct + '%;background:' + (isPending ? 'var(--text3)' : (isMissingFinalized ? 'var(--red)' : 'var(--green)')) + ';border-radius:999px;';
        bar.appendChild(fill);

        row.appendChild(top);
        row.appendChild(bar);
        listWrap.appendChild(row);
      });

      var totalDiff = summary.studied - summary.target;
      var hasPending = summary.rows.some(function (row) { return row.status === 'pending'; });
      var totalPositive = totalDiff >= 0;
      var totalColor = hasPending ? 'var(--text3)' : (totalPositive ? 'var(--green)' : 'var(--red)');
      var totalLabel = hasPending ? ('faltam ' + formatCycleClock(Math.max(0, summary.target - summary.studied))) : formatCycleDelta(totalDiff);
      var totalCaption = hasPending ? 'ciclo em andamento' : (totalPositive ? 'extra, parabens!' : 'abaixo da meta');
      var total = document.createElement('div');
      total.style.cssText = 'margin-top:4px;padding:14px;background:var(--bg);border:1px solid ' + (hasPending ? 'var(--border2)' : (totalPositive ? 'rgba(50,213,131,0.35)' : 'rgba(245,90,90,0.35)')) + ';border-radius:12px;display:flex;align-items:center;justify-content:space-between;gap:12px;';
      total.innerHTML =
        '<div style="min-width:0;">' +
          '<strong style="display:block;color:var(--text);font-size:13px;margin-bottom:3px;">Total do ciclo</strong>' +
          '<span style="color:var(--text3);font-size:11px;">Meta ' + formatCycleClock(summary.target) + ' | estudado ' + formatCycleClock(summary.studied) + '</span>' +
        '</div>' +
        '<div style="text-align:right;flex-shrink:0;">' +
          '<div style="font-family:var(--mono);font-size:16px;font-weight:900;color:' + totalColor + ';">' + totalLabel + '</div>' +
          '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.4px;color:' + totalColor + ';">' + totalCaption + '</div>' +
        '</div>';
      listWrap.appendChild(total);
    }

    panel.appendChild(header);
    panel.appendChild(listWrap);
    overlay.appendChild(panel);

    overlay.onclick = function(e) { if (e.target === overlay) overlay.style.display = 'none'; };
  }
  function openManualEntryModal(item) {
    var overlay = document.getElementById('cycleManOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'cycleManOverlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:10005;display:flex;align-items:center;justify-content:center;padding:20px;animation: popIn 0.2s ease;';
      document.body.appendChild(overlay);
    } else {
      overlay.innerHTML = '';
      overlay.style.display = 'flex';
    }
    
    var panel = document.createElement('div');
    panel.style.cssText = 'width:340px;max-width:100%;background:var(--bg2);border:1px solid var(--border2);border-radius:16px;display:flex;flex-direction:column;box-shadow:0 10px 50px rgba(0,0,0,0.6);overflow:hidden;';
    
    var header = document.createElement('div');
    header.style.cssText = 'padding:16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--bg3);';
    header.innerHTML = '<span style="font-size:14px;font-weight:700;color:var(--text);letter-spacing:1px;text-transform:uppercase;">Lançamento Manual</span>';
    
    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = 'background:none;border:none;color:var(--text3);font-size:18px;cursor:pointer;line-height:1;transition:color 0.15s;';
    closeBtn.onmouseover = function() { this.style.color = 'var(--red)'; };
    closeBtn.onmouseout = function() { this.style.color = 'var(--text3)'; };
    closeBtn.onclick = function() { overlay.style.display = 'none'; };
    header.appendChild(closeBtn);
    
    var body = document.createElement('div');
    body.style.cssText = 'padding:20px 16px;display:flex;flex-direction:column;gap:16px;';
    
    body.innerHTML = '<div style="font-size:13px;color:var(--text3);text-align:center;">Registre o tempo e questões para<br><strong style="color:var(--text);font-size:15px;display:block;margin-top:4px;">' + (item.nome || 'a Matéria') + '</strong></div>';
    
    var timeGroup = document.createElement('div');
    timeGroup.style.cssText = 'display:flex;gap:10px;';
    timeGroup.innerHTML = '<div style="flex:1"><label style="display:block;font-size:11px;color:var(--text3);margin-bottom:6px;font-weight:700">HORAS</label><input type="number" id="man_h" min="0" max="23" placeholder="0" style="width:100%;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:10px;border-radius:8px;font-family:var(--sans);font-size:14px;text-align:center;"></div>' +
                          '<div style="flex:1"><label style="display:block;font-size:11px;color:var(--text3);margin-bottom:6px;font-weight:700">MINUTOS</label><input type="number" id="man_m" min="0" max="59" placeholder="0" style="width:100%;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:10px;border-radius:8px;font-family:var(--sans);font-size:14px;text-align:center;"></div>';
    
    var qsGroup = document.createElement('div');
    qsGroup.style.cssText = 'display:flex;gap:10px;';
    qsGroup.innerHTML = '<div style="flex:1"><label style="display:block;font-size:11px;color:var(--text3);margin-bottom:6px;font-weight:700">QUESTÕES</label><input type="number" id="man_q" min="0" placeholder="0" style="width:100%;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:10px;border-radius:8px;font-family:var(--sans);font-size:14px;text-align:center;"></div>' +
                        '<div style="flex:1"><label style="display:block;font-size:11px;color:var(--text3);margin-bottom:6px;font-weight:700">ACERTOS</label><input type="number" id="man_a" min="0" placeholder="0" style="width:100%;background:var(--bg);border:1px solid var(--border);color:var(--text);padding:10px;border-radius:8px;font-family:var(--sans);font-size:14px;text-align:center;"></div>';
    
    var toggleGroup = document.createElement('div');
    toggleGroup.style.cssText = 'display:flex;align-items:center;gap:10px;padding:12px 0;cursor:pointer;';
    toggleGroup.innerHTML = '<input type="checkbox" id="man_adv" checked style="width:18px;height:18px;accent-color:var(--accent);cursor:pointer;"><label for="man_adv" style="font-size:13px;color:var(--text);font-weight:400;cursor:pointer;flex:1">Marcar matéria como concluída</label>';
    
    var saveBtn = document.createElement('button');
    saveBtn.textContent = 'Salvar Lançamento';
    saveBtn.style.cssText = 'padding:14px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-weight:700;font-size:14px;cursor:pointer;transition:transform 0.1s;';
    saveBtn.onmousedown = function(){ this.style.transform='scale(0.97)'; };
    saveBtn.onmouseup = function(){ this.style.transform='none'; };
    saveBtn.onclick = function() {
       var h = parseInt(document.getElementById('man_h').value, 10) || 0;
       var m = parseInt(document.getElementById('man_m').value, 10) || 0;
       var q = parseInt(document.getElementById('man_q').value, 10) || 0;
       var a = parseInt(document.getElementById('man_a').value, 10) || 0;
       var adv = document.getElementById('man_adv').checked;
       var dur = (h * 3600) + (m * 60);
       
       if (dur === 0 && q === 0 && !adv) {
          overlay.style.display = 'none';
          return;
       }
       
       var matId = item.materiaId || resolveMateriaId(item.nome);
       var cid = typeof getCid === 'function' ? getCid() : (window._cData ? window._cData.id : '');
       var sessId = null;
       
       if (window.CT) {
          if (dur > 0 && typeof window.CT.registrarSessao === 'function') {
             sessId = window.CT.registrarSessao({ concursoId: cid, materiaId: matId, duracaoSegundos: dur, origem: 'manual_ciclo' });
          }
          if (q > 0 && typeof window.CT.lancarQuestoes === 'function') {
             var acertos = Math.min(a, q);
             window.CT.lancarQuestoes({ materiaId: matId, concursoId: cid, resolvidas: q, acertos: acertos, erros: q - acertos });
          }
       }
       
       if (adv) {
          window.CTCycle.finalizeItem(item.id);
       }
       
       overlay.style.display = 'none';
       if (typeof window.renderCrono === 'function') window.renderCrono();
       try { if (window.CTToast) window.CTToast('Lançamento salvo com sucesso!', 'success'); } catch(e) {}
    };
    
    body.appendChild(timeGroup);
    body.appendChild(qsGroup);
    body.appendChild(toggleGroup);
    body.appendChild(saveBtn);
    
    panel.appendChild(header);
    panel.appendChild(body);
    overlay.appendChild(panel);
    
    overlay.onclick = function(e){ if (e.target === overlay) overlay.style.display = 'none'; };
  }

  // Patch window.renderCrono reactively to ensure it's available after main app init
  (function patchRender() {
    var orig = window.renderCrono;
    if (typeof orig === 'function' && !orig._patched) {
      window.renderCrono = function () {
        if (getViewMode() === 'cycle') renderCycleDashboard();
        else {
          orig();
          patchCronoGridNames();
        }
        updateDashboardCardHeader();
      };
      window.renderCrono._patched = true;
      // Force initial render once patched
      window.renderCrono();
    } else if (!window.renderCrono || !window.renderCrono._patched) {
      setTimeout(patchRender, 50);
    }
  })();

  window.abrirModalCrono = function () {
    ensureCronoStyles();
    var old = document.getElementById('modalCrono');
    if (old) old.remove();
    var cid = getCid();
    if (cid && cid !== window._cCid) window._cCid = cid;
    try { window._cData = JSON.parse(localStorage.getItem('ct_crono_' + cid) || '{}'); } catch (e) { window._cData = {}; }
    if (!window._cMats || !window._cMats.length) window._cMats = getMateriasAtivas();

    var palette = ['#4f8ef7','#7c5cfc','#3ecf8e','#f5c842','#f5874a','#f55a5a','#00bcd4','#e91e8c','#8bc34a','#ff9800','#9c27b0','#607d8b','#ff5722','#009688','#795548','#3f51b5','#cddc39','#03a9f4','#e91e63','#4caf50'];
    var overlay = document.createElement('div');
    overlay.id = 'modalCrono';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    var box = document.createElement('div');
    box.style.cssText = 'background:var(--bg2);border:1px solid var(--border2);border-radius:16px;padding:24px;width:560px;max-width:95vw;height:min(92vh,820px);box-shadow:0 24px 60px rgba(0,0,0,0.6);display:flex;flex-direction:column;position:relative;overflow:hidden';
    var scene = document.createElement('div');
    scene.className = 'crono-flip-scene';
    var flipCard = document.createElement('div');
    flipCard.className = 'crono-flip-card';
    scene.appendChild(flipCard);
    box.appendChild(scene);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    function createFace(titleText) {
      var face = document.createElement('div');
      face.className = 'crono-face';
      var header = document.createElement('div');
      header.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;gap:12px';
      var title = document.createElement('div');
      title.style.cssText = 'font-size:16px;font-weight:700;color:var(--text)';
      title.textContent = titleText;
      var flipBtn = document.createElement('button');
      flipBtn.type = 'button';
      flipBtn.title = 'Clique aqui para escolher Ciclo de Estudos em vez de Cronograma Semanal';
      flipBtn.textContent = 'Flip';
      flipBtn.style.cssText = 'border:1px solid var(--border);background:rgba(255,255,255,0.04);color:var(--text2);border-radius:999px;padding:7px 12px;font-size:11px;font-weight:700;cursor:pointer;flex-shrink:0';
      header.appendChild(title);
      header.appendChild(flipBtn);
      var body = document.createElement('div');
      body.className = 'crono-scroll';
      var footer = document.createElement('div');
      footer.style.cssText = 'display:flex;gap:8px;margin-top:auto';
      face.appendChild(header);
      face.appendChild(body);
      face.appendChild(footer);
      return { face: face, body: body, footer: footer, flipBtn: flipBtn };
    }

    var front = createFace('Editar cronograma semanal');
    var back = createFace('Editar ciclo de estudos');
    front.face.classList.add('front');
    back.face.classList.add('back');
    flipCard.appendChild(front.face);
    flipCard.appendChild(back.face);
    function setFace(isBack) { flipCard.classList.toggle('is-back', !!isBack); }
    front.flipBtn.addEventListener('click', function () { setFace(true); });
    back.flipBtn.addEventListener('click', function () { setFace(false); });

    function closeModal() {
      persistVisibleMatColors();
      window.removeEventListener('ct-cycle-updated', rerenderCycle);
      overlay.remove();
      if (typeof window.renderCrono === 'function') window.renderCrono();
    }
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
    function persistVisibleMatColors() {
      var current = window._getCronoMats();
      if (!current.length) return false;

      var changed = false;
      var seenNames = {};
      var visibleChips = box.querySelectorAll('[data-crono-mat][data-cor]');

      visibleChips.forEach(function (chip) {
        var nome = chip.getAttribute('data-crono-mat');
        var cor = chip.getAttribute('data-cor');
        var normalized = normName(nome);

        if (!normalized || !cor || seenNames[normalized]) return;
        seenNames[normalized] = true;

        var target = current.find(function (item) { return normName(item.nome) === normalized; });
        if (target && target.cor !== cor) {
          target.cor = cor;
          changed = true;
        }
      });

      if (changed) window._saveCronoMats(current);
      return changed;
    }

    var matsSection = document.createElement('div');
    matsSection.style.cssText = 'background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:16px';
    var matsTitle = document.createElement('div');
    matsTitle.style.cssText = 'font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text3);margin-bottom:10px';
matsTitle.textContent = 'Matérias - arraste para os dias';
    matsSection.appendChild(matsTitle);
    var chipsArea = document.createElement('div');
    chipsArea.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;min-height:28px';
    matsSection.appendChild(chipsArea);
    var newRow = document.createElement('div');
    newRow.style.cssText = 'display:flex;gap:6px;align-items:center';
    var newInp = document.createElement('input');
    newInp.type = 'text';
    newInp.maxLength = 80;
    newInp.placeholder = 'Ex.: Direito Constitucional';
    newInp.style.cssText = 'flex:1;background:var(--bg2);border:1px solid var(--border2);border-radius:6px;padding:8px 10px;color:var(--text);font-family:var(--sans);font-size:13px;font-weight:600;outline:none';
    var newColorBtn = document.createElement('div');
    newColorBtn.style.cssText = 'width:32px;height:32px;border-radius:8px;border:2px solid var(--border2);cursor:pointer;flex-shrink:0;background:' + palette[0];
    newColorBtn.setAttribute('data-cor', palette[0]);
    newColorBtn.title = 'Escolher cor';
    newColorBtn.addEventListener('click', function () { window.abrirPaletaInline(newColorBtn, palette); });
    var newAddBtn = document.createElement('button');
    newAddBtn.textContent = '+ Criar';
    newAddBtn.style.cssText = 'padding:8px 14px;background:linear-gradient(135deg,var(--accent),var(--accent2));border:none;border-radius:8px;color:#fff;font-family:var(--sans);font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap';
    var btnSaveColors = document.createElement('button');
    btnSaveColors.innerHTML = '💾';
    btnSaveColors.title = 'FORÇAR SALVAR CORES PERSONALIZADAS';
    btnSaveColors.style.cssText = 'width:32px;height:32px;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,0.05);color:var(--text);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s ease;';
    btnSaveColors.onclick = function() {
       persistVisibleMatColors();
       btnSaveColors.innerHTML = '✅';
       setTimeout(function() { btnSaveColors.innerHTML = '💾'; }, 2000);
    };

    newRow.appendChild(btnSaveColors);
    newRow.appendChild(newInp);
    newRow.appendChild(newColorBtn);
    newRow.appendChild(newAddBtn);
    
    var importBtn = document.createElement('button');
    importBtn.textContent = '📥 Importar do Concurso';
    importBtn.style.cssText = 'padding:8px 14px;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:8px;color:var(--text2);font-family:var(--sans);font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;margin-top:8px';
    importBtn.onclick = function() {
       if (confirm('Isso irá limpar sua lista atual e importar as matérias originais do seu concurso. Continuar?')) {
          importFromContest();
          renderMatsChips();
          renderCyclePalette();
          renderCycleList();
       }
    };
    
    matsSection.appendChild(newRow);
    matsSection.appendChild(importBtn);
    front.body.appendChild(matsSection);

    var daysContainer = document.createElement('div');
    front.body.appendChild(daysContainer);
var dayNames = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

    var cyclePaletteLabel = document.createElement('div');
    cyclePaletteLabel.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--text3);margin-bottom:6px';
cyclePaletteLabel.textContent = 'Matérias disponíveis - arraste para ordenar o ciclo';
    back.body.appendChild(cyclePaletteLabel);
    var cyclePalette = document.createElement('div');
    cyclePalette.className = 'crono-cycle-palette';
    back.body.appendChild(cyclePalette);

    var newRowCycle = document.createElement('div');
    newRowCycle.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:12px;padding:12px;border-radius:8px;background:var(--bg3);border:1px solid var(--border);';
    var newInpCycle = document.createElement('input');
    newInpCycle.type = 'text';
    newInpCycle.maxLength = 80;
    newInpCycle.placeholder = 'Nova matéria...';
    newInpCycle.style.cssText = 'flex:1;background:var(--bg2);border:1px solid var(--border2);border-radius:6px;padding:6px 8px;color:var(--text);font-family:var(--sans);font-size:12px;font-weight:600;outline:none';
    var newColorBtnCycle = document.createElement('div');
    newColorBtnCycle.style.cssText = 'width:28px;height:28px;border-radius:8px;border:2px solid var(--border2);cursor:pointer;flex-shrink:0;background:' + palette[0];
    newColorBtnCycle.setAttribute('data-cor', palette[0]);
    newColorBtnCycle.title = 'Escolher cor';
    newColorBtnCycle.addEventListener('click', function () { window.abrirPaletaInline(newColorBtnCycle, palette); });
    var newAddBtnCycle = document.createElement('button');
    newAddBtnCycle.textContent = '+ Criar';
    newAddBtnCycle.style.cssText = 'padding:6px 12px;background:linear-gradient(135deg,var(--accent),var(--accent2));border:none;border-radius:8px;color:#fff;font-family:var(--sans);font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap';
    var btnSaveColorsCycle = document.createElement('button');
    btnSaveColorsCycle.innerHTML = '💾';
    btnSaveColorsCycle.title = 'FORÇAR SALVAR CORES PERSONALIZADAS';
    btnSaveColorsCycle.style.cssText = 'width:28px;height:28px;border-radius:8px;border:1px solid var(--border);background:rgba(255,255,255,0.05);color:var(--text);font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s ease;';
    btnSaveColorsCycle.onclick = function() {
       persistVisibleMatColors();
       btnSaveColorsCycle.innerHTML = '✅';
       setTimeout(function() { btnSaveColorsCycle.innerHTML = '💾'; }, 2000);
    };

    newRowCycle.appendChild(btnSaveColorsCycle);
    newRowCycle.appendChild(newInpCycle);
    newRowCycle.appendChild(newColorBtnCycle);
    newRowCycle.appendChild(newAddBtnCycle);

    newRowCycle.appendChild(newAddBtnCycle);
    
    var importBtnCycle = document.createElement('button');
    importBtnCycle.textContent = '📥 Importar do Concurso';
    importBtnCycle.style.cssText = 'padding:6px 12px;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:8px;color:var(--text2);font-family:var(--sans);font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap;margin-top:6px';
    importBtnCycle.onclick = function() {
       if (confirm('Isso irá limpar sua lista atual e importar as matérias originais do seu concurso. Continuar?')) {
          importFromContest();
          renderMatsChips();
          renderCyclePalette();
          renderCycleList();
       }
    };

    newAddBtnCycle.addEventListener('click', function () {
      var nome = abbreviateSubjectName(newInpCycle.value);
      if (!nome) return;
      var cor = newColorBtnCycle.getAttribute('data-cor');
      var mats = window._getCronoMats();
      if (!mats.some(function (m) { return normName(m.nome) === normName(nome); })) {
        mats.push({ nome: nome, cor: cor, materiaId: resolveMateriaId(nome) || '' });
        window._saveCronoMats(mats);
      }
      newInpCycle.value = '';
      renderMatsChips();
      renderCyclePalette();
      renderCycleList();
    });
    newInpCycle.addEventListener('keydown', function (e) { if (e.key === 'Enter') newAddBtnCycle.click(); });
    back.body.appendChild(newRowCycle);
    back.body.appendChild(importBtnCycle);
    var cycleOrderLabel = document.createElement('div');
    cycleOrderLabel.style.cssText = 'font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--text3);margin:4px 0 6px';
    cycleOrderLabel.textContent = 'Ordem do ciclo';
    back.body.appendChild(cycleOrderLabel);
    var cycleList = document.createElement('div');
    cycleList.className = 'crono-cycle-list';
    back.body.appendChild(cycleList);

    function renderMatsChips() {
      var mats = window._getCronoMats();
      chipsArea.innerHTML = '';
      if (!mats.length) {
        var hint = document.createElement('span');
        hint.style.cssText = 'font-size:12px;color:var(--text3)';
hint.textContent = 'Crie matérias acima e arraste para os dias.';
        chipsArea.appendChild(hint);
        return;
      }
      mats.forEach(function (m) {
        var chip = document.createElement('div');
        chip.draggable = true;
        chip.setAttribute('data-crono-mat', m.nome);
        chip.setAttribute('data-cor', m.cor);
        chip.style.cssText = 'background:' + m.cor + ';border-radius:8px;padding:7px 10px;font-size:12px;font-weight:700;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.8);cursor:pointer;display:flex;align-items:flex-start;gap:8px;user-select:none;max-width:100%';
        chip.title = 'Clique para trocar cor ou segure para arrastar';
        
        chip.onclick = function() {
           window.abrirPaletaInline(chip, palette, function(novaCor) {
              var all = window._getCronoMats();
              var target = all.find(function(x) { return normName(x.nome) === normName(m.nome); });
              if (target) {
                 target.cor = novaCor;
                 window._saveCronoMats(all);
                 // Force immediate UI update for both modal sides
                 renderMatsChips();
                 renderCyclePalette();
                 renderCycleList();
              }
           });
        };
        
        var lbl = document.createElement('span');
        lbl.className = 'crono-chip-full';
        lbl.textContent = m.nome;
        var del = document.createElement('span');
        del.textContent = 'x';
        del.style.cssText = 'opacity:0.7;cursor:pointer;font-size:12px;flex-shrink:0;line-height:1.2';
        del.addEventListener('click', function (e) {
          e.stopPropagation();
          window._saveCronoMats(window._getCronoMats().filter(function (x) { return normName(x.nome) !== normName(m.nome); }));
          renderMatsChips();
          renderCyclePalette();
          renderCycleList();
        });
        chip.appendChild(lbl);
        chip.appendChild(del);
        chip.addEventListener('dragstart', function (e) { e.dataTransfer.setData('text/plain', m.nome); chip.style.opacity = '0.5'; });
        chip.addEventListener('dragend', function () { chip.style.opacity = '1'; });
        chipsArea.appendChild(chip);
      });
    }

    function renderCyclePalette() {
      var mats = window._getCronoMats();
      cyclePalette.innerHTML = '';
      cyclePalette.ondragover = function (e) { e.preventDefault(); };
      cyclePalette.ondrop = function (e) {
        e.preventDefault();
        var draggedId = e.dataTransfer.getData('text/cycle-entry');
        if (!draggedId) return;
        removeCycleItem(draggedId);
        renderCycleList();
      };
      if (!mats.length) {
        var emptyPalette = document.createElement('div');
        emptyPalette.style.cssText = 'font-size:12px;color:var(--text3)';
emptyPalette.textContent = 'Crie matérias no cronograma para organizar o ciclo.';
        cyclePalette.appendChild(emptyPalette);
        return;
      }
      mats.forEach(function (m) {
        var chip = document.createElement('div');
        chip.className = 'crono-cycle-chip';
        chip.draggable = true;
        chip.setAttribute('data-crono-mat', m.nome);
        chip.setAttribute('data-cor', m.cor);
        chip.title = 'Clique para trocar cor / duplo clique p/ add / arraste p/ ordenar';
        chip.style.cssText = 'background:' + m.cor + ';border-radius:8px;padding:7px 10px;font-size:12px;font-weight:700;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.8);cursor:pointer;display:flex;align-items:flex-start;gap:8px;user-select:none;max-width:100%';
        
        chip.onclick = function(e) {
           window.abrirPaletaInline(chip, palette, function(novaCor) {
              var all = window._getCronoMats();
              var target = all.find(function(x) { return normName(x.nome) === normName(m.nome); });
              if (target) {
                 target.cor = novaCor;
                 window._saveCronoMats(all);
                 renderMatsChips();
                 renderCyclePalette();
                 renderCycleList();
              }
           });
        };
        chip.ondblclick = function() {
           placeCycleItem(baseIdFromName(m.nome), getCycleData({ skipPersist: true, skipAutoRestart: true }).items.length);
           renderCycleList();
        };

        chip.addEventListener('dragstart', function (e) {
          e.dataTransfer.setData('text/cycle-base', baseIdFromName(m.nome));
          e.dataTransfer.effectAllowed = 'copy';
          chip.style.opacity = '0.45';
        });
        chip.addEventListener('dragend', function () { chip.style.opacity = '1'; });
// ... [existing label/del code removed to simplify chunk replacement as it was duplicated logic]
        var label = document.createElement('span');
        label.className = 'crono-chip-full';
        label.textContent = m.nome;
        var del = document.createElement('span');
        del.textContent = 'x';
        del.style.cssText = 'opacity:0.7;cursor:pointer;font-size:12px;flex-shrink:0;line-height:1.2';
        del.title = 'Apagar matéria';
        del.addEventListener('click', function (e) {
          e.stopPropagation();
          window._saveCronoMats(window._getCronoMats().filter(function (x) { return normName(x.nome) !== normName(m.nome); }));
          renderMatsChips();
          renderCyclePalette();
          renderCycleList();
        });
        chip.appendChild(label);
        chip.appendChild(del);
        cyclePalette.appendChild(chip);
      });
    }

    function renderCycleList() {
      var data = getCycleData();
      cycleList.innerHTML = '';
      if (!data.items.length) {
        var empty = document.createElement('div');
        empty.className = 'crono-cycle-drop-end';
empty.textContent = 'Arraste matérias aqui para montar a ordem do ciclo';
        empty.addEventListener('dragover', function (e) {
          e.preventDefault();
          empty.classList.add('drag-over');
        });
        empty.addEventListener('dragleave', function () { empty.classList.remove('drag-over'); });
        empty.addEventListener('drop', function (e) {
          e.preventDefault();
          empty.classList.remove('drag-over');
          var draggedEntryId = e.dataTransfer.getData('text/cycle-entry');
          var draggedBaseId = e.dataTransfer.getData('text/cycle-base');
          var draggedId = draggedEntryId || draggedBaseId;
          if (!draggedId) return;
          placeCycleItem(draggedId, 0);
          renderCycleList();
        });
        cycleList.appendChild(empty);
        return;
      }
      data.items.forEach(function (item, idx) {
        var studiedSeconds = Math.max(0, item.targetSeconds - (item.status === 'pending' ? item.remainingSeconds : item.skippedSeconds || 0));
        if (item.status === 'done') studiedSeconds = item.targetSeconds;
        var pendingSeconds = item.status === 'pending' ? item.remainingSeconds : item.lastPendingSeconds || 0;

        var card = document.createElement('div');
        card.className = 'crono-cycle-card'
          + (idx === data.currentIndex && item.status === 'pending' && item.targetSeconds > 0 ? ' current' : '')
          + (item.status === 'done' ? ' done' : '')
          + (item.status === 'skipped' ? ' skipped' : '');
        card.draggable = true;
        card.addEventListener('dragstart', function (e) {
          e.dataTransfer.setData('text/cycle-entry', item.id);
          e.dataTransfer.effectAllowed = 'move';
          card.style.opacity = '0.45';
        });
        card.addEventListener('dragend', function () {
          card.style.opacity = '1';
          card.classList.remove('drag-over');
        });
        card.addEventListener('dragover', function (e) {
          e.preventDefault();
          card.classList.add('drag-over');
        });
        card.addEventListener('dragleave', function () { card.classList.remove('drag-over'); });
        card.addEventListener('drop', function (e) {
          e.preventDefault();
          card.classList.remove('drag-over');
          var draggedEntryId = e.dataTransfer.getData('text/cycle-entry');
          var draggedBaseId = e.dataTransfer.getData('text/cycle-base');
          var draggedId = draggedEntryId || draggedBaseId;
          if (!draggedId) return;
          placeCycleItem(draggedId, idx);
          renderCycleList();
        });

        var slot = document.createElement('div');
        slot.className = 'crono-cycle-slot';
        slot.textContent = String(idx + 1).padStart(2, '0');
        slot.style.background = item.cor;
        slot.style.color = '#fff';

        var left = document.createElement('div');
        left.className = 'crono-cycle-left';
        var name = document.createElement('div');
        name.className = 'crono-cycle-name';
        name.textContent = (item.status === 'done' ? '✅ ' : '') + item.nome;
        var meta = document.createElement('div');
        meta.className = 'crono-cycle-meta';
        meta.textContent = item.targetSeconds
          ? (formatCycleTime(studiedSeconds) + ' de ' + formatCycleTime(item.targetSeconds))
          : '';
        left.appendChild(name);
        if (meta.textContent) left.appendChild(meta);
        if (item.status === 'done' || item.status === 'skipped' || (idx === data.currentIndex && item.targetSeconds > 0)) {
          var badge = document.createElement('div');
          if (item.status === 'done') {
            badge.className = 'crono-cycle-badge done';
            badge.textContent = 'Concluida';
          } else if (item.status === 'skipped') {
            badge.className = 'crono-cycle-badge skipped';
            badge.textContent = formatCycleTime(pendingSeconds) + ' pendente(s)';
          } else {
            badge.className = 'crono-cycle-badge current';
            badge.textContent = 'Materia atual';
          }
          left.appendChild(badge);
        }

        var right = document.createElement('div');
        right.className = 'crono-cycle-right';
        var hoursInput = document.createElement('input');
        hoursInput.type = 'text';
        hoursInput.value = item.targetSeconds ? formatDurationInput(item.targetSeconds) : '';
        hoursInput.placeholder = 'Ex. 3h30';
        hoursInput.addEventListener('change', function () {
          updateCycleHours(item.id, hoursInput.value);
          renderCycleList();
        });
        right.appendChild(hoursInput);

        var delBtn = document.createElement('div');
        delBtn.innerHTML = '×';
        delBtn.style.cssText = 'position:absolute;top:-5px;right:-5px;font-size:10px;color:#fff;cursor:pointer;line-height:1;background:var(--bg2);border-radius:50%;width:14px;height:14px;display:flex;align-items:center;justify-content:center;border:1px solid var(--border2);box-shadow:0 1px 3px rgba(0,0,0,0.5);z-index:10;transition:all 0.15s ease';
        delBtn.title = 'Remover matéria do ciclo';
        delBtn.onmouseover = function() { delBtn.style.background = 'var(--red)'; delBtn.style.borderColor = 'var(--red)'; delBtn.style.transform = 'scale(1.1)'; };
        delBtn.onmouseout = function() { delBtn.style.background = 'var(--bg2)'; delBtn.style.borderColor = 'var(--border2)'; delBtn.style.transform = 'none'; };
        delBtn.onclick = function(e) {
          e.stopPropagation();
          removeCycleItem(item.id);
          renderCycleList();
        };

        if (item.status === 'done' || item.status === 'skipped') {
            var reBtn = document.createElement('div');
            reBtn.innerHTML = '⟲';
            reBtn.style.cssText = 'position:absolute;top:-5px;right:15px;font-size:12px;color:#fff;cursor:pointer;line-height:1;background:var(--accent);border-radius:50%;width:14px;height:14px;display:flex;align-items:center;justify-content:center;border:1px solid var(--border2);box-shadow:0 1px 3px rgba(0,0,0,0.5);z-index:10;transition:all 0.15s ease;font-weight:bold';
            reBtn.title = 'Reativar matéria e recarregar meta de horas';
            reBtn.onmouseover = function() { reBtn.style.transform = 'scale(1.1)'; };
            reBtn.onmouseout = function() { reBtn.style.transform = 'none'; };
            reBtn.onclick = function(e) {
                e.stopPropagation();
                reactivateCycleItem(item.id);
                renderCycleList();
                if (typeof window.renderCrono === 'function') window.renderCrono();
            };
            card.appendChild(reBtn);
        }

        card.appendChild(slot);
        card.appendChild(left);
        card.appendChild(right);
        card.appendChild(delBtn);
        cycleList.appendChild(card);
      });

      var endDrop = document.createElement('div');
      endDrop.className = 'crono-cycle-drop-end';
      endDrop.textContent = 'Arraste uma materia para colocar no fim da ordem';
      endDrop.addEventListener('dragover', function (e) {
        e.preventDefault();
        endDrop.classList.add('drag-over');
      });
      endDrop.addEventListener('dragleave', function () { endDrop.classList.remove('drag-over'); });
      endDrop.addEventListener('drop', function (e) {
        e.preventDefault();
        endDrop.classList.remove('drag-over');
        var draggedEntryId = e.dataTransfer.getData('text/cycle-entry');
        var draggedBaseId = e.dataTransfer.getData('text/cycle-base');
        var draggedId = draggedEntryId || draggedBaseId;
        if (!draggedId) return;
        placeCycleItem(draggedId, data.items.length);
        renderCycleList();
      });
      cycleList.appendChild(endDrop);
    }
    for (var i = 0; i <= 6; i++) {
      (function (idx) {
        var d = new Date();
        d.setHours(12, 0, 0, 0);
        d.setDate(d.getDate() - d.getDay() + idx);
        var ds = CT._dateString(d);
        var isToday = ds === CT._today();
        var dayBlock = document.createElement('div');
        dayBlock.style.cssText = 'background:var(--bg3);border:1px solid ' + (isToday ? 'var(--accent)' : 'var(--border)') + ';border-radius:10px;margin-bottom:8px';
        var hdr = document.createElement('div');
        hdr.style.cssText = 'padding:7px 14px;border-bottom:1px solid var(--border)';
        var nm = document.createElement('span');
        nm.style.cssText = 'font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:' + (isToday ? 'var(--accent)' : 'var(--text2)');
        nm.textContent = dayNames[d.getDay()];
        hdr.appendChild(nm);
        dayBlock.appendChild(hdr);
        var zone = document.createElement('div');
        zone.setAttribute('data-ds', ds);
        zone.setAttribute('data-dropzone', '1');
        zone.style.cssText = 'padding:8px 12px;display:flex;flex-wrap:wrap;gap:6px;min-height:36px;align-items:center;border-radius:0 0 10px 10px';
        zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.style.background = 'rgba(79,142,247,0.1)'; });
        zone.addEventListener('dragleave', function () { zone.style.background = ''; });
        zone.addEventListener('drop', function (e) {
          e.preventDefault();
          zone.style.background = '';
          var nome = e.dataTransfer.getData('text/plain');
          if (!nome) return;
          var cur = window._cData[ds] || [];
          if (cur.includes(nome) || cur.length >= 5) return;
          cur.push(nome);
          window._cData[ds] = cur;
          window._saveC();
          window.renderDropZone(ds, zone);
        });
        dayBlock.appendChild(zone);
        daysContainer.appendChild(dayBlock);
        window.renderDropZone(ds, zone);
      })(i);
    }

    function rerenderCycle() {
      if (!document.getElementById('modalCrono')) return;
      renderCyclePalette();
      renderCycleList();
    }
    window.addEventListener('ct-cycle-updated', rerenderCycle);

    newAddBtn.addEventListener('click', function () {
      var nome = sanitizeName(newInp.value);
      if (!nome) return;
      var cor = newColorBtn.getAttribute('data-cor');
      var mats = window._getCronoMats();
      if (!mats.some(function (m) { return normName(m.nome) === normName(nome); })) {
        mats.push({ nome: nome, cor: cor, materiaId: resolveMateriaId(nome) || '' });
        window._saveCronoMats(mats);
      }
      newInp.value = '';
      renderMatsChips();
      renderCyclePalette();
      renderCycleList();
    });
    newInp.addEventListener('keydown', function (e) { if (e.key === 'Enter') newAddBtn.click(); });

    var clearBtn = document.createElement('button');
    clearBtn.textContent = 'Limpar cronograma';
    clearBtn.style.cssText = 'padding:10px 16px;border:1px solid var(--red);border-radius:8px;background:transparent;color:var(--red);font-family:var(--sans);font-size:13px;font-weight:600;cursor:pointer;flex-shrink:0';
    clearBtn.addEventListener('click', function () {
      window._cData = {};
      window._saveC();
      closeModal();
      window.abrirModalCrono();
    });
    var closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'flex:1;padding:10px;border:1px solid var(--border);border-radius:8px;background:transparent;color:var(--text3);font-family:var(--sans);font-size:14px;cursor:pointer';
    closeBtn.textContent = getViewMode() === 'cycle' ? 'Escolher Cronograma Semanal' : 'Fechar';
    closeBtn.addEventListener('click', function () {
      persistVisibleMatColors();
      if (getViewMode() === 'cycle') setViewMode('weekly');
      closeModal();
    });
    front.footer.appendChild(clearBtn);
    front.footer.appendChild(closeBtn);

    var resetCycleBtn = document.createElement('button');
    resetCycleBtn.textContent = 'Limpar Ciclo';
    resetCycleBtn.style.cssText = 'padding:10px 16px;border:1px solid var(--red);border-radius:8px;background:transparent;color:var(--red);font-family:var(--sans);font-size:13px;font-weight:600;cursor:pointer;flex-shrink:0';
    resetCycleBtn.addEventListener('click', function () {
      var r = loadCycleRaw();
      r.entries = [];
      r.currentItemId = '';
      saveCycleRaw(r);
      renderCycleList();
    });
    var closeCycleBtn = document.createElement('button');
    closeCycleBtn.textContent = 'Escolher Ciclo de Estudos';
    closeCycleBtn.style.cssText = 'flex:1;padding:10px;border:none;border-radius:8px;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;font-family:var(--sans);font-size:14px;font-weight:700;cursor:pointer';
    closeCycleBtn.addEventListener('click', function () {
      persistVisibleMatColors();
      setViewMode('cycle');
      closeModal();
    });
    back.footer.appendChild(resetCycleBtn);
    back.footer.appendChild(closeCycleBtn);

    renderMatsChips();
    renderCyclePalette();
    renderCycleList();
    updateDashboardCardHeader();
    setFace(getViewMode() === 'cycle');
  };

  bindTimerBridge();
  
  // Initial render with retry mechanism to ensure cId is ready and dashboard is updated
  (function initDashboard() {
    if (typeof window.renderCrono === 'function') {
        window.renderCrono();
        // Check again in 300ms to be absolutely sure the main app finished its slow init
        setTimeout(window.renderCrono, 300);
    } else {
        setTimeout(initDashboard, 50);
    }
  })();
})();

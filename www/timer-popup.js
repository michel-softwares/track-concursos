/**
 * Track Concursos — timer-popup.js
 * ================================
 * Timer flutuante inline (popup) que funciona em qualquer página.
 * Inclui modo Livre e Pomodoro com salvamento de sessão via CT.
 * 
 * Uso: <script src="timer-popup.js"></script> (após data.js)
 * Automaticamente cria o botão flutuante e o painel popup.
 */

(function () {
  'use strict';

  // ─── INJECT CSS ───────────────────────────────────────
  const css = document.createElement('style');
  css.textContent = `
    #timerFab {
      position: fixed; bottom: 28px; left: 215px; right: auto; z-index: 900;
      width: 44px; height: 44px; border-radius: 50%;
      background: linear-gradient(135deg, #4f8ef7, #7c5cfc);
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; cursor: pointer;
      box-shadow: 0 4px 20px rgba(79,142,247,0.5);
      transition: transform 0.2s, box-shadow 0.2s;
      user-select: none;
      touch-action: none;
    }
    #timerFab:hover { transform: scale(1.05); box-shadow: 0 6px 28px rgba(79,142,247,0.65); }
    #timerFab.dragging { opacity: 0.8; transform: scale(1.1); transition: none; cursor: grabbing; }
    #timerFab.running { animation: fabPulse 2s ease-in-out infinite; }
    #timerFab::after {
      content: attr(data-tooltip);
      position: absolute;
      left: 50%;
      bottom: calc(100% + 14px);
      transform: translateX(-50%) translateY(4px);
      background: rgba(19,22,30,0.96);
      color: var(--text, #e8eaf2);
      border: 1px solid rgba(79,142,247,0.22);
      border-radius: 10px;
      padding: 7px 10px;
      font-family: var(--sans, "Inter", sans-serif);
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
      box-shadow: 0 10px 24px rgba(0,0,0,0.38);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.16s ease, transform 0.16s ease;
    }
    #timerFab:hover::after {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    @keyframes fabPulse {
      0%,100% { box-shadow: 0 4px 20px rgba(79,142,247,0.5); }
      50% { box-shadow: 0 4px 28px rgba(62,207,142,0.6); }
    }
    #timerFab .fab-badge {
      position: absolute; bottom: -10px; left: 50%;
      transform: translateX(-50%);
      background: var(--bg3, #1a1e2a); color: var(--accent, #4f8ef7);
      font-size: 11px; font-weight: 800; font-family: var(--mono, monospace);
      padding: 3px 8px; border-radius: 12px;
      border: 1px solid var(--accent, #4f8ef7);
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      display: none;
      white-space: nowrap;
      pointer-events: none;
    }
    #timerFab.running .fab-badge { display: block; border-color: var(--green, #3ecf8e); color: var(--green, #3ecf8e); }

    /* OVERLAY */
    #timerOverlay {
      display: none; position: fixed; inset: 0;
      background: rgba(0,0,0,0.5); z-index: 9998;
    }

    /* PANEL */
    #timerPopup {
      display: none; position: fixed;
      bottom: 90px; left: 228px; right: auto;
      width: 310px;
      background: var(--bg2, #13161e);
      border: 1px solid var(--border2, #2e3347);
      border-radius: 18px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(79,142,247,0.1);
      z-index: 9999;
      user-select: none;
      overflow: hidden;
    }
    #timerPopup.minimized {
        display: none !important;
    }

    /* HANDLE */
    .tp-handle {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px 8px;
      background: var(--bg3, #1a1e2a);
      border-bottom: 1px solid var(--border, #252836);
    }
    .tp-handle-title { font-size: 12px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text3, #555a72); }
    .tp-actions { display: flex; gap: 8px; align-items: center; }
    .tp-action-btn { background: none; border: none; color: var(--text3, #555a72); font-size: 18px; cursor: pointer; padding: 4px; transition: color 0.15s; line-height: 1; display: flex; align-items: center; justify-content: center; }
    .tp-action-btn:hover { color: var(--accent, #4f8ef7); }
    .tp-action-btn.red:hover { color: var(--red, #f55a5a); }

    /* MODE TABS */
    .tp-tabs { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid var(--border, #252836); }
    .tp-tab { padding: 8px; text-align: center; font-size: 12px; font-weight: 600; color: var(--text3, #555a72); cursor: pointer; border: none; background: none; font-family: var(--sans, 'DM Sans', sans-serif); transition: all 0.15s; }
    .tp-tab:first-child { border-right: 1px solid var(--border, #252836); }
    .tp-tab.active { color: var(--accent, #4f8ef7); background: rgba(79,142,247,0.06); }

    /* MATERIA/TOPICO SELECT */
    .tp-selectors { padding: 10px 14px 6px; display:flex; flex-direction:column; gap:6px; }
    .tp-selectors select {
      width: 100%; background: var(--bg3, #1a1e2a); border: 1px solid var(--border2, #2e3347);
      border-radius: 8px; padding: 6px 10px; color: var(--text2, #8b90a8);
      font-family: var(--sans, 'DM Sans', sans-serif); font-size: 12px; font-weight: 600;
      outline: none; cursor: pointer; transition: border-color 0.15s;
    }
    .tp-selectors select:focus { border-color: var(--accent, #4f8ef7); }
    .tp-selectors select:disabled { opacity: 0.5; cursor: not-allowed; }

    /* TIMER DISPLAY */
    .tp-body { padding: 12px 14px 16px; }
    .tp-ring-wrap { text-align: center; margin-bottom: 16px; }
    .tp-ring { width: 130px; height: 130px; margin: 0 auto 8px; position: relative; }
    .tp-ring svg { transform: rotate(-90deg); }
    .tp-ring-bg { fill: none; stroke: var(--bg3, #1a1e2a); stroke-width: 6; }
    .tp-ring-prog { fill: none; stroke-width: 6; stroke-linecap: round; transition: stroke-dashoffset 1s linear; }
    .tp-ring-inner { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .tp-time { font-family: var(--mono, monospace); font-size: 26px; font-weight: 700; color: var(--text, #e8eaf2); line-height: 1; letter-spacing: -1px; }
    .tp-status { font-size: 12px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 4px; }

    /* CONTROLS */
    .tp-controls { display: flex; align-items: center; justify-content: center; gap: 10px; }
    .tp-btn { width: 38px; height: 38px; border-radius: 50%; border: 1px solid var(--border2, #2e3347); background: var(--bg3, #1a1e2a); color: var(--text2, #8b90a8); font-size: 15px; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; justify-content: center; }
    .tp-btn:hover { border-color: var(--text2, #8b90a8); color: var(--text, #e8eaf2); }
    .tp-btn.primary { width: 52px; height: 52px; font-size: 20px; background: linear-gradient(135deg, var(--accent, #4f8ef7), var(--accent2, #7c5cfc)); border: none; color: #fff; box-shadow: 0 4px 16px rgba(79,142,247,0.35); }
    .tp-btn.primary:hover { transform: scale(1.06); box-shadow: 0 6px 20px rgba(79,142,247,0.45); }
    .tp-btn.stop:hover { border-color: var(--red, #f55a5a); color: var(--red, #f55a5a); }

    /* SESSION LOG */
    .tp-log { margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--border, #252836); }
    .tp-log-title { font-size: 12px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text3, #555a72); margin-bottom: 6px; }
    .tp-log-entry { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text2, #8b90a8); padding: 4px 0; border-bottom: 1px solid var(--border, #252836); }
    .tp-log-entry:last-child { border-bottom: none; }
    .tp-log-name { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tp-log-time { font-family: var(--mono, monospace); font-size: 12px; color: var(--green, #3ecf8e); font-weight: 700; flex-shrink: 0; }
    .tp-log-del { background: none; border: none; color: var(--text3, #555a72); font-size: 12px; cursor: pointer; padding: 2px 4px; border-radius: 4px; transition: all 0.15s; flex-shrink: 0; line-height: 1; }
    .tp-log-del:hover { color: var(--red, #f55a5a); background: rgba(245,90,90,0.1); }

    /* POMODORO */
    .tp-pomo { padding: 12px 14px 16px; }
    .tp-pomo-cycles { display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 12px; }
    .tp-pomo-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--bg3, #1a1e2a); border: 1px solid var(--border2, #2e3347); transition: all 0.3s; }
    .tp-pomo-dot.done { background: var(--accent, #4f8ef7); border-color: var(--accent, #4f8ef7); }
    .tp-pomo-dot.current { background: var(--green, #3ecf8e); border-color: var(--green, #3ecf8e); box-shadow: 0 0 6px rgba(62,207,142,0.5); }
    .tp-pomo-fase { text-align: center; margin-bottom: 10px; }
    .tp-fase-badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; }
    .tp-fase-badge.foco   { background: rgba(79,142,247,0.12); color: var(--accent, #4f8ef7); border: 1px solid rgba(79,142,247,0.25); }
    .tp-fase-badge.pausa  { background: rgba(62,207,142,0.12); color: var(--green, #3ecf8e); border: 1px solid rgba(62,207,142,0.25); }
    .tp-fase-badge.longa  { background: rgba(124,92,252,0.12); color: var(--accent2, #7c5cfc); border: 1px solid rgba(124,92,252,0.25); }
    .tp-pomo-config { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 12px; }
    .tp-cfg-item { background: var(--bg3, #1a1e2a); border: 1px solid var(--border, #252836); border-radius: 8px; padding: 6px 8px; text-align: center; }
    .tp-cfg-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text3, #555a72); margin-bottom: 4px; }
    .tp-cfg-input { width: 100%; background: transparent; border: none; color: var(--accent, #4f8ef7); font-family: var(--mono, monospace); font-size: 16px; font-weight: 700; text-align: center; outline: none; -moz-appearance: textfield; appearance: textfield; }
    .tp-cfg-input::-webkit-inner-spin-button, .tp-cfg-input::-webkit-outer-spin-button { -webkit-appearance: none; }
    .tp-cfg-unit { font-size: 8px; color: var(--text3, #555a72); margin-top: 1px; }
    .tp-pomo-time { text-align: center; font-family: var(--mono, monospace); font-size: 36px; font-weight: 700; color: var(--text, #e8eaf2); letter-spacing: -2px; line-height: 1; margin-bottom: 14px; }
    .tp-pomo-bar { height: 4px; background: var(--bg3, #1a1e2a); border-radius: 4px; overflow: hidden; margin-bottom: 5px; }
    .tp-pomo-fill { height: 100%; border-radius: 4px; transition: width 1s linear; }
    .tp-pomo-fill.foco  { background: linear-gradient(90deg, var(--accent, #4f8ef7), var(--accent2, #7c5cfc)); }
    .tp-pomo-fill.pausa { background: var(--green, #3ecf8e); }
    .tp-pomo-fill.longa { background: var(--accent2, #7c5cfc); }
    .tp-pomo-row { display: flex; justify-content: space-between; font-family: var(--mono, monospace); font-size: 12px; color: var(--text3, #555a72); }

    /* FINALIZATION MODAL */
    #tpSessionModal {
      display: none; position: absolute; inset: 0;
      background: var(--bg2, #13161e); z-index: 10000;
      border-radius: 18px; padding: 16px; flex-direction: column;
    }
    .tp-modal-title { font-size: 14px; font-weight: 700; color: var(--text, #e8eaf2); margin-bottom: 4px; text-align: center; }
    .tp-modal-sub { font-size: 10px; color: var(--text3, #555a72); margin-bottom: 12px; text-align: center; text-transform: uppercase; letter-spacing: 1px; }
    .tp-modal-field { margin-bottom: 10px; }
    .tp-modal-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text3, #555a72); margin-bottom: 4px; }
    .tp-modal-select {
      width: 100%; background: var(--bg3, #1a1e2a); border: 1px solid var(--border2, #2e3347);
      border-radius: 8px; padding: 6px 10px; color: var(--text2, #8b90a8);
      font-family: var(--sans, sans-serif); font-size: 12px; font-weight: 600; outline: none;
    }
    .tp-modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
    .tp-modal-input {
      width: 100%; background: var(--bg3, #1a1e2a); border: 1px solid var(--border2, #2e3347);
      border-radius: 8px; padding: 6px; text-align: center; font-family: var(--mono, monospace);
      font-size: 16px; font-weight: 700; outline: none;
    }
    .tp-modal-input.c { color: var(--green, #3ecf8e); }
    .tp-modal-input.e { color: var(--red, #f55a5a); }
    .tp-modal-btns { display: flex; gap: 8px; margin-top: auto; }
    .tp-modal-btn {
      flex: 1; padding: 8px; border-radius: 8px; border: none; font-size: 12px; font-weight: 600; cursor: pointer;
    }
    .tp-modal-btn.cancel { background: transparent; border: 1px solid var(--border, #252836); color: var(--text3, #555a72); }
    .tp-modal-btn.save { background: linear-gradient(135deg, var(--accent, #4f8ef7), var(--accent2, #7c5cfc)); color: #fff; }
  `;
  document.head.appendChild(css);

  // ─── STATE (persisted in sessionStorage) ──────────────
  const SS_KEY = 'ct_timer_state';
  let state = loadState();

  function loadState() {
    try {
      const s = JSON.parse(sessionStorage.getItem(SS_KEY));
      if (s) return s;
    } catch (e) { }
    return {
      mode: 'free', open: false,
      freeRunning: false, freeSeconds: 0,
      pomoRunning: false, pomoFase: 'foco', pomoFocosFeitos: 0,
      pomoTotal: 0, pomoElapsed: 0, pomoAccumulatedTime: 0,
      cfgFoco: 25, cfgPausa: 5, cfgLonga: 15,
      selectedMateria: '', selectedTopic: '', selectedSubtopic: '',
      sessions: [], minimized: false,
      lastTick: null, cyclePreset: null,
      fabPos: { x: 215, y: 28 } // x is from left, y is from bottom (matching default css)
    };
  }

  function saveState() {
    sessionStorage.setItem(SS_KEY, JSON.stringify(state));
  }

  function refreshState() {
    try {
      const s = JSON.parse(sessionStorage.getItem(SS_KEY));
      if (s) {
          // Merge current local state with fresh storage state
          state = { ...state, ...s };
      }
    } catch (e) { }
  }

  window._refreshTimerState = refreshState;

  // Recover elapsed time from navigation
  if (state.lastTick && (state.freeRunning || state.pomoRunning)) {
    const elapsed = Math.floor((Date.now() - state.lastTick) / 1000);
    if (elapsed > 0 && elapsed < 7200) { // max 2h gap
      if (state.freeRunning) state.freeSeconds += elapsed;
      if (state.pomoRunning) state.pomoElapsed += elapsed;
    }
  }

  // ─── BUILD HTML ───────────────────────────────────────
  // Remove old timer triggers
  document.querySelectorAll('#timerTrigger, [onclick*="timer.html"]').forEach(function (el) {
    // Only remove floating timer buttons, not nav items
    if (el.style && el.style.position === 'fixed') el.remove();
  });

  // FAB button
  const fab = document.createElement('div');
  fab.id = 'timerFab';
  fab.setAttribute('data-tooltip', 'Arraste para qualquer lugar');
  fab.innerHTML = '⏱️<span class="fab-badge" id="fabBadge"></span>';
  
  // Apply saved position
  if (state.fabPos) {
      fab.style.left = state.fabPos.x + 'px';
      fab.style.bottom = state.fabPos.y + 'px';
      fab.style.right = 'auto'; // ensure left takes priority
  }

  fab.addEventListener('click', function(e) { 
      if (fab.dataset.dragged === 'true') return; // skip if just dragged
      togglePopup(); 
  });
  document.body.appendChild(fab);

  // Mantem o cronometro acessivel em todas as telas que carregam este script.
  function updateFabVisibility() {
      const isRunning = state.freeRunning || state.pomoRunning;
      fab.style.display = 'flex';
      fab.classList.toggle('running', isRunning);
  }
  updateFabVisibility();

  // DRAGGABLE LOGIC
  (function initDraggable() {
      let isDragging = false;
      let startX, startY, origX, origY;

      fab.addEventListener('mousedown', dragStart);
      window.addEventListener('mousemove', dragMove);
      window.addEventListener('mouseup', dragEnd);

      function dragStart(e) {
          if (e.target.closest('.tp-action-btn')) return;
          isDragging = true;
          fab.dataset.dragged = 'false';
          fab.classList.add('dragging');
          const rect = fab.getBoundingClientRect();
          startX = e.clientX;
          startY = e.clientY;
          origX = rect.left;
          origY = rect.top;
      }

      function dragMove(e) {
          if (!isDragging) return;
          fab.dataset.dragged = 'true';
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;
          
          let newX = origX + dx;
          let newY = origY + dy;

          // Constraints
          newX = Math.max(0, Math.min(window.innerWidth - 44, newX));
          newY = Math.max(0, Math.min(window.innerHeight - 44, newY));

          fab.style.left = newX + 'px';
          fab.style.top = newY + 'px';
          fab.style.bottom = 'auto';
      }

      function dragEnd(e) {
          if (!isDragging) return;
          isDragging = false;
          fab.classList.remove('dragging');
          
          // Save position (relative to bottom-left for persistence consistency)
          const rect = fab.getBoundingClientRect();
          state.fabPos = { 
              x: rect.left, 
              y: window.innerHeight - rect.bottom 
          };
          saveState();
          
          // small delay to prevent click fire
          setTimeout(() => { fab.dataset.dragged = 'false'; }, 50);
      }
  })();

  // Overlay (Removed to allow interaction)
  // const overlay = document.createElement('div'); ...

  // Load materias for select
  const cId = sessionStorage.getItem('ct_concurso_ativo');
  let materias = [];
  if (cId && typeof CT !== 'undefined') {
    materias = CT.getMaterias(cId);
  }
  const matOptions = materias.map(function (m) {
    return '<option value="' + m.id + '"' + (state.selectedMateria === m.id ? ' selected' : '') + '>' + m.nome + '</option>';
  }).join('');

  // Panel
  const panel = document.createElement('div');
  panel.id = 'timerPopup';
  panel.innerHTML = `
    <div class="tp-handle">
      <span class="tp-handle-title">⏱ Cronômetro</span>
      <div class="tp-actions">
        <button class="tp-action-btn" id="tpMinimize" title="Minimizar">➖</button>
        <button class="tp-action-btn red" id="tpClose" title="Encerrar">✕</button>
      </div>
    </div>
    <div class="tp-tabs">
      <button class="tp-tab${state.mode === 'free' ? ' active' : ''}" id="tpTabFree">⏱ Livre</button>
      <button class="tp-tab${state.mode === 'pomo' ? ' active' : ''}" id="tpTabPomo">🍅 Pomodoro</button>
    </div>
    <div class="tp-selectors">
      <select id="tpMatSelect">
        <option value="">— Selecione a matéria —</option>
        ${matOptions}
      </select>
      <select id="tpTopicSelect" disabled>
        <option value="">— Selecione o tópico —</option>
      </select>
      <select id="tpSubtopicSelect" disabled>
        <option value="">— Selecione o subtópico —</option>
      </select>
    </div>

    <!-- MODO LIVRE -->
    <div class="tp-body" id="tpFreePanel" style="${state.mode === 'free' ? 'display:block' : 'display:none'}">
      <div class="tp-ring-wrap">
        <div class="tp-ring">
          <svg width="130" height="130" viewBox="0 0 130 130">
            <circle class="tp-ring-bg" cx="65" cy="65" r="56"/>
            <circle class="tp-ring-prog" id="tpRingProg" cx="65" cy="65" r="56"
              stroke="var(--accent, #4f8ef7)"
              stroke-dasharray="351.86"
              stroke-dashoffset="351.86"/>
          </svg>
          <div class="tp-ring-inner">
            <div class="tp-time" id="tpFreeTime">00:00:00</div>
            <div class="tp-status" id="tpFreeStatus" style="color:var(--text3)">PRONTO</div>
          </div>
        </div>
      </div>
      <div class="tp-controls">
        <button class="tp-btn stop" title="Parar e registrar" id="tpBtnStop">⏹</button>
        <button class="tp-btn primary" id="tpBtnPlay">▶</button>
        <button class="tp-btn" title="Resetar" id="tpBtnReset">↺</button>
      </div>
      <div class="tp-log" id="tpLog" style="display:none">
        <div class="tp-log-title">Sessões de hoje</div>
        <div id="tpLogEntries"></div>
      </div>
    </div>

    <!-- MODO POMODORO -->
    <div class="tp-pomo" id="tpPomoPanel" style="${state.mode === 'pomo' ? 'display:block' : 'display:none'}">
      <div class="tp-pomo-cycles" id="tpPomoCycles">
        <div class="tp-pomo-dot${state.pomoFocosFeitos % 4 > 0 ? ' done' : ''}${state.pomoFase === 'foco' && state.pomoFocosFeitos % 4 === 0 ? ' current' : ''}"></div>
        <div class="tp-pomo-dot${state.pomoFocosFeitos % 4 > 1 ? ' done' : ''}${state.pomoFase === 'foco' && state.pomoFocosFeitos % 4 === 1 ? ' current' : ''}"></div>
        <div class="tp-pomo-dot${state.pomoFocosFeitos % 4 > 2 ? ' done' : ''}${state.pomoFase === 'foco' && state.pomoFocosFeitos % 4 === 2 ? ' current' : ''}"></div>
        <div class="tp-pomo-dot${state.pomoFocosFeitos % 4 > 3 ? ' done' : ''}${state.pomoFase === 'foco' && state.pomoFocosFeitos % 4 === 3 ? ' current' : ''}"></div>
        <span style="font-size:12px;color:var(--text3,#555a72);margin-left:4px" id="tpPomoCycleLabel">ciclo 1/4</span>
      </div>
      <div class="tp-pomo-fase">
        <span class="tp-fase-badge foco" id="tpPomoFaseBadge">🎯 Foco</span>
      </div>
      <div class="tp-pomo-config">
        <div class="tp-cfg-item">
          <div class="tp-cfg-label">🎯 Foco</div>
          <input class="tp-cfg-input" type="number" id="tpCfgFoco" value="${state.cfgFoco}" min="1" max="120">
          <div class="tp-cfg-unit">min</div>
        </div>
        <div class="tp-cfg-item">
          <div class="tp-cfg-label">☕ Pausa</div>
          <input class="tp-cfg-input" type="number" id="tpCfgPausa" value="${state.cfgPausa}" min="1" max="60">
          <div class="tp-cfg-unit">min</div>
        </div>
        <div class="tp-cfg-item">
          <div class="tp-cfg-label" style="color:var(--accent2,#7c5cfc)">🛋 Longa</div>
          <input class="tp-cfg-input" type="number" id="tpCfgLonga" value="${state.cfgLonga}" min="1" max="60" style="color:var(--accent2,#7c5cfc)">
          <div class="tp-cfg-unit">min</div>
        </div>
      </div>
      <div class="tp-pomo-time" id="tpPomoTime">25:00</div>
      <div style="margin-bottom:14px">
        <div class="tp-pomo-bar"><div class="tp-pomo-fill foco" id="tpPomoFill" style="width:0%"></div></div>
        <div class="tp-pomo-row">
          <span id="tpPomoElapsed">0:00 decorrido</span>
          <span id="tpPomoRemaining">25:00 restante</span>
        </div>
      </div>
      <div class="tp-controls">
        <button class="tp-btn stop" title="Parar" id="tpBtnPomoStop">⏹</button>
        <button class="tp-btn primary" id="tpBtnPomoPlay">▶</button>
        <button class="tp-btn" title="Pular fase" id="tpBtnPomoSkip">⏭</button>
      </div>
    </div>
    
    <!-- MODAL DE SESSÃO -->
    <div id="tpSessionModal">
      <div class="tp-modal-title">Sessão Concluída 👏</div>
      <div class="tp-modal-sub" id="tpModalDuracao">00:00 estudado</div>
      
      <div class="tp-modal-field">
        <div class="tp-modal-label">Tipo de Estudo</div>
        <select class="tp-modal-select" id="tpModalTipo">
          <option value="Estudo">📚 Estudo Teórico</option>
          <option value="Revisão">↺ Revisão</option>
          <option value="Resolução de Questões">📝 Resolução de Questões</option>
          <option value="Simulado">🎯 Simulado</option>
        </select>
      </div>

      <div class="tp-modal-field">
        <div class="tp-modal-label">Matéria & Tópico</div>
        <select class="tp-modal-select" id="tpModalMateria" style="margin-bottom:6px">
          <option value="">— Matéria —</option>
          ${matOptions}
        </select>
        <select class="tp-modal-select" id="tpModalTopico" style="margin-bottom:6px" disabled>
          <option value="">— Tópico —</option>
        </select>
        <select class="tp-modal-select" id="tpModalSubtopic" disabled>
          <option value="">— Subtópico —</option>
        </select>
      </div>

      <div class="tp-modal-field">
        <div class="tp-modal-label">Questões Resolvidas? (opicional)</div>
        <div class="tp-modal-grid">
          <input type="number" class="tp-modal-input c" id="tpModalAcertos" placeholder="Acertos" min="0">
          <input type="number" class="tp-modal-input e" id="tpModalErros" placeholder="Erros" min="0">
        </div>
      </div>

      <div class="tp-modal-btns">
        <button class="tp-modal-btn cancel" id="tpBtnModalCancel">Descartar</button>
        <button class="tp-modal-btn save" id="tpBtnModalSave">✓ Salvar Sessão</button>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  // ─── ELEMENTS ─────────────────────────────────────────
  const $close = document.getElementById('tpClose');
  const $tabFree = document.getElementById('tpTabFree');
  const $tabPomo = document.getElementById('tpTabPomo');
  const $freePanel = document.getElementById('tpFreePanel');
  const $pomoPanel = document.getElementById('tpPomoPanel');
  const $matSelect = document.getElementById('tpMatSelect');
  const $topicSelect = document.getElementById('tpTopicSelect');
  // Modal Variables
  let modalPendingDur = 0;
  let modalPendingOrigem = '';
  const $modal = document.getElementById('tpSessionModal');
  const $modalDuracao = document.getElementById('tpModalDuracao');
  const $modalTipo = document.getElementById('tpModalTipo');
  const $modalMat = document.getElementById('tpModalMateria');
  const $modalTopico = document.getElementById('tpModalTopico');
  const $modalAcertos = document.getElementById('tpModalAcertos');
  const $modalErros = document.getElementById('tpModalErros');
  const $btnModalCancel = document.getElementById('tpBtnModalCancel');
  const $btnModalSave = document.getElementById('tpBtnModalSave');
  const $modalSubtopic = document.getElementById('tpModalSubtopic');
  const $subtopicSelect = document.getElementById('tpSubtopicSelect');
  const $minimize = document.getElementById('tpMinimize');

  // Free
  const $freeTime = document.getElementById('tpFreeTime');
  const $freeStatus = document.getElementById('tpFreeStatus');
  const $ringProg = document.getElementById('tpRingProg');
  const $btnPlay = document.getElementById('tpBtnPlay');
  const $btnStop = document.getElementById('tpBtnStop');
  const $btnReset = document.getElementById('tpBtnReset');
  const $log = document.getElementById('tpLog');
  const $logEntries = document.getElementById('tpLogEntries');
  // Pomo
  const $pomoTime = document.getElementById('tpPomoTime');
  const $pomoFill = document.getElementById('tpPomoFill');
  const $pomoElapsed = document.getElementById('tpPomoElapsed');
  const $pomoRemaining = document.getElementById('tpPomoRemaining');
  const $pomoFaseBadge = document.getElementById('tpPomoFaseBadge');
  const $pomoCycleLabel = document.getElementById('tpPomoCycleLabel');
  const $btnPomoPlay = document.getElementById('tpBtnPomoPlay');
  const $btnPomoStop = document.getElementById('tpBtnPomoStop');
  const $btnPomoSkip = document.getElementById('tpBtnPomoSkip');
  const $cfgFoco = document.getElementById('tpCfgFoco');
  const $cfgPausa = document.getElementById('tpCfgPausa');
  const $cfgLonga = document.getElementById('tpCfgLonga');

  // ─── MATERIA / TOPICO SYNC ────────────────────────────
  function populateTopics(materiaId, targetSelect, selectedTopicId) {
    if (!materiaId || typeof CT === 'undefined') {
      targetSelect.innerHTML = '<option value="">— Selecione o tópico —</option>';
      targetSelect.disabled = true;
      return;
    }
    const topics = CT.getTopicos(materiaId);
    if (topics.length === 0) {
      targetSelect.innerHTML = '<option value="">Nenhum tópico cadastrado</option>';
      targetSelect.disabled = true;
      return;
    }
    targetSelect.innerHTML = '<option value="">— Selecione o tópico —</option>' + topics.map(function (t) {
      return '<option value="' + t.id + '"' + (selectedTopicId === t.id ? ' selected' : '') + '>' + t.nome + '</option>';
    }).join('');
    targetSelect.disabled = false;
  }

  function populateSubtopics(topicoId, targetSelect, selectedSubtopicId) {
    if (!topicoId || typeof CT === 'undefined') {
      targetSelect.innerHTML = '<option value="">— Selecione o subtópico —</option>';
      targetSelect.disabled = true;
      return;
    }
    const subs = CT.getSubtopicos(topicoId);
    if (subs.length === 0) {
      targetSelect.innerHTML = '<option value="">Sem subtópicos</option>';
      targetSelect.disabled = true;
      return;
    }
    targetSelect.innerHTML = '<option value="">— Selecione o subtópico —</option>' + subs.map(function (s) {
      return '<option value="' + s.id + '"' + (selectedSubtopicId === s.id ? ' selected' : '') + '>' + s.nome + '</option>';
    }).join('');
    targetSelect.disabled = false;
  }

  $matSelect.addEventListener('change', function () {
    state.selectedMateria = this.value;
    state.selectedTopic = '';
    state.selectedSubtopic = '';
    populateTopics(this.value, $topicSelect, '');
    populateSubtopics('', $subtopicSelect, '');
    saveState();
  });

  $topicSelect.addEventListener('change', function () {
    state.selectedTopic = this.value;
    state.selectedSubtopic = '';
    populateSubtopics(this.value, $subtopicSelect, '');
    saveState();
  });

  $subtopicSelect.addEventListener('change', function () {
    state.selectedSubtopic = this.value;
    saveState();
  });

  $modalMat.addEventListener('change', function () {
    populateTopics(this.value, $modalTopico, '');
    populateSubtopics('', $modalSubtopic, '');
  });

  $modalTopico.addEventListener('change', function () {
    populateSubtopics(this.value, $modalSubtopic, '');
  });

  // Restore selects on UI load
  if (state.selectedMateria) {
    populateTopics(state.selectedMateria, $topicSelect, state.selectedTopic);
    if (state.selectedTopic) {
      populateSubtopics(state.selectedTopic, $subtopicSelect, state.selectedSubtopic);
    }
  }

  // ─── MODAL LOGIC ──────────────────────────────────────
  function openSessionModal(durSeconds, origem) {
    modalPendingDur = durSeconds;
    modalPendingOrigem = origem;
    $modalDuracao.textContent = formatHMS(durSeconds) + ' estudado';

    // reset/sync inputs
    $modalAcertos.value = '';
    $modalErros.value = '';
    $modalTipo.value = 'Estudo';
    $modalMat.value = state.selectedMateria;
    populateTopics(state.selectedMateria, $modalTopico, state.selectedTopic);
    populateSubtopics(state.selectedTopic, $modalSubtopic, state.selectedSubtopic);

    $modal.style.display = 'flex';
  }

  function closeSessionModal() {
    $modal.style.display = 'none';
    modalPendingDur = 0;
    modalPendingOrigem = '';
  }

  function clearCyclePresetState() {
    state.cyclePreset = null;
    state.isRevisionCard = false;
    state.selectedTipo = '';
  }

  $btnModalCancel.addEventListener('click', function () {
    if (confirm('Tem certeza que deseja descartar este tempo estudado? Ele não vai para suas métricas.')) {
      if (modalPendingOrigem === 'pomodoro') {
        state.pomoAccumulatedTime = 0;
        saveState();
      }
      if (state.cyclePreset) clearCyclePresetState();
      closeSessionModal();
      if (modalPendingOrigem === 'timer_livre') resetFree();
    }
  });

  $btnModalSave.addEventListener('click', function () {
    if (modalPendingDur === 0) { closeSessionModal(); return; }

    const matId = $modalMat.value;
    const topicoId = $modalTopico.value || null;
    const subtopicoId = $modalSubtopic.value || null;
    const tipo = $modalTipo.value;
    const a = parseInt($modalAcertos.value) || 0;
    const e = parseInt($modalErros.value) || 0;

    let savedSessaoId = null;
    if (cId && typeof CT !== 'undefined') {
      savedSessaoId = CT.registrarSessao({
        concursoId: cId,
        materiaId: matId || null,
        topicoId: topicoId,
        subtopicoId: subtopicoId,
        duracaoSegundos: modalPendingDur,
        origem: modalPendingOrigem,
        tipoEstudo: tipo
      });

      if (a > 0 || e > 0) {
        CT.lancarQuestoes({
          concursoId: cId,
          materiaId: matId || null,
          topicoId: topicoId,
          subtopId: subtopicoId,
          resolvidas: a + e,
          acertos: a,
          erros: e
        });
      }
    }

    const matNameInfo = matId ? ($modalMat.options[$modalMat.selectedIndex].text) : (modalPendingOrigem === 'pomodoro' ? 'Pomodoro' : 'Livre');
    const cPreset = state.cyclePreset || null;
    const cItemId = cPreset ? cPreset.itemId : null;
    state.sessions.push({ dur: modalPendingDur, mat: matNameInfo, ts: Date.now(), sessaoId: savedSessaoId, materiaId: matId || null, cycleItemId: cItemId });
    renderSessions();
    if (cPreset) clearCyclePresetState();

    if (modalPendingOrigem === 'pomodoro') {
      state.pomoAccumulatedTime = 0;
      saveState();
    } else {
      resetFree();
    }
    closeSessionModal();
  });

  function openPopup() {
    refreshState();
    state.minimized = false;
    panel.style.display = 'block';
    panel.classList.remove('minimized');
    state.open = true;
    saveState();
    updateFreeDisplay();
    updatePomoDisplay();
    updateFabVisibility();
  }

  function minimizePopup() {
    state.minimized = true;
    panel.classList.add('minimized');
    state.open = true; // Still open, just hidden
    saveState();
  }

  function closePopup() {
    if (state.freeRunning || state.pomoRunning) {
        if (!confirm('Deseja encerrar o cronômetro? Se minimizar, o tempo continuará contando no botão flutuante.')) return;
    }
    panel.style.display = 'none';
    state.open = false;
    state.minimized = false;
    saveState();
  }

  function togglePopup() {
    if (state.open && !state.minimized) minimizePopup();
    else openPopup();
  }

  function refreshTimerState() {
     refreshState();
     updateFreeDisplay();
     updatePomoDisplay();
     updateFabVisibility();
     
     // Special Mode Handling
     if (state.selectedTipo) {
        $modalTipo.value = state.selectedTipo;
     }

     // If it's a revision card, it MUST NOT be disabled (so user can pick subject)
     const isRevision = !!state.isRevisionCard;
     if (isRevision) {
        $matSelect.disabled = false;
        $modalMat.disabled = false;
     }
  }

  // Global Exports for crono-cycle.js bridge
  window.openTimerPopup = openPopup;
  window.closeTimerPopup = closePopup;
  window.minimizeTimerPopup = minimizePopup;
  window.setTimerMode = setMode;
  window._refreshTimerState = refreshTimerState;

  $close.addEventListener('click', closePopup);
  $minimize.addEventListener('click', minimizePopup);

  // ─── MODE TABS ────────────────────────────────────────
  $tabFree.addEventListener('click', function () { setMode('free'); });
  $tabPomo.addEventListener('click', function () { setMode('pomo'); });

  function setMode(m) {
    refreshState();
    state.mode = m;
    $freePanel.style.display = m === 'free' ? 'block' : 'none';
    $pomoPanel.style.display = m === 'pomo' ? 'block' : 'none';
    $tabFree.classList.toggle('active', m === 'free');
    $tabPomo.classList.toggle('active', m === 'pomo');
    saveState();
    updateFreeDisplay();
    updatePomoDisplay();
    updateFabVisibility();
  }

  // ─── MATERIA SELECT ───────────────────────────────────
  $matSelect.addEventListener('change', function () {
    state.selectedMateria = this.value;
    saveState();
  });

  // ─── UTILS ────────────────────────────────────────────
  function formatHMS(s) {
    return String(Math.floor(s / 3600)).padStart(2, '0') + ':' +
      String(Math.floor((s % 3600) / 60)).padStart(2, '0') + ':' +
      String(s % 60).padStart(2, '0');
  }
  function formatMMSS(s) {
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' +
      String(s % 60).padStart(2, '0');
  }

  // ─── FREE MODE ────────────────────────────────────────
  let freeInterval = null;

  function updateFreeDisplay() {
    let displaySecs = state.freeSeconds;
    let ringPct = (state.freeSeconds % 3600) / 3600;
    
    if (state.cyclePreset) {
      displaySecs = Math.max(0, state.cyclePreset.startRemaining - state.freeSeconds);
      ringPct = state.cyclePreset.startRemaining > 0 ? (state.freeSeconds / state.cyclePreset.startRemaining) : 0;
    }

    $freeTime.textContent = formatHMS(displaySecs);
    $ringProg.style.strokeDashoffset = 351.86 - (351.86 * Math.min(1, ringPct));
    
    if (state.cyclePreset) {
        $freeStatus.textContent = displaySecs > 0 ? (state.freeRunning ? 'ESTUDANDO (REGRESSIVO)' : 'PAUSADO') : 'META BATIDA! 🎉';
        $freeStatus.style.color = displaySecs > 0 ? (state.freeRunning ? 'var(--green,#3ecf8e)' : 'var(--orange,#f5874a)') : 'var(--accent,#4f8ef7)';
    }

    // FAB badge
    const badge = document.getElementById('fabBadge');
    if (state.freeRunning || state.pomoRunning) {
      badge.style.display = '';
      badge.textContent = state.freeRunning ? formatMMSS(displaySecs) : formatMMSS(Math.max(0, state.pomoTotal - state.pomoElapsed));
      fab.classList.add('running');
    } else {
      badge.style.display = 'none';
      fab.classList.remove('running');
    }
  }

  function tickFree() {
    state.freeSeconds++;
    state.lastTick = Date.now();
    updateFreeDisplay();
    saveState();
  }

  function toggleFree() {
    state.freeRunning = !state.freeRunning;
    $btnPlay.textContent = state.freeRunning ? '⏸' : '▶';
    
    let runningText = state.cyclePreset ? 'ESTUDANDO (REGRESSIVO)' : 'ESTUDANDO';
    $freeStatus.textContent = state.freeRunning ? runningText : 'PAUSADO';
    $freeStatus.style.color = state.freeRunning ? 'var(--green,#3ecf8e)' : 'var(--orange,#f5874a)';
    
    if (state.freeRunning) {
      state.lastTick = Date.now();
      freeInterval = setInterval(tickFree, 1000);
    } else {
      clearInterval(freeInterval);
    }
    updateFabVisibility();
    saveState();
    updateFreeDisplay();
  }

  function stopFree() {
    if (state.freeSeconds === 0) return;
    clearInterval(freeInterval);
    state.freeRunning = false;
    $btnPlay.textContent = '▶';
    if (state.cyclePreset) {
        $freeStatus.textContent = 'PAUSADO';
        $freeStatus.style.color = 'var(--orange,#f5874a)';
    } else {
        $freeStatus.textContent = 'PRONTO';
        $freeStatus.style.color = 'var(--text3,#555a72)';
    }
    updateFabVisibility();
    saveState();
    updateFreeDisplay();
    openSessionModal(state.freeSeconds, 'timer_livre');
  }

  function resetFree() {
    clearInterval(freeInterval);
    state.freeRunning = false;
    state.freeSeconds = 0;
    state.lastTick = null;
    $btnPlay.textContent = '▶';
    
    if (state.cyclePreset) {
        $freeStatus.textContent = 'RECOMEÇAR CICLO';
        $freeStatus.style.color = 'var(--accent,#4f8ef7)';
    } else {
        $freeStatus.textContent = 'PRONTO';
        $freeStatus.style.color = 'var(--text3,#555a72)';
    }
    
    updateFreeDisplay();
    updateFabVisibility();
    saveState();
  }

  function renderSessions() {
    if (state.sessions.length === 0) { $log.style.display = 'none'; saveState(); return; }
    $log.style.display = '';
    $logEntries.innerHTML = state.sessions.slice(-5).reverse().map(function (s, ri) {
      var realIdx = state.sessions.length - 1 - ri;
      return '<div class="tp-log-entry">' +
        '<span class="tp-log-name">' + s.mat + '</span>' +
        '<span class="tp-log-time">' + formatHMS(s.dur) + '</span>' +
        '<button class="tp-log-del" data-idx="' + realIdx + '" title="Excluir sessão">✕</button>' +
        '</div>';
    }).join('');
    // Bind delete buttons
    $logEntries.querySelectorAll('.tp-log-del').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(this.dataset.idx);
        deleteSession(idx);
      });
    });
  }

  function deleteSession(idx) {
    if (idx < 0 || idx >= state.sessions.length) return;
    var session = state.sessions[idx];
    var removedByCT = false;
    // Remove from CT localStorage
    if (cId && typeof CT !== 'undefined') {
      try {
        var foundId = session.sessaoId || null;
        if (!foundId) {
          var allSessoes = JSON.parse(localStorage.getItem('ct_sessoes') || '[]');
          for (var i = allSessoes.length - 1; i >= 0; i--) {
            var s = allSessoes[i];
            if (s.concursoId === cId && s.duracaoSegundos === session.dur && s.materiaId === (session.materiaId || null)) {
              foundId = s.id;
              break;
            }
          }
        }
        if (foundId && typeof CT.excluirSessao === 'function') {
          removedByCT = CT.excluirSessao(foundId);
        }
      } catch (e) { }
    }
    if (!removedByCT && session.cycleItemId && typeof window.CTCycle !== 'undefined') {
      window.CTCycle.refundCycleTime(session.cycleItemId, session.dur, session.sessaoId);
    }
    state.sessions.splice(idx, 1);
    renderSessions();
    saveState();
  }

  $btnPlay.addEventListener('click', toggleFree);
  $btnStop.addEventListener('click', stopFree);
  $btnReset.addEventListener('click', resetFree);

  // ─── POMODORO MODE ────────────────────────────────────
  let pomoInterval = null;

  function getPomoConfig() {
    return {
      foco: parseInt($cfgFoco.value) * 60,
      pausa: parseInt($cfgPausa.value) * 60,
      longa: parseInt($cfgLonga.value) * 60,
    };
  }

  function initPomo() {
    const cfg = getPomoConfig();
    state.pomoTotal = cfg[state.pomoFase] || cfg.foco;
    state.pomoElapsed = 0;
    state.cfgFoco = parseInt($cfgFoco.value);
    state.cfgPausa = parseInt($cfgPausa.value);
    state.cfgLonga = parseInt($cfgLonga.value);
    updatePomoDisplay();
    saveState();
  }

  function updatePomoDisplay() {
    const rem = Math.max(0, state.pomoTotal - state.pomoElapsed);
    const pct = state.pomoTotal > 0 ? (state.pomoElapsed / state.pomoTotal) * 100 : 0;
    $pomoTime.textContent = formatMMSS(rem);
    $pomoFill.style.width = pct + '%';
    $pomoElapsed.textContent = formatMMSS(state.pomoElapsed) + ' decorrido';
    $pomoRemaining.textContent = formatMMSS(rem) + ' restante';
    updateFreeDisplay(); // For FAB badge
  }

  function updateFaseBadge() {
    const map = { foco: { cls: 'foco', txt: '🎯 Foco' }, pausa: { cls: 'pausa', txt: '☕ Pausa' }, longa: { cls: 'longa', txt: '🛋 Pausa longa' } };
    const m = map[state.pomoFase] || map.foco;
    $pomoFaseBadge.className = 'tp-fase-badge ' + m.cls;
    $pomoFaseBadge.textContent = m.txt;
    $pomoFill.className = 'tp-pomo-fill ' + (state.pomoFase || 'foco');
  }

  function updatePomoCycles() {
    const dots = document.querySelectorAll('#tpPomoCycles .tp-pomo-dot');
    dots.forEach(function (d, i) {
      d.classList.remove('done', 'current');
      if (i < state.pomoFocosFeitos % 4) d.classList.add('done');
      else if (i === state.pomoFocosFeitos % 4 && state.pomoFase === 'foco') d.classList.add('current');
    });
    $pomoCycleLabel.textContent = 'ciclo ' + (Math.floor(state.pomoFocosFeitos / 4) + 1) + '/4';
  }

  function togglePomo() {
    if (state.pomoTotal === 0) initPomo();
    state.pomoRunning = !state.pomoRunning;
    $btnPomoPlay.textContent = state.pomoRunning ? '⏸' : '▶';
    if (state.pomoRunning) {
      state.lastTick = Date.now();
      pomoInterval = setInterval(tickPomo, 1000);
    } else {
      clearInterval(pomoInterval);
    }
    saveState();
    updatePomoDisplay();
  }

  function tickPomo() {
    state.pomoElapsed++;
    state.lastTick = Date.now();
    if (state.pomoElapsed >= state.pomoTotal) { nextPomoFase(); return; }
    updatePomoDisplay();
    saveState();
  }

  function nextPomoFase() {
    clearInterval(pomoInterval);
    state.pomoRunning = false;
    $btnPomoPlay.textContent = '▶';

    if (state.pomoFase === 'foco') {
      const dur = state.pomoTotal; // segundos do foco
      state.pomoAccumulatedTime = (state.pomoAccumulatedTime || 0) + dur;

      state.pomoFocosFeitos++;
      state.pomoFase = state.pomoFocosFeitos % 4 === 0 ? 'longa' : 'pausa';
    } else {
      state.pomoFase = 'foco';
    }
    initPomo();
    updatePomoCycles();
    updateFaseBadge();
  }

  function stopPomo() {
    clearInterval(pomoInterval);
    state.pomoRunning = false;

    // Add current elapsed if in focus
    if (state.pomoFase === 'foco' && state.pomoElapsed > 0) {
      state.pomoAccumulatedTime = (state.pomoAccumulatedTime || 0) + state.pomoElapsed;
    }

    $btnPomoPlay.textContent = '▶';

    if (state.pomoAccumulatedTime > 0) {
      // Pause visual state but don't reset completely yet, wait for Modal
      saveState();
      openSessionModal(state.pomoAccumulatedTime, 'pomodoro');
    } else {
      // Reset if no time to save
      state.pomoFase = 'foco';
      state.pomoFocosFeitos = 0;
      state.pomoTotal = 0;
      state.pomoElapsed = 0;
      state.lastTick = null;
      initPomo();
      updatePomoCycles();
      updateFaseBadge();
      saveState();
    }
  }

  $btnPomoPlay.addEventListener('click', togglePomo);
  $btnPomoStop.addEventListener('click', stopPomo);
  $btnPomoSkip.addEventListener('click', nextPomoFase);

  [$cfgFoco, $cfgPausa, $cfgLonga].forEach(function (inp) {
    inp.addEventListener('change', function () {
      if (!state.pomoRunning) initPomo();
    });
  });

  // ─── RESTORE STATE ON LOAD ────────────────────────────
  updateFreeDisplay();
  renderSessions();
  updatePomoDisplay();
  updateFaseBadge();
  updatePomoCycles();

  if (state.freeRunning) {
    $btnPlay.textContent = '⏸';
    $freeStatus.textContent = 'ESTUDANDO';
    $freeStatus.style.color = 'var(--green,#3ecf8e)';
    freeInterval = setInterval(tickFree, 1000);
  }
  if (state.pomoRunning) {
    $btnPomoPlay.textContent = '⏸';
    pomoInterval = setInterval(tickPomo, 1000);
  }
  if (state.open) {
    if (state.minimized) minimizePopup();
    else openPopup();
  }

})();

(function() {
  const APP_VERSION = '1.0.1';
  const GITHUB_REPO = 'michel-softwares/track-concursos';
  const RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases/latest`;
  const RELEASE_CHECK_CACHE_KEY = 'ct_release_check_cache';
  const RELEASE_CHECK_START_PAGE_KEY = 'ct_release_check_start_page';
  const RELEASE_DISMISSED_KEY = 'ct_release_update_dismissed_tag';

  // Mapa de rotas: id do nav-item -> arquivo html
  const ROUTES = {
    'nav-concursos' : 'concursos.html',
    'nav-dashboard' : 'dashboard.html',
    'nav-materias'  : 'dashboard.html',
    'nav-revisoes'  : 'revisoes.html',
    'nav-historico' : 'historico.html',
    'nav-simulados' : 'simulados.html',
    'nav-edital'    : 'cadastro_edital.html',
    'nav-config'    : 'config.html',
  };

  // Detecta qual página está ativa pelo nome do arquivo
  const currentPage = window.location.pathname.split('/').pop() || 'concursos.html';

  let latestRelease = null;
  let releaseCheckStarted = false;

  function todayKey() {
    if (window.CT && typeof CT._today === 'function') return CT._today();
    return new Date().toISOString().slice(0, 10);
  }

  function readReleaseCache() {
    try {
      const raw = localStorage.getItem(RELEASE_CHECK_CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function writeReleaseCache(cache) {
    try {
      localStorage.setItem(RELEASE_CHECK_CACHE_KEY, JSON.stringify(cache || {}));
    } catch (error) {
      // Cache failure must never affect app startup.
    }
  }

  function getAppStartPage() {
    let startPage = sessionStorage.getItem(RELEASE_CHECK_START_PAGE_KEY);
    if (!startPage) {
      startPage = currentPage;
      sessionStorage.setItem(RELEASE_CHECK_START_PAGE_KEY, startPage);
    }
    return startPage;
  }

  function ensureVersionStyles() {
    if (document.getElementById('tc-version-style')) return;

    const style = document.createElement('style');
    style.id = 'tc-version-style';
    style.textContent = `
      .sidebar-logo{display:flex;flex-direction:column;align-items:center;gap:4px}
      .logo{flex-direction:column;align-items:flex-start;gap:3px}
      .tc-version-check{display:flex;flex-direction:column;align-items:center;gap:2px;line-height:1;text-align:center}
      .logo .tc-version-check{align-items:flex-start;margin-left:4px}
      .tc-version-current{font-family:var(--mono,'Inter',sans-serif);font-size:10px;font-weight:700;color:var(--text3);opacity:.76;letter-spacing:.02em}
      .tc-version-update{display:none;border:0;background:transparent;padding:0;font-family:var(--sans,'Inter',sans-serif);font-size:10px;font-weight:700;color:var(--green);cursor:pointer;line-height:1.25;text-decoration:none}
      .tc-version-update.visible{display:inline-flex}
      .tc-version-update.compact{width:14px;height:14px;border:1px solid var(--border);border-radius:999px;align-items:center;justify-content:center;color:var(--text3);font-size:9px;line-height:1;background:rgba(255,255,255,.03)}
      .tc-version-update:hover{color:var(--accent);text-decoration:underline;text-underline-offset:2px}
      .tc-version-update.compact:hover{text-decoration:none;border-color:var(--accent);color:var(--accent)}
      .tc-update-overlay{position:fixed;inset:0;background:var(--overlay,rgba(4,7,14,.72));z-index:99999;display:none;align-items:center;justify-content:center;padding:18px}
      .tc-update-overlay.visible{display:flex}
      .tc-update-card{width:min(360px,100%);background:var(--bg2);border:1px solid var(--border);border-radius:8px;box-shadow:var(--shadow-medium,0 24px 60px rgba(0,0,0,.46));padding:18px;color:var(--text)}
      .tc-update-title{font-size:16px;font-weight:800;color:var(--text2);margin-bottom:8px}
      .tc-update-text{font-size:13px;line-height:1.55;color:var(--text3);margin-bottom:14px}
      .tc-update-text strong{color:var(--text2);font-weight:800}
      .tc-update-actions{display:flex;gap:8px;justify-content:flex-end}
      .tc-update-btn{border:1px solid var(--border);border-radius:8px;background:transparent;color:var(--text2);font:700 12px var(--sans,'Inter',sans-serif);padding:9px 12px;cursor:pointer;transition:all .15s}
      .tc-update-btn:hover{border-color:var(--accent);color:var(--accent);background:var(--accent-soft,rgba(79,142,247,.1))}
      .tc-update-btn.primary{border-color:transparent;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff}
      .tc-update-btn.primary:hover{transform:translateY(-1px);color:#fff}
    `;
    document.head.appendChild(style);
  }

  function normalizeVersion(version) {
    return String(version || '').trim().replace(/^v/i, '');
  }

  function compareVersions(a, b) {
    const pa = normalizeVersion(a).split(/[.-]/).map(part => parseInt(part, 10) || 0);
    const pb = normalizeVersion(b).split(/[.-]/).map(part => parseInt(part, 10) || 0);
    const len = Math.max(pa.length, pb.length);

    for (let i = 0; i < len; i += 1) {
      const diff = (pa[i] || 0) - (pb[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  }

  function injectVersionCheck() {
    ensureVersionStyles();

    const targets = Array.from(document.querySelectorAll('.sidebar-logo, .logo'));
    targets.forEach(target => {
      if (target.querySelector('.tc-version-check')) return;

      const wrap = document.createElement('div');
      wrap.className = 'tc-version-check';
      wrap.innerHTML = `
        <div class="tc-version-current">v${APP_VERSION}</div>
        <button class="tc-version-update" type="button">(nova atualização disponível)</button>
      `;

      const updateButton = wrap.querySelector('.tc-version-update');
      updateButton.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        openUpdateModal();
      });

      target.appendChild(wrap);
    });
  }

  function setUpdateAvailable(release) {
    latestRelease = release || latestRelease || {};
    const tag = latestRelease.tag_name || latestRelease.latestTag || 'latest';
    const dismissed = localStorage.getItem(RELEASE_DISMISSED_KEY) === tag;
    document.querySelectorAll('.tc-version-update').forEach(button => {
      button.classList.add('visible');
      button.classList.toggle('compact', dismissed);
      button.textContent = dismissed ? '?' : '(nova atualizacao disponivel)';
      button.setAttribute('title', `Abrir detalhes da versao ${latestRelease.tag_name || 'mais recente'}`);
      button.setAttribute('aria-label', 'Nova atualizacao disponivel');
    });
  }

  function applyCachedRelease(cache) {
    if (!cache || !cache.latestTag) return;
    if (compareVersions(cache.latestTag, APP_VERSION) > 0) {
      setUpdateAvailable({
        tag_name: cache.latestTag,
        html_url: cache.html_url || RELEASES_URL,
      });
    }
  }

  async function checkLatestRelease(force) {
    const today = todayKey();
    const cache = readReleaseCache();
    applyCachedRelease(cache);

    if (!force && cache && cache.checkedOn === today) return;
    if (!force && getAppStartPage() !== currentPage) return;
    if (releaseCheckStarted && !force) return;
    releaseCheckStarted = true;

    try {
      let release = null;

      if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.get_latest_release === 'function') {
        const result = await window.pywebview.api.get_latest_release();
        if (result && result.ok) release = result;
      } else {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
          headers: { Accept: 'application/vnd.github+json' },
          cache: 'no-store',
        });
        if (response.ok) release = await response.json();
      }

      const latestTag = release && (release.tag_name || release.version);
      writeReleaseCache({
        checkedOn: today,
        checkedAt: new Date().toISOString(),
        appVersion: APP_VERSION,
        latestTag: latestTag || '',
        html_url: release && (release.html_url || RELEASES_URL) || RELEASES_URL,
      });
      if (latestTag && compareVersions(latestTag, APP_VERSION) > 0) {
        setUpdateAvailable({
          tag_name: latestTag,
          html_url: release.html_url || RELEASES_URL,
        });
      }
    } catch (error) {
      writeReleaseCache({
        checkedOn: today,
        checkedAt: new Date().toISOString(),
        appVersion: APP_VERSION,
        latestTag: cache && cache.latestTag || '',
        html_url: cache && cache.html_url || RELEASES_URL,
        failed: true,
      });
      // Falha de rede nao deve incomodar o uso normal do app.
    }
  }

  function checkLatestReleaseWithApi() {
    checkLatestRelease(false);
  }

  function closeUpdateModal() {
    const overlay = document.getElementById('tcUpdateOverlay');
    if (overlay) overlay.remove();
  }

  function dismissUpdateNotice() {
    if (latestRelease && latestRelease.tag_name) {
      localStorage.setItem(RELEASE_DISMISSED_KEY, latestRelease.tag_name);
    }
    closeUpdateModal();
    setUpdateAvailable(latestRelease);
  }

  async function openLatestRelease() {
    const url = (latestRelease && latestRelease.html_url) || RELEASES_URL;

    try {
      if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.open_external_url === 'function') {
        await window.pywebview.api.open_external_url(url);
      } else {
        window.open(url, '_blank', 'noopener');
      }
    } finally {
      closeUpdateModal();
    }
  }

  function openUpdateModal() {
    closeUpdateModal();

    const versionLabel = latestRelease && latestRelease.tag_name
      ? `versão ${latestRelease.tag_name}`
      : 'versão mais recente';

    const overlay = document.createElement('div');
    overlay.id = 'tcUpdateOverlay';
    overlay.className = 'tc-update-overlay visible';
    overlay.innerHTML = `
      <div class="tc-update-card" role="dialog" aria-modal="true" aria-labelledby="tcUpdateTitle">
        <div class="tc-update-title" id="tcUpdateTitle">Nova atualização disponível</div>
        <div class="tc-update-text">
          Existe uma nova versão do Track Concursos no GitHub: <strong>${versionLabel}</strong>.<br>
          Ao confirmar, o app vai abrir a release mais recente no seu navegador.
        </div>
        <div class="tc-update-actions">
          <button class="tc-update-btn" type="button" data-close-update>Depois</button>
          <button class="tc-update-btn primary" type="button" data-open-release>Abrir release</button>
        </div>
      </div>
    `;

    overlay.addEventListener('click', event => {
      if (event.target === overlay || event.target.closest('[data-close-update]')) dismissUpdateNotice();
      if (event.target.closest('[data-open-release]')) openLatestRelease();
    });

    document.body.appendChild(overlay);
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function getFlashcardsDueCount() {
    const cId = sessionStorage.getItem('ct_concurso_ativo');
    const today = todayKey();
    return readJson('ct_flashcards', []).filter(card => {
      if (cId && card.concursoId !== cId) return false;
      const srs = card.srs || {};
      if (!srs.status || srs.status === 'new') return true;
      if (!srs.nextReview) return true;
      return String(srs.nextReview).slice(0, 10) <= today;
    }).length;
  }

  function ensureFlashcardsNavStyles() {
    if (document.getElementById('flashcards-nav-style')) return;
    const style = document.createElement('style');
    style.id = 'flashcards-nav-style';
    style.textContent = '.nav-badge{margin-left:auto;background:var(--red,#f55a5a);color:#fff;font-size:12px;font-weight:700;padding:2px 6px;border-radius:20px;font-family:var(--mono,monospace);line-height:1.2}';
    document.head.appendChild(style);
  }

  function openFlashcards(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    }
    sessionStorage.setItem('ct_dashboard_tab', 'flashcards');
    if (currentPage === 'dashboard.html' && typeof window.showDashTab === 'function') {
      window.showDashTab('flashcards');
    } else {
      window.location.href = 'dashboard.html';
    }
  }

  function updateFlashcardsBadge() {
    const badge = document.getElementById('flashTabBadge');
    if (!badge) return;
    const due = getFlashcardsDueCount();
    badge.textContent = due > 0 ? due : '';
    badge.style.display = due > 0 ? 'inline-flex' : 'none';
  }

  function ensureFlashcardsNavItem() {
    ensureFlashcardsNavStyles();

    document.querySelectorAll('.nav-item[onclick*="dashboard.html"]').forEach(item => {
      if (item.id === 'navFlashcardsDashboard') return;
      item.addEventListener('click', () => {
        sessionStorage.setItem('ct_dashboard_tab', 'overview');
      }, true);
    });

    document.querySelectorAll('nav.nav').forEach(nav => {
      let flashItem = nav.querySelector('#navFlashcardsDashboard');
      if (!flashItem) {
        const revItem = nav.querySelector('#revBadge')?.closest('.nav-item')
          || Array.from(nav.querySelectorAll('.nav-item')).find(item => item.textContent.includes('Revis'));
        if (!revItem) return;

        flashItem = document.createElement('div');
        flashItem.className = 'nav-item';
        flashItem.id = 'navFlashcardsDashboard';
        flashItem.style.cursor = 'pointer';
        flashItem.innerHTML = '<span class="icon">🎴</span> Flashcards <span class="nav-badge" id="flashTabBadge" style="display:none">0</span>';
        revItem.insertAdjacentElement('afterend', flashItem);
      }

      flashItem.onclick = openFlashcards;
      flashItem.style.cursor = 'pointer';
    });

    updateFlashcardsBadge();
  }

  function ensureSidebarConcursoStyles() {
    if (document.getElementById('sidebar-concurso-nav-style')) return;
    const style = document.createElement('style');
    style.id = 'sidebar-concurso-nav-style';
    style.textContent = `
      .sidebar-concurso.clickable{cursor:pointer;transition:background .2s,box-shadow .2s,transform .2s,border-color .2s}
      .sidebar-concurso.clickable:hover,.sidebar-concurso.clickable:focus-visible{background:var(--bg4);box-shadow:0 8px 24px rgba(0,0,0,.4);transform:translateY(-2px);border-color:var(--accent2);outline:0}
    `;
    document.head.appendChild(style);
  }

  function openConcursoOptions(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    }

    if (currentPage === 'dashboard.html' && typeof window.abrirModalMerge === 'function') {
      window.abrirModalMerge();
      return;
    }

    sessionStorage.setItem('ct_open_concurso_options', '1');
    if (currentPage !== 'dashboard.html') {
      window.location.href = 'dashboard.html';
    }
  }

  function ensureSidebarConcursoClickable() {
    ensureSidebarConcursoStyles();

    document.querySelectorAll('.sidebar-concurso').forEach(card => {
      if (card.dataset.sidebarClickReady === '1') return;
      card.dataset.sidebarClickReady = '1';
      card.classList.add('clickable');
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.title = 'Clique para ver opções do concurso';
      card.addEventListener('click', openConcursoOptions);
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') openConcursoOptions(event);
      });
    });
  }

  function openPendingConcursoOptions() {
    if (currentPage !== 'dashboard.html') return;
    if (sessionStorage.getItem('ct_open_concurso_options') !== '1') return;

    const tryOpen = attempt => {
      if (typeof window.abrirModalMerge === 'function') {
        sessionStorage.removeItem('ct_open_concurso_options');
        window.abrirModalMerge();
        return;
      }
      if (attempt < 20) setTimeout(() => tryOpen(attempt + 1), 100);
    };

    tryOpen(0);
  }

  function removeElementById(id) {
    const el = document.getElementById(id);
    if (!el) return false;
    el.remove();
    return true;
  }

  function hideVisibleById(id) {
    const el = document.getElementById(id);
    if (!el || !el.classList.contains('visible')) return false;
    el.classList.remove('visible');
    return true;
  }

  function closeTopAppSurface() {
    if (document.getElementById('tcUpdateOverlay')) {
      closeUpdateModal();
      return true;
    }

    if (document.getElementById('dayDetailOverlay')) {
      if (typeof window.closeDayDetail === 'function') window.closeDayDetail();
      else removeElementById('dayDetailOverlay');
      return true;
    }

    if (removeElementById('flashModalOverlay')) return true;
    if (removeElementById('tcUpdateOverlay')) return true;
    if (removeElementById('modalAddMatDash')) return true;
    if (removeElementById('modalSmartLink')) return true;
    if (removeElementById('modalOpcoes')) return true;
    if (removeElementById('modalSessaoQuestoes')) return true;
    if (removeElementById('modalGerenciarTop')) return true;
    if (removeElementById('modalCrono')) return true;
    if (removeElementById('modalSimulado')) return true;
    if (removeElementById('modalCaderno')) return true;
    if (removeElementById('timer-popup-overlay')) return true;

    if (hideVisibleById('modalPreEditalReset')) return true;
    if (hideVisibleById('modalMerge')) return true;
    if (hideVisibleById('modalDetalhes')) return true;
    if (hideVisibleById('modalPerfil')) return true;
    if (hideVisibleById('modalImportPremium')) return true;
    if (hideVisibleById('modalPremiumSuccess')) return true;
    if (hideVisibleById('modal-ajuste')) return true;
    if (hideVisibleById('popup-overlay')) return true;
    if (hideVisibleById('popupOverlay')) return true;

    const visibleOverlay = document.querySelector('.modal-overlay.visible, .popup-overlay.visible');
    if (visibleOverlay) {
      visibleOverlay.classList.remove('visible');
      return true;
    }

    const ctxMenu = document.getElementById('ctxMenu');
    if (ctxMenu && ctxMenu.style.display !== 'none' && typeof window.closeCtxMenu === 'function') {
      window.closeCtxMenu();
      return true;
    }

    const flashSection = document.getElementById('dashboardFlashcards');
    const flashVisible = flashSection && flashSection.style.display !== 'none';
    if (flashVisible && window.FlashcardsDashboard) {
      if (document.querySelector('.flash-study')) {
        window.FlashcardsDashboard.cancelStudy();
        return true;
      }
      if (document.querySelector('.flash-detail')) {
        window.FlashcardsDashboard.backToDecks();
        return true;
      }
      if (typeof window.showDashTab === 'function') {
        window.showDashTab('overview');
        return true;
      }
    }

    const openSub = Array.from(document.querySelectorAll('.subtopico-row .sub-body'))
      .find(body => body.style.display !== 'none');
    if (openSub) {
      openSub.style.display = 'none';
      const arrow = openSub.closest('.subtopico-row')?.querySelector('.sub-expand');
      if (arrow) arrow.style.transform = '';
      return true;
    }

    const openTopic = document.querySelector('.topico-card.open');
    if (openTopic) {
      openTopic.classList.remove('open');
      return true;
    }

    return false;
  }

  function installSoftBackNavigation() {
    if (!window.history || window.__ctSoftBackInstalled) return;
    window.__ctSoftBackInstalled = true;

    try {
      const baseState = Object.assign({}, history.state || {}, { ctSoftBack: 'base' });
      history.replaceState(baseState, document.title, window.location.href);
      history.pushState({ ctSoftBack: 'guard' }, document.title, window.location.href);
    } catch (error) {
      return;
    }

    window.addEventListener('popstate', function () {
      if (closeTopAppSurface()) {
        setTimeout(function () {
          try {
            history.pushState({ ctSoftBack: 'guard' }, document.title, window.location.href);
          } catch {}
        }, 0);
      } else {
        setTimeout(function () {
          try { history.back(); } catch {}
        }, 0);
      }
    });
  }

  injectVersionCheck();
  checkLatestRelease();
  window.addEventListener('pywebviewready', checkLatestReleaseWithApi);
  ensureFlashcardsNavItem();
  ensureSidebarConcursoClickable();
  installSoftBackNavigation();
  window.addEventListener('load', openPendingConcursoOptions);

  // Adiciona navegação em todos os .nav-item que tiverem data-nav
  document.querySelectorAll('.nav-item[data-nav]').forEach(item => {
    const key = item.getAttribute('data-nav');
    const dest = ROUTES[key];

    // Marca o item ativo
    if (dest === currentPage) {
      item.classList.add('active');
    }

    // Navega ao clicar
    item.addEventListener('click', () => {
      if (dest && dest !== currentPage) {
        window.location.href = dest;
      }
    });
    item.style.cursor = 'pointer';
  });

  // Botões de "voltar ao dashboard"
  document.querySelectorAll('[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => {
      const dest = btn.getAttribute('data-goto');
      if (dest) window.location.href = dest;
    });
  });

  // Global ESC Shortcut to close modals
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (closeTopAppSurface()) return;
      // 1. Functions (usually in aba_materia.html or global)
      closeUpdateModal();
      if (typeof closePopup === 'function') closePopup();
      if (typeof fecharModalCaderno === 'function') fecharModalCaderno();
      if (typeof fecharModalMerge === 'function') fecharModalMerge();
      if (typeof fecharModalAjuste === 'function') fecharModalAjuste();
      if (typeof closeCtxMenu === 'function') closeCtxMenu();
      if (typeof fecharModalCrono === 'function') fecharModalCrono(); // if exists
      if (typeof fecharModalDetalhes === 'function') fecharModalDetalhes();

      // 2. DOM elements that can be removed
      const idsToRemove = [
        'modalSmartLink', 'modalGerenciarTop', 'modalCrono', 
        'modalSimulado', 'modalCaderno', 'timer-popup-overlay'
      ];
      idsToRemove.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
      });

      // 3. Modals that use a visibility class (like dashboard.html)
      const modalMerge = document.getElementById('modalMerge');
      if (modalMerge) modalMerge.classList.remove('visible');

      const modalDetalhes = document.getElementById('modalDetalhes');
      if (modalDetalhes) modalDetalhes.classList.remove('visible');
      
      const modalCrono = document.getElementById('modalCrono');
      if (modalCrono) modalCrono.remove();
    }
  });

})();

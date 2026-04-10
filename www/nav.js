(function() {
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
      // 1. Functions (usually in aba_materia.html or global)
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

(function () {
  'use strict';

  var KEYS = {
    decks: 'ct_flashcard_decks',
    cards: 'ct_flashcards',
    log: 'ct_flashcard_log',
  };

  var state = {
    activeDeckId: null,
    editingDeckId: null,
    editingCardId: null,
    study: null,
    booted: false,
  };

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function uid(prefix) {
    var base = (window.CT && CT._id) ? CT._id() : (Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
    return (prefix || 'fc') + '_' + base;
  }

  function today() {
    return (window.CT && CT._today) ? CT._today() : new Date().toISOString().slice(0, 10);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function addDays(days) {
    var d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function textToHtml(value) {
    return escapeHtml(value).replace(/\n/g, '<br>');
  }

  var MATH_SYMBOLS = ['√', '∛', '∜', 'π', '±', '×', '÷', '≠', '≤', '≥', '≈', '∞', '∑', '∫', '∆', 'θ', 'λ', 'μ', 'Ω', '²', '³', '½', '¼', '¾', '°', '∈', '∉', '∪', '∩', '⊂', '⊆', '→', '↔', '∴', '∵'];

  function symbolBank(id) {
    return [
      '<div class="flash-symbol-bank" id="symbols_' + id + '">',
      MATH_SYMBOLS.map(function (symbol) {
        return '<button type="button" onclick="FlashcardsDashboard.insertSymbol(\'' + id + '\', \'' + symbol + '\')">' + symbol + '</button>';
      }).join(''),
      '</div>',
    ].join('');
  }

  function symbolButton(id) {
    return '<button type="button" class="flash-tool" onclick="FlashcardsDashboard.toggleSymbolBank(\'' + id + '\')" title="Caracteres matematicos">√π</button>';
  }

  function richEditor(id, value, placeholder) {
    return [
      '<div class="flash-rich-wrap">',
      '  <div class="flash-rich-toolbar" data-editor="' + id + '">',
      '    <button type="button" class="flash-tool" onclick="FlashcardsDashboard.formatRich(\'' + id + '\', \'bold\')" title="Negrito"><strong>B</strong></button>',
      '    <button type="button" class="flash-tool" onclick="FlashcardsDashboard.formatRich(\'' + id + '\', \'italic\')" title="Itálico"><em>I</em></button>',
      '    <button type="button" class="flash-tool" onclick="FlashcardsDashboard.formatRich(\'' + id + '\', \'underline\')" title="Sublinhado"><u>U</u></button>',
      '    <button type="button" class="flash-tool" onclick="FlashcardsDashboard.formatRich(\'' + id + '\', \'strikeThrough\')" title="Riscado"><s>S</s></button>',
      '    <select class="flash-rich-select" onchange="FlashcardsDashboard.formatRichBlock(\'' + id + '\', this.value); this.value=\'P\'" title="Estilo do texto">',
      '      <option value="P">Normal</option>',
      '      <option value="H3">Título</option>',
      '      <option value="BLOCKQUOTE">Citação</option>',
      '      <option value="PRE">Código</option>',
      '    </select>',
      '    <button type="button" class="flash-tool" onclick="FlashcardsDashboard.formatRich(\'' + id + '\', \'insertOrderedList\')" title="Lista numerada">1.</button>',
      '    <button type="button" class="flash-tool" onclick="FlashcardsDashboard.formatRich(\'' + id + '\', \'insertUnorderedList\')" title="Lista com marcadores">•</button>',
      '    <button type="button" class="flash-tool" onclick="FlashcardsDashboard.insertRichLink(\'' + id + '\')" title="Link">Link</button>',
      '    <button type="button" class="flash-tool" onclick="FlashcardsDashboard.pickRichImage(\'' + id + '\')" title="Imagem">Imagem</button>',
      symbolButton(id),
      '    <button type="button" class="flash-tool" onclick="FlashcardsDashboard.formatRich(\'' + id + '\', \'removeFormat\')" title="Limpar formatação">Tx</button>',
      '  </div>',
      symbolBank(id),
      '  <div id="' + id + '" class="flash-rich-editor" contenteditable="true" data-placeholder="' + escapeHtml(placeholder || 'Digite aqui...') + '">' + (value || '') + '</div>',
      '</div>',
    ].join('');
  }

  function htmlHasContent(html) {
    return !!(htmlToText(html) || /<img\b/i.test(String(html || '')));
  }

  function getRichHtml(id) {
    var el = document.getElementById(id);
    return el ? el.innerHTML.trim() : '';
  }

  function getRichText(id) {
    var el = document.getElementById(id);
    return el ? (el.textContent || '').trim() : '';
  }

  function focusRich(id) {
    var el = document.getElementById(id);
    if (el) el.focus();
  }

  function toggleSymbolBank(id) {
    document.querySelectorAll('.flash-symbol-bank').forEach(function (bank) {
      if (bank.id !== 'symbols_' + id) bank.classList.remove('open');
    });
    var bank = document.getElementById('symbols_' + id);
    if (bank) bank.classList.toggle('open');
  }

  function insertSymbol(id, symbol) {
    var el = document.getElementById(id);
    if (!el) return;
    el.focus();
    if (el.isContentEditable) {
      document.execCommand('insertText', false, symbol);
      return;
    }
    var start = typeof el.selectionStart === 'number' ? el.selectionStart : el.value.length;
    var end = typeof el.selectionEnd === 'number' ? el.selectionEnd : start;
    if (typeof el.setRangeText === 'function') {
      el.setRangeText(symbol, start, end, 'end');
    } else {
      el.value = el.value.slice(0, start) + symbol + el.value.slice(end);
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function htmlToText(value) {
    var div = document.createElement('div');
    div.innerHTML = String(value || '');
    return (div.textContent || div.innerText || '').trim();
  }

  function shortText(value, limit) {
    var text = htmlToText(value);
    if (text.length <= limit) return text;
    return text.slice(0, limit - 1).trim() + '...';
  }

  function toast(message, icon) {
    if (window.CT && CT.toast) CT.toast(message, icon || 'Flashcards');
    else alert(message);
  }

  function currentConcursoId() {
    return sessionStorage.getItem('ct_concurso_ativo');
  }

  function getDecks(concursoId) {
    var cId = concursoId || currentConcursoId();
    return read(KEYS.decks, []).filter(function (deck) {
      return !cId || deck.concursoId === cId;
    });
  }

  function saveDecks(decks) {
    var all = read(KEYS.decks, []);
    var cId = currentConcursoId();
    var others = all.filter(function (deck) { return deck.concursoId !== cId; });
    write(KEYS.decks, others.concat(decks));
  }

  function getCards(concursoId) {
    var cId = concursoId || currentConcursoId();
    return read(KEYS.cards, []).filter(function (card) {
      return !cId || card.concursoId === cId;
    });
  }

  function saveCards(cards) {
    var all = read(KEYS.cards, []);
    var cId = currentConcursoId();
    var others = all.filter(function (card) { return card.concursoId !== cId; });
    write(KEYS.cards, others.concat(cards));
  }

  function getLog(concursoId) {
    var cId = concursoId || currentConcursoId();
    return read(KEYS.log, []).filter(function (item) {
      return !cId || item.concursoId === cId;
    });
  }

  function appendLog(item) {
    var log = read(KEYS.log, []);
    log.push(item);
    if (log.length > 5000) log = log.slice(log.length - 5000);
    write(KEYS.log, log);
  }

  function initSrs() {
    return {
      status: 'new',
      ease: 2.5,
      interval: 0,
      reviews: 0,
      lapses: 0,
      nextReview: null,
      lastReview: null,
    };
  }

  function isDue(card) {
    var srs = card && card.srs ? card.srs : {};
    if (!srs.status || srs.status === 'new') return true;
    if (!srs.nextReview) return true;
    return String(srs.nextReview).slice(0, 10) <= today();
  }

  function reviewSrs(card, quality) {
    var srs = Object.assign(initSrs(), card.srs || {});
    var interval = Number(srs.interval || 0);
    var ease = Number(srs.ease || 2.5);

    srs.reviews = Number(srs.reviews || 0) + 1;
    srs.lastReview = nowIso();

    if (quality === 'again') {
      srs.status = 'learning';
      srs.lapses = Number(srs.lapses || 0) + 1;
      srs.ease = Math.max(1.3, ease - 0.2);
      srs.interval = 0;
      srs.nextReview = today();
    } else if (quality === 'hard') {
      srs.status = 'review';
      srs.ease = Math.max(1.3, ease - 0.15);
      srs.interval = Math.max(1, Math.round(interval * 1.2) || 1);
      srs.nextReview = addDays(srs.interval);
    } else if (quality === 'easy') {
      srs.status = 'review';
      srs.ease = ease + 0.1;
      var goodInterval = interval < 1 ? 1 : (interval < 6 ? 6 : Math.max(1, Math.round(interval * ease)));
      srs.interval = interval < 1 ? 4 : Math.max(goodInterval + 1, interval + 1, Math.round(interval * srs.ease * 1.3));
      srs.nextReview = addDays(srs.interval);
    } else {
      srs.status = 'review';
      srs.interval = interval < 1 ? 1 : (interval < 6 ? 6 : Math.max(1, Math.round(interval * ease)));
      srs.nextReview = addDays(srs.interval);
    }

    return srs;
  }

  function previewSrs(card, quality) {
    return reviewSrs({ srs: Object.assign({}, card && card.srs || {}) }, quality);
  }

  function formatReviewInterval(days) {
    var value = Number(days || 0);
    if (value <= 0) return 'hoje';
    if (value === 1) return '1 dia';
    if (value < 30) return value + ' dias';
    var months = Math.round(value / 30);
    if (months === 1) return '1 mes';
    if (months < 12) return months + ' meses';
    var years = Math.round(value / 365);
    return years === 1 ? '1 ano' : years + ' anos';
  }

  function getDescendantIds(deckId, decks) {
    var ids = [deckId];
    var changed = true;
    while (changed) {
      changed = false;
      decks.forEach(function (deck) {
        if (deck.parentId && ids.includes(deck.parentId) && !ids.includes(deck.id)) {
          ids.push(deck.id);
          changed = true;
        }
      });
    }
    return ids;
  }

  function buildTree(concursoId) {
    var decks = getDecks(concursoId);
    var cards = getCards(concursoId);
    var byId = {};
    decks.forEach(function (deck) {
      byId[deck.id] = Object.assign({}, deck, { children: [], directCards: 0, totalCards: 0, dueCards: 0 });
    });

    cards.forEach(function (card) {
      if (!byId[card.deckId]) return;
      byId[card.deckId].directCards += 1;
      byId[card.deckId].totalCards += 1;
      if (isDue(card)) byId[card.deckId].dueCards += 1;
    });

    var roots = [];
    decks.forEach(function (deck) {
      var node = byId[deck.id];
      if (deck.parentId && byId[deck.parentId]) byId[deck.parentId].children.push(node);
      else roots.push(node);
    });

    function sortNodes(items) {
      items.sort(function (a, b) {
        var ao = Number(a.order || 0);
        var bo = Number(b.order || 0);
        if (ao !== bo) return ao - bo;
        return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR');
      });
      items.forEach(function (node) { sortNodes(node.children); });
    }

    function sum(node) {
      node.children.forEach(function (child) {
        sum(child);
        node.totalCards += child.totalCards || 0;
        node.dueCards += child.dueCards || 0;
      });
    }

    roots.forEach(sum);
    sortNodes(roots);
    return roots;
  }

  function calcStats(concursoId) {
    var cards = getCards(concursoId);
    var decks = getDecks(concursoId);
    var log = getLog(concursoId);
    var todayKey = today();
    var due = cards.filter(isDue).length;
    var newToday = cards.filter(function (card) {
      return String(card.createdAt || '').slice(0, 10) === todayKey;
    }).length;
    var reviewedToday = log.filter(function (item) { return item.data === todayKey; }).length;
    var rightToday = log.filter(function (item) { return item.data === todayKey && item.correct; }).length;
    var pctToday = reviewedToday ? Math.round((rightToday / reviewedToday) * 100) : null;
    var streak = calcStreak(log);
    return {
      totalCards: cards.length,
      totalDecks: decks.length,
      due: due,
      newToday: newToday,
      reviewedToday: reviewedToday,
      pctToday: pctToday,
      streak: streak,
    };
  }

  function calcStreak(log) {
    var byDate = {};
    log.forEach(function (item) {
      if (item.data) byDate[item.data] = true;
    });
    var count = 0;
    var start = new Date(today() + 'T00:00:00');
    for (var i = 0; i < 365; i++) {
      var d = new Date(start);
      d.setDate(start.getDate() - i);
      var key = d.toISOString().slice(0, 10);
      if (byDate[key]) count += 1;
      else if (i > 0) break;
      else break;
    }
    return count;
  }

  function copyCardsFromEquivalentDecks(cId) {
    var allDecks = read(KEYS.decks, []);
    var allCards = read(KEYS.cards, []);
    var targetDecks = allDecks.filter(function (deck) {
      return deck.concursoId === cId && deck.sourceType && deck.sourceId;
    });
    var copied = 0;
    var now = nowIso();

    targetDecks.forEach(function (targetDeck) {
      var sourceDecks = allDecks.filter(function (deck) {
        return deck.concursoId !== cId
          && deck.sourceType === targetDeck.sourceType
          && deck.sourceId === targetDeck.sourceId;
      });
      if (!sourceDecks.length) return;

      sourceDecks.forEach(function (sourceDeck) {
        allCards.filter(function (card) { return card.deckId === sourceDeck.id; }).forEach(function (card) {
          var originalId = card.originalFlashcardId || card.id;
          var exists = allCards.some(function (existing) {
            return existing.deckId === targetDeck.id
              && ((existing.originalFlashcardId || existing.id) === originalId);
          });
          if (exists) return;

          var clone = Object.assign({}, card, {
            id: uid('fc'),
            concursoId: cId,
            deckId: targetDeck.id,
            originalFlashcardId: originalId,
            copiedFromDeckId: sourceDeck.id,
            srs: initSrs(),
            createdAt: now,
            updatedAt: now,
          });
          allCards.push(clone);
          copied += 1;
        });
      });
    });

    if (copied) write(KEYS.cards, allCards);
    return copied;
  }

  function syncFromTrack(options) {
    options = options || {};
    var cId = currentConcursoId();
    if (!window.CT || !cId) return { created: 0, updated: 0 };

    var decks = getDecks(cId);
    var created = 0;
    var updated = 0;

    function ensureDeck(kind, sourceId, payload) {
      var deck = decks.find(function (item) {
        return item.sourceType === kind && item.sourceId === sourceId;
      });
      var now = nowIso();
      if (deck) {
        var changed = false;
        ['name', 'parentId', 'order', 'materiaId', 'topicoId', 'subtopicoId'].forEach(function (key) {
          if ((deck[key] || null) !== (payload[key] || null)) {
            deck[key] = payload[key] || null;
            changed = true;
          }
        });
        if (changed) {
          deck.updatedAt = now;
          updated += 1;
        }
        return deck.id;
      }

      deck = {
        id: uid('fcdeck'),
        concursoId: cId,
        name: payload.name,
        emoji: payload.emoji || 'Books',
        parentId: payload.parentId || null,
        sourceType: kind,
        sourceId: sourceId,
        materiaId: payload.materiaId || null,
        topicoId: payload.topicoId || null,
        subtopicoId: payload.subtopicoId || null,
        order: payload.order || 0,
        createdAt: now,
        updatedAt: now,
      };
      decks.push(deck);
      created += 1;
      return deck.id;
    }

    CT.getMaterias(cId).forEach(function (materia, mi) {
      var materiaDeckId = ensureDeck('materia', materia.id, {
        name: materia.nome || 'Materia',
        emoji: 'Books',
        materiaId: materia.id,
        order: materia.ordem != null ? materia.ordem : mi,
      });

      CT.getTopicos(materia.id).forEach(function (topico, ti) {
        var topicoDeckId = ensureDeck('topico', topico.id, {
          name: topico.nome || 'Topico',
          emoji: 'Stack',
          parentId: materiaDeckId,
          materiaId: materia.id,
          topicoId: topico.id,
          order: topico.ordem != null ? topico.ordem : ti,
        });

        CT.getSubtopicos(topico.id).forEach(function (subtopico, si) {
          ensureDeck('subtopico', subtopico.id, {
            name: subtopico.nome || 'Subtopico',
            emoji: 'Card',
            parentId: topicoDeckId,
            materiaId: materia.id,
            topicoId: topico.id,
            subtopicoId: subtopico.id,
            order: subtopico.ordem != null ? subtopico.ordem : si,
          });
        });
      });
    });

    saveDecks(decks);
    var copied = copyCardsFromEquivalentDecks(cId);
    if (!options.skipRender) render();
    updateTabBadge();
    return { created: created, updated: updated, copied: copied };
  }

  function deckIcon(deck) {
    return '';
  }

  function render() {
    var root = document.getElementById('flashcardsDashboardRoot');
    if (!root) return;
    installStyles();
    syncFromTrack({ skipRender: true });
    var stats = calcStats();
    root.innerHTML = [
      '<div class="flash-head">',
      '  <div>',
      '    <div class="flash-title-row"><span class="flash-logo">🎴</span><div><h2>Meus Baralhos</h2><p>Organize seus flashcards por materia, topico e subtopico deste concurso.</p></div></div>',
      '  </div>',
      '  <div class="flash-actions">',
      '    <button class="flash-btn secondary" onclick="FlashcardsDashboard.exportJSON()">Exportar JSON</button>',
      '    <button class="flash-btn secondary" onclick="FlashcardsDashboard.exportCSV()">Exportar CSV</button>',
      '    <button class="flash-btn primary" onclick="FlashcardsDashboard.openDeckModal()"><span>+</span> Novo Baralho</button>',
      '  </div>',
      '</div>',
      renderStats(stats),
      '<div id="flashMainView">',
      renderDecksView(),
      '</div>',
    ].join('');
    state.booted = true;
  }

  function renderStats(stats) {
    return [
      '<div class="flash-stat-grid">',
      statCard(stats.totalCards, 'Total de cards', 'blue', 'FlashcardsDashboard.startStudyFromStats(\'all\')', 'Estudar todos os cards'),
      statCard(stats.due, 'Para revisar', 'red', 'FlashcardsDashboard.startStudyFromStats(\'due\')', 'Revisar cards pendentes'),
      statCard(stats.newToday, 'Novos hoje', 'purple', 'FlashcardsDashboard.startStudyFromStats(\'new\')', 'Estudar cards criados hoje'),
      statCard(stats.streak, 'Streak', 'yellow'),
      statCard(stats.reviewedToday ? (stats.pctToday + '%') : '-', 'Acerto hoje', 'green'),
      '</div>',
    ].join('');
  }

  function statCard(value, label, tone, action, title) {
    var tag = action ? 'button' : 'div';
    var attrs = action ? ' type="button" onclick="' + action + '" title="' + escapeHtml(title || label) + '"' : '';
    return '<' + tag + attrs + ' class="flash-stat-card ' + tone + (action ? ' clickable' : '') + '"><div class="flash-stat-value">' + escapeHtml(value) + '</div><div class="flash-stat-label">' + escapeHtml(label) + '</div></' + tag + '>';
  }

  function renderDecksView() {
    var tree = buildTree();
    var cId = currentConcursoId();
    if (!tree.length) {
      var hasMaterias = window.CT && cId && CT.getMaterias(cId).length > 0;
      return [
        '<div class="flash-panel flash-empty">',
        '  <div class="flash-empty-icon">&#127183;</div>',
        '  <h3>Nenhum baralho ainda</h3>',
        '  <p>Crie um baralho manualmente para complementar a estrutura deste concurso.</p>',
        hasMaterias ? '<button class="flash-btn primary" onclick="FlashcardsDashboard.openDeckModal()">Novo baralho extra</button>' : '<button class="flash-btn primary" onclick="FlashcardsDashboard.openDeckModal()">Criar primeiro baralho</button>',
        '</div>',
      ].join('');
    }

    return [
      '<div class="flash-grid">',
      '  <div class="flash-panel flash-tree-panel">',
      '    <div class="flash-panel-title">Matérias, tópicos e subtópicos</div>',
      '    <ul class="flash-tree">',
      renderTreeNodes(tree, 0),
      '    </ul>',
      '  </div>',
      '  <div class="flash-panel">',
      '    <div class="flash-panel-title">Dashboard dos flashcards</div>',
      renderMiniStats(),
      '  </div>',
      '</div>',
    ].join('');
  }

  function renderMiniStats() {
    var log = getLog();
    var cards = getCards();
    var last7 = [];
    var start = new Date(today() + 'T00:00:00');
    for (var i = 6; i >= 0; i--) {
      var d = new Date(start);
      d.setDate(start.getDate() - i);
      var key = d.toISOString().slice(0, 10);
      var count = log.filter(function (item) { return item.data === key; }).length;
      last7.push({ key: key, count: count, label: weekdayLabel(key), dateLabel: shortDateLabel(key) });
    }
    var byStatus = cards.reduce(function (acc, card) {
      var status = (card.srs && card.srs.status) || 'new';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return [
      '<div class="flash-mini">',
      '  <div><span>' + (byStatus.new || 0) + '</span><small>Novos</small></div>',
      '  <div><span>' + (byStatus.learning || 0) + '</span><small>Aprendendo</small></div>',
      '  <div><span>' + (byStatus.review || 0) + '</span><small>Revisao</small></div>',
      '</div>',
      '<div class="flash-activity-title">Atividade dos ultimos 7 dias</div>',
      renderActivityPie(last7),
      renderStudiedStats(log),
    ].join('');
  }

  function weekdayLabel(key) {
    var labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    return labels[new Date(key + 'T00:00:00').getDay()];
  }

  function shortDateLabel(key) {
    var parts = String(key || '').split('-');
    return parts.length === 3 ? parts[2] + '/' + parts[1] : key;
  }

  function renderActivityPie(days) {
    var colors = ['#4f8ef7', '#7c5cfc', '#3ecf8e', '#f5874a', '#f55a5a', '#f5c842', '#56c4e0'];
    var total = days.reduce(function (acc, day) { return acc + day.count; }, 0);
    var base = total > 0 ? total : days.length;
    var cursor = 0;
    var gradient = days.map(function (day, index) {
      var value = total > 0 ? day.count : 1;
      var next = cursor + (value / base) * 100;
      var segment = colors[index % colors.length] + ' ' + cursor.toFixed(3) + '% ' + next.toFixed(3) + '%';
      cursor = next;
      return segment;
    }).join(', ');
    var rows = days.map(function (day, index) {
      return [
        '<div class="flash-pie-row">',
        '  <span class="flash-pie-dot" style="background:' + colors[index % colors.length] + '"></span>',
        '  <strong>' + day.label + ' ' + day.dateLabel + '</strong>',
        '  <span>' + day.count + ' card' + (day.count === 1 ? '' : 's') + '</span>',
        '</div>',
      ].join('');
    }).join('');

    return [
      '<div class="flash-pie-card">',
      '  <div class="flash-pie-chart" style="--pie:' + gradient + '">',
      '    <div class="flash-pie-center"><span>' + total + '</span><small>cards</small></div>',
      '  </div>',
      '  <div class="flash-pie-list">' + rows + '</div>',
      '  <div class="flash-pie-popover">',
      '    <div class="flash-pie-popover-title">Ultimos 7 dias</div>',
      rows,
      '  </div>',
      '</div>',
    ].join('');
  }

  function renderStudiedStats(log) {
    var total = log.length;
    var wrong = log.filter(function (item) { return item.correct === false; }).length;
    var right = Math.max(0, total - wrong);
    var rightPct = total ? Math.round((right / total) * 100) : 0;
    var wrongPct = total ? 100 - rightPct : 0;
    var gradient = total
      ? '#3ecf8e 0% ' + rightPct + '%, #f55a5a ' + rightPct + '% 100%'
      : 'rgba(255,255,255,.07) 0% 100%';

    return [
      '<div class="flash-studied-card">',
      '  <div class="flash-studied-head">',
      '    <div>',
      '      <div class="flash-studied-title">Flashcards estudados</div>',
      '      <div class="flash-studied-sub">Todos os estudos e revisoes registrados</div>',
      '    </div>',
      '    <div class="flash-studied-total"><span>' + total + '</span><small>cards</small></div>',
      '  </div>',
      '  <div class="flash-studied-body">',
      '    <div class="flash-studied-chart" style="--studied:' + gradient + '">',
      '      <div><span>' + rightPct + '%</span><small>acerto</small></div>',
      '    </div>',
      '    <div class="flash-studied-list">',
      '      <div class="flash-studied-row good"><span></span><strong>Acertos</strong><em>' + right + ' card' + (right === 1 ? '' : 's') + '</em></div>',
      '      <div class="flash-studied-row bad"><span></span><strong>Erros</strong><em>' + wrong + ' card' + (wrong === 1 ? '' : 's') + '</em></div>',
      '      <div class="flash-studied-rate">' + rightPct + '% acertos / ' + wrongPct + '% erros</div>',
      '    </div>',
      '  </div>',
      '</div>',
    ].join('');
  }

  function renderTreeNodes(nodes, depth) {
    return nodes.map(function (node) {
      var hasChildren = node.children && node.children.length;
      var due = node.dueCards > 0 ? '<span class="flash-due-badge">' + node.dueCards + ' pendente' + (node.dueCards > 1 ? 's' : '') + '</span>' : '';
      var levelLabel = depth === 0 ? 'Matéria' : depth === 1 ? 'Tópico' : 'Subtópico';
      var rowClass = 'flash-row depth-' + depth + (hasChildren ? ' has-children' : '');
      return [
        '<li class="flash-node">',
        '  <div class="' + rowClass + '" style="--depth:' + depth + '">',
        hasChildren ? '<button class="flash-expand" onclick="event.stopPropagation(); FlashcardsDashboard.toggleChildren(\'' + node.id + '\', this)">&#9654;</button>' : '<span class="flash-spacer"></span>',
        '    <div class="flash-row-main" onclick="event.stopPropagation(); FlashcardsDashboard.openDeck(\'' + node.id + '\')">',
        '      <span class="flash-level-label">' + levelLabel + '</span>',
        '      <span class="flash-name">' + escapeHtml(node.name || 'Sem nome') + '</span>',
        '    </div>',
        '    <span class="flash-count">' + (node.totalCards || 0) + ' card' + (node.totalCards === 1 ? '' : 's') + '</span>',
        due,
        '    <span class="flash-row-actions" onclick="event.stopPropagation()">',
        '      <button onclick="event.stopPropagation(); FlashcardsDashboard.openDeckModal(\'' + node.id + '\')" title="Editar">Editar</button>',
        '      <button onclick="event.stopPropagation(); FlashcardsDashboard.openCardModal(null, \'' + node.id + '\')" title="Novo card">Novo card</button>',
        '      <button onclick="event.stopPropagation(); FlashcardsDashboard.deleteDeck(\'' + node.id + '\')" title="Excluir">Excluir</button>',
        '    </span>',
        '  </div>',
        hasChildren ? '<ul class="flash-children" id="flashChildren_' + node.id + '">' + renderTreeNodes(node.children, depth + 1) + '</ul>' : '',
        '</li>',
      ].join('');
    }).join('');
  }

  function openDeck(deckId) {
    state.activeDeckId = deckId;
    var view = document.getElementById('flashMainView');
    if (!view) return;
    view.innerHTML = renderDeckDetail(deckId);
  }

  function flashDeckUrl(deckId) {
    return 'dashboard.html#flashcards:' + encodeURIComponent(deckId || '');
  }

  function showFlashAlert(message, title) {
    if (window.CT && typeof CT.showAlert === 'function') {
      CT.showAlert(message, { title: title || 'Flashcards', subtitle: 'Track Concursos', icon: 'Flash' });
    } else {
      alert(message);
    }
  }

  function syncDeckToTopic(deckId) {
    if (!window.CT) {
      showFlashAlert('Nao foi possivel acessar os dados do edital agora.', 'Sincronizar');
      return;
    }
    var deck = getDecks().find(function (item) { return item.id === deckId; });
    if (!deck) return;

    var target = null;
    var saveTarget = null;
    var targetKind = 'topico';
    if (deck.subtopicoId && typeof CT.getSubtopico === 'function') {
      target = CT.getSubtopico(deck.subtopicoId);
      saveTarget = function (item) { CT.saveSubtopico(item); };
      targetKind = 'subtopico';
    }
    if (!target && deck.topicoId && typeof CT.getTopico === 'function') {
      target = CT.getTopico(deck.topicoId);
      saveTarget = function (item) { CT.saveTopico(item); };
      targetKind = 'topico';
    }
    if (!target || !saveTarget) {
      showFlashAlert('Este baralho ainda nao esta vinculado a um topico do edital. Use a sincronizacao geral dos flashcards ou abra um baralho criado a partir da estrutura do edital.', 'Sincronizar');
      return;
    }

    var url = flashDeckUrl(deck.id);
    var cadernos = Array.isArray(target.cadernos) ? target.cadernos.slice() : [];
    var exists = cadernos.some(function (item) {
      return String(item && item.rotulo || '').toUpperCase() === 'FLASH'
        && (String(item && item.url || '') === url || String(item && item.deckId || '') === deck.id);
    });
    if (exists) {
      showFlashAlert('Esse baralho ja esta linkado. Acesse o topico pela aba de materia.', 'Baralho ja linkado');
      return;
    }

    cadernos.push({
      id: uid('fc_link'),
      rotulo: 'FLASH',
      nome: deck.name || 'Flashcards',
      emoji: '🎴',
      url: url,
      deckId: deck.id,
      createdAt: nowIso(),
    });
    target.cadernos = cadernos;
    saveTarget(target);
    showFlashAlert('Baralho linkado ao ' + (targetKind === 'subtopico' ? 'subtopico' : 'topico') + ' correspondente do edital. Agora voce pode acessa-lo rapidamente pela aba de materia.', 'Sincronizado');
  }

  function renderDeckDetail(deckId) {
    var cId = currentConcursoId();
    var decks = getDecks(cId);
    var deck = decks.find(function (item) { return item.id === deckId; });
    if (!deck) return renderDecksView();
    var ids = getDescendantIds(deckId, decks);
    var directCards = getCards(cId).filter(function (card) { return card.deckId === deckId; });
    var allCards = getCards(cId).filter(function (card) { return ids.includes(card.deckId); });
    var dueCards = allCards.filter(isDue);
    var children = decks.filter(function (item) { return item.parentId === deckId; });

    return [
      '<div class="flash-detail">',
      '  <div class="flash-detail-head">',
      '    <button class="flash-btn ghost" onclick="FlashcardsDashboard.backToDecks()">&#8592; Voltar</button>',
      '    <div><h3>' + escapeHtml(deck.name || 'Baralho') + '</h3><p>' + allCards.length + ' card(s), ' + dueCards.length + ' para revisar</p></div>',
      '    <div class="flash-detail-actions">',
      '      <button class="flash-btn secondary" onclick="FlashcardsDashboard.startStudy(\'' + deckId + '\', \'due\')">Revisar pendentes</button>',
      '      <button class="flash-btn secondary" onclick="FlashcardsDashboard.startStudy(\'' + deckId + '\', \'all\')">Estudar tudo</button>',
      '      <button class="flash-btn secondary" onclick="FlashcardsDashboard.openImportModal(\'' + deckId + '\')">Importar</button>',
      '      <button class="flash-btn secondary" title="Clique aqui para linkar esse baralho em seu topico correspondente do edital, assim voce acessa ele rapidamente clicando direto do topico na aba da materia" onclick="FlashcardsDashboard.syncDeckToTopic(\'' + deckId + '\')">Sincronizar</button>',
      '      <button class="flash-btn primary" onclick="FlashcardsDashboard.openCardModal(null, \'' + deckId + '\')">+ Novo Card</button>',
      '    </div>',
      '  </div>',
      children.length ? renderChildDecks(children) : '',
      '  <div class="flash-panel">',
      '    <div class="flash-panel-title">Cards deste baralho</div>',
      renderCardList(directCards),
      '  </div>',
      '</div>',
    ].join('');
  }

  function renderChildDecks(children) {
    return [
      '<div class="flash-panel">',
      '  <div class="flash-panel-title">Itens internos</div>',
      '  <div class="flash-child-list">',
      children.map(function (child) {
        var ids = getDescendantIds(child.id, getDecks());
        var cards = getCards().filter(function (card) { return ids.includes(card.deckId); });
        var dueCards = cards.filter(isDue).length;
        return [
          '<button class="flash-child-card" onclick="FlashcardsDashboard.openDeck(\'' + child.id + '\')">',
          '  <span class="flash-child-title">' + escapeHtml(child.name || 'Baralho') + '</span>',
          '  <span class="flash-child-meta">' + cards.length + ' card' + (cards.length === 1 ? '' : 's') + (dueCards ? ' • ' + dueCards + ' pendente' + (dueCards === 1 ? '' : 's') : '') + '</span>',
          '</button>',
        ].join('');
      }).join(''),
      '  </div>',
      '</div>',
    ].join('');
  }

  function quizLetter(index) {
    return String.fromCharCode(65 + index);
  }

  function normalizeQuizAnswer(answer) {
    var value = String(answer || '').trim().toUpperCase();
    return value ? value.charAt(0) : 'A';
  }

  function normalizeCsvHeader(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9#]+/g, ' ')
      .trim();
  }

  function findCsvIndex(header, names, fallback) {
    var normalizedNames = names.map(normalizeCsvHeader);
    for (var i = 0; i < normalizedNames.length; i++) {
      var found = header.indexOf(normalizedNames[i]);
      if (found >= 0) return found;
    }
    return fallback;
  }

  function answerTextToLetter(value) {
    var raw = String(value || '').trim();
    var match = raw.match(/^\s*([A-Z])(?:[\).\-\s:]|$)/i);
    return match ? match[1].toUpperCase() : normalizeQuizAnswer(raw);
  }

  function normalizeQuizOptions(card) {
    var options = card && Array.isArray(card.options) ? card.options.slice() : [];
    if (!options.length && card && card.answer && card.back) options = [card.back];
    while (options.length < 5) options.push('');
    return options;
  }

  function renderQuizAnswerOptions(count, selected) {
    var answer = normalizeQuizAnswer(selected);
    var total = Math.max(2, count || 5);
    var html = [];
    for (var i = 0; i < total; i++) {
      var letter = quizLetter(i);
      html.push('<option value="' + letter + '"' + (answer === letter ? ' selected' : '') + '>' + letter + '</option>');
    }
    return html.join('');
  }

  function optionExplanationNames(letter) {
    var upper = String(letter || '').toUpperCase();
    var lower = upper.toLowerCase();
    return [
      'option ' + lower + ' explanation',
      'option ' + lower + ' rationale',
      'option ' + lower + ' comment',
      'option ' + lower + ' comentario',
      'option ' + lower + ' explicacao',
      'alternative ' + lower + ' explanation',
      'alternative ' + lower + ' rationale',
      'alternativa ' + lower + ' comentario',
      'alternativa ' + lower + ' explicacao',
      'comentario ' + lower,
      'explicacao ' + lower,
      'rationale ' + lower,
      'explanation ' + lower,
      lower + ' comentario',
      lower + ' explicacao',
      lower + ' rationale',
      lower + ' explanation',
      upper + ' comentario',
      upper + ' explicacao',
      upper + ' rationale',
      upper + ' explanation',
    ];
  }

  function splitStudyFrontAndHint(card) {
    var front = String(card && card.front || '');
    var hint = String(card && card.hint || '');
    var marker = '<br><br><strong>Dica:</strong> ';
    var legacyIndex = front.indexOf(marker);
    if (!hint && legacyIndex >= 0) {
      hint = front.slice(legacyIndex + marker.length);
      front = front.slice(0, legacyIndex);
    }
    return { front: front, hint: hint };
  }

  function getOptionExplanations(card) {
    var options = card && Array.isArray(card.options) ? card.options : [];
    var explanations = card && Array.isArray(card.optionExplanations) ? card.optionExplanations.slice() : [];
    while (explanations.length < options.length) explanations.push('');
    if (!explanations.some(htmlHasContent) && card && htmlHasContent(card.explanation)) {
      explanations = splitOptionExplanations(card.explanation, options.length);
    }
    var answerIndex = Math.max(0, normalizeQuizAnswer(card && card.answer).charCodeAt(0) - 65);
    if ((!explanations[answerIndex] || !htmlHasContent(explanations[answerIndex])) && card && htmlHasContent(card.explanation)) {
      explanations[answerIndex] = card.explanation;
    }
    return explanations;
  }

  function splitOptionExplanations(value, count) {
    var total = Math.max(2, count || 5);
    var text = htmlToText(value);
    var output = Array(total).fill('');
    if (!text) return output;
    var pattern = /(?:^|\n|\r|<br\s*\/?>)\s*(?:alternativa|op(?:c|ç)[aã]o|option)?\s*([A-Z])\s*[\).:\-–]\s*/gi;
    var matches = [];
    var match;
    while ((match = pattern.exec(text)) !== null) {
      var idx = match[1].toUpperCase().charCodeAt(0) - 65;
      if (idx >= 0 && idx < total) matches.push({ index: idx, start: match.index, bodyStart: pattern.lastIndex });
    }
    if (matches.length < 2) return output;
    matches.forEach(function (item, pos) {
      var end = pos + 1 < matches.length ? matches[pos + 1].start : text.length;
      var body = text.slice(item.bodyStart, end).trim();
      if (body) output[item.index] = textToHtml(body);
    });
    return output;
  }

  function renderQuizAlternative(index, value, explanation, selectedAnswer) {
    var letter = quizLetter(index);
    var checked = normalizeQuizAnswer(selectedAnswer) === letter ? ' checked' : '';
    return [
      '<div class="flash-alt-item" data-alt-index="' + index + '">',
      '  <div class="flash-alt-head">',
      '    <span class="flash-alt-letter">' + letter + '</span>',
      '    <textarea id="flashQuizOptionText_' + index + '" class="flash-alt-title-input" rows="2" placeholder="Alternativa ' + letter + '">' + escapeHtml(htmlToText(value || '')) + '</textarea>',
      '    <label class="flash-correct-toggle"><input type="radio" name="flashQuizCorrect" value="' + letter + '"' + checked + '> Correta</label>',
      '    <button type="button" class="flash-symbol-mini" onclick="FlashcardsDashboard.toggleSymbolBank(\'flashQuizOptionText_' + index + '\')" title="Caracteres matematicos">√π</button>',
      '  </div>',
      symbolBank('flashQuizOptionText_' + index),
      richEditor('flashQuizExplanation_' + index, explanation || '', 'Comentario da alternativa ' + letter + '...'),
      '</div>',
    ].join('');
  }

  function renderQuizAlternativeEditors(card) {
    var options = normalizeQuizOptions(card);
    var explanations = getOptionExplanations(card || {});
    var selected = card && card.answer ? card.answer : 'A';
    return [
      '<div class="flash-alt-list" id="flashQuizAlternatives">',
      options.map(function (option, index) { return renderQuizAlternative(index, option, explanations[index], selected); }).join(''),
      '</div>',
      '<button type="button" class="flash-btn ghost flash-add-alt" onclick="FlashcardsDashboard.addQuizAlternative()">+ Adicionar alternativa</button>',
    ].join('');
  }

  function renderCardList(cards) {
    if (!cards.length) {
      return '<div class="flash-empty small"><div class="flash-empty-icon">&#128221;</div><h3>Nenhum card neste baralho</h3><p>Adicione cards ou escolha um baralho interno.</p></div>';
    }
    return '<div class="flash-card-list">' + cards.map(function (card) {
      var typeLabel = card.type === 'quiz' ? 'Questões Comentadas' : card.type === 'cespe' ? 'CESPE' : 'Flip';
      var srs = card.srs || {};
      var status = srs.status || 'new';
      return [
        '<div class="flash-card-row">',
        '  <div class="flash-card-main">',
        '    <div><span class="flash-type">' + typeLabel + '</span><span class="flash-status">' + escapeHtml(status) + '</span></div>',
        '    <strong>' + escapeHtml(shortText(card.front, 120) || 'Sem pergunta') + '</strong>',
        '    <span>' + escapeHtml(shortText(card.back || card.explanation || card.answer, 150) || 'Sem resposta cadastrada') + '</span>',
        '  </div>',
        '  <div class="flash-card-actions">',
        '    <button onclick="FlashcardsDashboard.openCardModal(\'' + card.id + '\')">Editar</button>',
        '    <button onclick="FlashcardsDashboard.deleteCard(\'' + card.id + '\')">Excluir</button>',
        '  </div>',
        '</div>',
      ].join('');
    }).join('') + '</div>';
  }

  function backToDecks() {
    state.activeDeckId = null;
    var view = document.getElementById('flashMainView');
    if (view) view.innerHTML = renderDecksView();
  }

  function toggleChildren(deckId, btn) {
    var list = document.getElementById('flashChildren_' + deckId);
    if (!list) return;
    var parent = list.parentElement && list.parentElement.parentElement;
    if (parent) {
      Array.from(parent.children).forEach(function (sibling) {
        var siblingList = sibling.querySelector(':scope > .flash-children');
        var siblingBtn = sibling.querySelector(':scope > .flash-row .flash-expand');
        if (siblingList && siblingList !== list) siblingList.classList.remove('open');
        if (siblingBtn && siblingBtn !== btn) siblingBtn.classList.remove('open');
      });
    }
    var isOpen = list.classList.toggle('open');
    if (btn) btn.classList.toggle('open', isOpen);
  }

  function openDeckModal(deckId, parentId) {
    state.editingDeckId = deckId || null;
    var decks = getDecks();
    var deck = deckId ? decks.find(function (item) { return item.id === deckId; }) : null;
    var options = ['<option value="">Raiz do concurso</option>'].concat(decks
      .filter(function (item) { return !deck || item.id !== deck.id; })
      .map(function (item) {
        var selected = (deck && deck.parentId === item.id) || (!deck && parentId === item.id) ? ' selected' : '';
        return '<option value="' + item.id + '"' + selected + '>' + escapeHtml(item.name || 'Baralho') + '</option>';
      }));
    showModal([
      '<div class="flash-modal-card">',
      '  <div class="flash-modal-title">' + (deck ? 'Editar Baralho' : 'Novo Baralho') + '</div>',
      '  <label>Nome</label>',
      '  <input id="flashDeckName" class="flash-input" value="' + escapeHtml(deck ? deck.name : '') + '" placeholder="Ex: Direito Constitucional">',
      '  <label>Dentro de</label>',
      '  <select id="flashDeckParent" class="flash-input">' + options.join('') + '</select>',
      '  <input id="flashDeckEmoji" class="flash-input" value="' + escapeHtml(deck && deck.emoji && !['Books', 'Stack', 'Card'].includes(deck.emoji) ? deck.emoji : '') + '" placeholder="Ex: 📚">',
      '  <div class="flash-modal-actions">',
      '    <button class="flash-btn secondary" onclick="FlashcardsDashboard.closeModal()">Cancelar</button>',
      '    <button class="flash-btn primary" onclick="FlashcardsDashboard.saveDeckModal()">Salvar</button>',
      '  </div>',
      '</div>',
    ].join(''));
  }

  function saveDeckModal() {
    var cId = currentConcursoId();
    var decks = getDecks(cId);
    var name = document.getElementById('flashDeckName').value.trim();
    var parentId = document.getElementById('flashDeckParent').value || null;
    var emoji = 'Books';
    if (!name) {
      toast('Informe um nome para o baralho.', '!');
      return;
    }
    if (state.editingDeckId) {
      var deck = decks.find(function (item) { return item.id === state.editingDeckId; });
      if (deck) {
        deck.name = name;
        deck.parentId = parentId;
        deck.emoji = emoji;
        deck.updatedAt = nowIso();
      }
    } else {
      decks.push({
        id: uid('fcdeck'),
        concursoId: cId,
        name: name,
        emoji: emoji,
        parentId: parentId,
        sourceType: 'custom',
        sourceId: null,
        order: decks.length + 1,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    }
    saveDecks(decks);
    closeModal();
    render();
  }

  function openCardModal(cardId, deckId) {
    var cards = getCards();
    var card = cardId ? cards.find(function (item) { return item.id === cardId; }) : null;
    var targetDeckId = deckId || (card && card.deckId) || state.activeDeckId;
    if (!targetDeckId) {
      toast('Escolha um baralho antes de criar o card.', '!');
      return;
    }
    state.editingCardId = cardId || null;
    var type = card ? card.type : 'flip';
    showModal([
      '<div class="flash-modal-card wide">',
      '  <div class="flash-modal-title">' + (card ? 'Editar Flashcard' : 'Novo Flashcard') + '</div>',
      '  <input id="flashCardDeckId" type="hidden" value="' + escapeHtml(targetDeckId) + '">',
      '  <label>Tipo</label>',
      '  <select id="flashCardType" class="flash-input" onchange="FlashcardsDashboard.toggleCardFields()">',
      '    <option value="flip"' + (type === 'flip' ? ' selected' : '') + '>Flip</option>',
      '    <option value="quiz"' + (type === 'quiz' ? ' selected' : '') + '>Questões Comentadas</option>',
      '    <option value="cespe"' + (type === 'cespe' ? ' selected' : '') + '>CESPE certo/errado</option>',
      '  </select>',
      '  <label>Frente / pergunta</label>',
      richEditor('flashCardFront', card && card.front || '', 'Escreva a pergunta ou enunciado...'),
      '  <div id="flashFlipFields">',
      '    <label>Verso / resposta</label>',
      richEditor('flashCardBack', card && card.back || '', 'Escreva a resposta...'),
      '  </div>',
      '  <div id="flashQuizFields">',
      '    <label>Alternativas comentadas</label>',
      renderQuizAlternativeEditors(card),
      '  </div>',
      '  <div id="flashCespeFields">',
      '    <label>Gabarito</label>',
      '    <select id="flashCardCespeAnswer" class="flash-input">',
      '      <option value="certo"' + (card && card.answer === 'certo' ? ' selected' : '') + '>Certo</option>',
      '      <option value="errado"' + (card && card.answer === 'errado' ? ' selected' : '') + '>Errado</option>',
      '    </select>',
      '  </div>',
      '  <div id="flashExplanationFields">',
      '    <label>Explicacao</label>',
      richEditor('flashCardExplanation', card && card.explanation || '', 'Explique o gabarito...'),
      '  </div>',
      '  <label>Tags</label>',
      '  <input id="flashCardTags" class="flash-input" value="' + escapeHtml(card && Array.isArray(card.tags) ? card.tags.join(', ') : '') + '" placeholder="separe por virgula">',
      '  <div class="flash-modal-actions">',
      '    <button class="flash-btn secondary" onclick="FlashcardsDashboard.closeModal()">Cancelar</button>',
      '    <button class="flash-btn primary" onclick="FlashcardsDashboard.saveCardModal()">Salvar Card</button>',
      '  </div>',
      '</div>',
    ].join(''));
    toggleCardFields();
    setupRichPaste('flashCardFront');
    setupRichPaste('flashCardBack');
    setupRichPaste('flashCardExplanation');
    setupQuizEditors();
  }

  function toggleCardFields() {
    var type = document.getElementById('flashCardType');
    if (!type) return;
    var value = type.value;
    document.getElementById('flashFlipFields').style.display = value === 'flip' ? '' : 'none';
    document.getElementById('flashQuizFields').style.display = value === 'quiz' ? '' : 'none';
    document.getElementById('flashCespeFields').style.display = value === 'cespe' ? '' : 'none';
    document.getElementById('flashExplanationFields').style.display = value === 'cespe' ? '' : 'none';
  }

  function setupQuizEditors() {
    document.querySelectorAll('[id^="flashQuizExplanation_"]').forEach(function (el) {
      setupRichPaste(el.id);
    });
  }

  function addQuizAlternative() {
    var wrap = document.getElementById('flashQuizAlternatives');
    if (!wrap) return;
    var index = wrap.querySelectorAll('.flash-alt-item').length;
    if (index >= 26) {
      toast('Limite de 26 alternativas atingido.', '!');
      return;
    }
    wrap.insertAdjacentHTML('beforeend', renderQuizAlternative(index, '', '', null));
    setupRichPaste('flashQuizExplanation_' + index);
  }

  function collectQuizOptions() {
    var options = Array.from(document.querySelectorAll('[id^="flashQuizOptionText_"]')).map(function (el) {
      return textToHtml(el.value.trim());
    });
    while (options.length > 2 && !htmlHasContent(options[options.length - 1])) options.pop();
    return options;
  }

  function collectQuizExplanations(limit) {
    return Array.from(document.querySelectorAll('[id^="flashQuizExplanation_"]')).slice(0, limit).map(function (el) {
      return el.innerHTML.trim();
    });
  }

  function saveCardModal() {
    var cId = currentConcursoId();
    var cards = getCards(cId);
    var type = document.getElementById('flashCardType').value;
    var deckId = document.getElementById('flashCardDeckId').value;
    var front = getRichHtml('flashCardFront');
    var back = getRichHtml('flashCardBack');
    var options = type === 'quiz' ? collectQuizOptions() : [];
    var correctInput = document.querySelector('input[name="flashQuizCorrect"]:checked');
    var answer = type === 'cespe' ? document.getElementById('flashCardCespeAnswer').value : (type === 'quiz' && correctInput ? normalizeQuizAnswer(correctInput.value) : '');
    var optionExplanations = type === 'quiz' ? collectQuizExplanations(options.length) : [];
    var explanation = getRichHtml('flashCardExplanation');
    var tags = document.getElementById('flashCardTags').value.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    var previous = state.editingCardId ? cards.find(function (item) { return item.id === state.editingCardId; }) : null;

    if (!getRichText('flashCardFront')) {
      toast('Digite a frente do card.', '!');
      return;
    }
    if (type === 'flip' && !getRichText('flashCardBack')) {
      toast('Digite o verso do card.', '!');
      return;
    }
    if (type === 'quiz') {
      var filledOptions = options.filter(htmlHasContent);
      var answerIndex = Math.max(0, normalizeQuizAnswer(answer).charCodeAt(0) - 65);
      if (filledOptions.length < 2) {
        toast('Preencha pelo menos duas alternativas.', '!');
        return;
      }
      if (!answer) {
        toast('Marque qual alternativa esta correta.', '!');
        return;
      }
      if (!options[answerIndex] || !htmlHasContent(options[answerIndex])) {
        toast('A alternativa marcada no gabarito precisa estar preenchida.', '!');
        return;
      }
    }

    var payload = {
      concursoId: cId,
      deckId: deckId,
      type: type,
      front: front,
      back: type === 'flip' ? back : '',
      options: type === 'quiz' ? options : [],
      optionExplanations: type === 'quiz' ? optionExplanations : [],
      hint: previous && previous.hint ? previous.hint : '',
      answer: answer,
      explanation: type === 'quiz' ? (optionExplanations[answerIndex] || '') : type === 'cespe' ? explanation : '',
      tags: tags,
      updatedAt: nowIso(),
    };

    if (state.editingCardId) {
      var existing = previous;
      if (existing) Object.assign(existing, payload);
    } else {
      cards.push(Object.assign({
        id: uid('fccard'),
        createdAt: nowIso(),
        srs: initSrs(),
      }, payload));
    }

    saveCards(cards);
    closeModal();
    if (state.activeDeckId) openDeck(state.activeDeckId);
    else render();
    updateTabBadge();
  }

  function formatRich(id, command) {
    focusRich(id);
    document.execCommand(command, false, null);
  }

  function formatRichBlock(id, block) {
    if (!block) return;
    focusRich(id);
    document.execCommand('formatBlock', false, block);
  }

  function insertRichLink(id) {
    focusRich(id);
    var url = prompt('Cole o link:');
    if (!url) return;
    document.execCommand('createLink', false, url);
  }

  function insertImageData(id, dataUrl) {
    focusRich(id);
    document.execCommand('insertHTML', false, '<img src="' + dataUrl + '" alt="Imagem do flashcard">');
  }

  function pickRichImage(id) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function () {
      var file = input.files && input.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (event) {
        insertImageData(id, event.target.result);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  function setupRichPaste(id) {
    var el = document.getElementById(id);
    if (!el || el.dataset.pasteReady) return;
    el.dataset.pasteReady = '1';
    el.addEventListener('paste', function (event) {
      var items = event.clipboardData && event.clipboardData.items;
      if (!items) return;
      for (var i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.indexOf('image/') === 0) {
          event.preventDefault();
          var file = items[i].getAsFile();
          var reader = new FileReader();
          reader.onload = function (e) { insertImageData(id, e.target.result); };
          reader.readAsDataURL(file);
          return;
        }
      }
    });
  }

  function cleanDelimitedImportText(text) {
    return String(text || '')
      .replace(/^\ufeff/, '')
      .split(/\r?\n/)
      .filter(function (line) {
        return !/^#(separator|html|notetype|deck|tags|columns?):/i.test(String(line || '').trim());
      })
      .join('\n');
  }

  function detectDelimiter(text) {
    var lines = String(text || '').split(/\r?\n/).filter(function (line) {
      return String(line || '').trim() && String(line || '').trim()[0] !== '#';
    });
    var sample = lines.slice(0, 5).join('\n');
    var counts = [
      { value: '\t', count: (sample.match(/\t/g) || []).length },
      { value: ';', count: (sample.match(/;/g) || []).length },
      { value: ',', count: (sample.match(/,/g) || []).length },
    ];
    counts.sort(function (a, b) { return b.count - a.count; });
    return counts[0].count > 0 ? counts[0].value : ',';
  }

  function parseDelimited(text, delimiter) {
    var rows = [];
    var row = [];
    var cell = '';
    var quoted = false;
    delimiter = delimiter || detectDelimiter(text);
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      var next = text[i + 1];
      if (ch === '"' && quoted && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = !quoted;
      } else if (ch === delimiter && !quoted) {
        row.push(cell);
        cell = '';
      } else if ((ch === '\n' || ch === '\r') && !quoted) {
        if (ch === '\r' && next === '\n') i++;
        row.push(cell);
        if (row.some(function (value) { return String(value).trim(); })) rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += ch;
      }
    }
    row.push(cell);
    if (row.some(function (value) { return String(value).trim(); })) rows.push(row);
    return rows;
  }

  function parseCSV(text) {
    var cleaned = cleanDelimitedImportText(text);
    return parseDelimited(cleaned, detectDelimiter(cleaned));
  }

  function openImportModal(deckId) {
    if (!deckId) {
      toast('Escolha uma materia, topico ou subtopico para importar.', '!');
      return;
    }
    showModal([
      '<div class="flash-modal-card">',
      '  <div class="flash-modal-title">Importar flashcards</div>',
      '  <p class="flash-modal-sub">Escolha um arquivo JSON, CSV, TSV ou TXT exportado por apps como Anki. JSON preserva alternativas comentadas completas; arquivos tabulares importam frente, verso, tags e questoes quando disponiveis.</p>',
      '  <div class="flash-import-format">',
      '    <strong>JSON recomendado</strong><span>Usa question, hint, options, correctAnswer e rationale por alternativa.</span>',
      '  </div>',
      '  <div class="flash-import-format">',
      '    <strong>CSV/TSV/Anki</strong><span>Aceita CSV com cabecalho, TSV/TXT do Anki com Front/Back/Tags e arquivos com separador TAB.</span>',
      '  </div>',
      '  <div class="flash-modal-actions">',
      '    <button class="flash-btn secondary" onclick="FlashcardsDashboard.closeModal()">Cancelar</button>',
      '    <button class="flash-btn primary" onclick="FlashcardsDashboard.importFile(\'' + deckId + '\')">Escolher arquivo</button>',
      '  </div>',
      '</div>',
    ].join(''));
  }

  function importFile(deckId) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json,.csv,text/csv,.tsv,text/tab-separated-values,.txt,text/plain';
    input.onchange = function () {
      var file = input.files && input.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (event) {
        var text = String(event.target.result || '');
        var lowerName = String(file.name || '').toLowerCase();
        var created = lowerName.endsWith('.json') ? importJSONCards(text, deckId) : importCSVCards(text, deckId);
        if (!created) return;
        closeModal();
        if (state.activeDeckId) openDeck(state.activeDeckId);
        else render();
        updateTabBadge();
        toast('Importacao concluida: ' + created + ' card(s) criado(s).', 'OK');
      };
      reader.readAsText(file, 'utf-8');
    };
    input.click();
  }

  function sanitizeFileName(value) {
    return String(value || 'flashcards')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/gi, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase() || 'flashcards';
  }

  async function downloadTextFile(fileName, mimeType, content) {
    if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.salvar_arquivo_texto === 'function') {
      var ext = String(fileName || '').split('.').pop() || 'txt';
      var baseName = String(fileName || 'arquivo').replace(/\.[^.]+$/, '');
      var label = ext.toLowerCase() === 'csv' ? 'CSV' : ext.toLowerCase() === 'json' ? 'JSON' : 'Arquivo de texto';
      return window.pywebview.api.salvar_arquivo_texto(baseName, content, ext, label);
    }
    var blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    return { ok: true, caminho: fileName };
  }

  function getDeckPath(deck, deckMap) {
    var parts = [];
    var current = deck;
    var guard = 0;
    while (current && guard < 20) {
      parts.unshift(current.name || 'Baralho');
      current = current.parentId ? deckMap[current.parentId] : null;
      guard++;
    }
    return parts.join(' > ');
  }

  function buildFlashcardsExportPayload() {
    var cId = currentConcursoId();
    var concurso = window.CT && cId ? CT.getConcurso(cId) : null;
    var decks = getDecks(cId);
    var cards = getCards(cId);
    var log = getLog(cId);
    var deckMap = {};
    decks.forEach(function (deck) { deckMap[deck.id] = deck; });
    return {
      type: 'track_concursos_flashcards_export',
      version: '1.0',
      exportedAt: nowIso(),
      concurso: concurso ? {
        id: concurso.id,
        nome: concurso.nome || '',
        banca: concurso.banca || '',
        cargo: concurso.cargo || '',
      } : { id: cId || '', nome: '', banca: '', cargo: '' },
      decks: decks.map(function (deck) {
        return Object.assign({}, deck, { path: getDeckPath(deck, deckMap) });
      }),
      cards: cards.map(function (card) {
        var deck = deckMap[card.deckId] || null;
        return Object.assign({}, card, {
          deckName: deck ? deck.name : '',
          deckPath: deck ? getDeckPath(deck, deckMap) : '',
        });
      }),
      log: log,
    };
  }

  async function exportJSON() {
    var payload = buildFlashcardsExportPayload();
    if (!payload.cards.length) {
      toast('Nenhum flashcard para exportar.', '!');
      return;
    }
    var base = sanitizeFileName((payload.concurso && payload.concurso.nome) || 'track_concursos');
    var res = await downloadTextFile(base + '_flashcards.json', 'application/json', JSON.stringify(payload, null, 2));
    if (res && res.ok) toast('Flashcards exportados em JSON.', 'OK');
    else if (res && res.motivo !== 'cancelado') toast('Erro ao exportar JSON: ' + (res.motivo || 'desconhecido'), '!');
  }

  function csvCell(value) {
    var text = String(value == null ? '' : value);
    return '"' + text.replace(/"/g, '""') + '"';
  }

  async function exportCSV() {
    var payload = buildFlashcardsExportPayload();
    if (!payload.cards.length) {
      toast('Nenhum flashcard para exportar.', '!');
      return;
    }
    var headers = [
      'deck_path', 'deck_name', 'type', 'front', 'back', 'hint',
      'option_a', 'option_b', 'option_c', 'option_d', 'option_e',
      'correct_answer', 'explanation', 'option_rationale_a', 'option_rationale_b',
      'option_rationale_c', 'option_rationale_d', 'option_rationale_e',
      'tags', 'status', 'next_review', 'front_html', 'back_html'
    ];
    var rows = [headers.map(csvCell).join(',')];
    payload.cards.forEach(function (card) {
      var options = Array.isArray(card.options) ? card.options : [];
      var rationales = Array.isArray(card.optionExplanations) ? card.optionExplanations : [];
      rows.push([
        card.deckPath || '',
        card.deckName || '',
        card.type || 'flip',
        htmlToText(card.front),
        htmlToText(card.back),
        htmlToText(card.hint),
        htmlToText(options[0]),
        htmlToText(options[1]),
        htmlToText(options[2]),
        htmlToText(options[3]),
        htmlToText(options[4]),
        card.answer || '',
        htmlToText(card.explanation),
        htmlToText(rationales[0]),
        htmlToText(rationales[1]),
        htmlToText(rationales[2]),
        htmlToText(rationales[3]),
        htmlToText(rationales[4]),
        Array.isArray(card.tags) ? card.tags.join('; ') : '',
        card.srs && card.srs.status || '',
        card.srs && card.srs.nextReview || '',
        card.front || '',
        card.back || '',
      ].map(csvCell).join(','));
    });
    var base = sanitizeFileName((payload.concurso && payload.concurso.nome) || 'track_concursos');
    var res = await downloadTextFile(base + '_flashcards.csv', 'text/csv', '\ufeff' + rows.join('\r\n'));
    if (res && res.ok) toast('Flashcards exportados em CSV.', 'OK');
    else if (res && res.motivo !== 'cancelado') toast('Erro ao exportar CSV: ' + (res.motivo || 'desconhecido'), '!');
  }

  function normalizeImportedHtml(value) {
    var raw = String(value || '').trim();
    if (!raw) return '';
    return /<\/?[a-z][\s\S]*>/i.test(raw) ? raw : textToHtml(raw);
  }

  function normalizeImportedTags(value) {
    if (Array.isArray(value)) return value.map(String).map(function (x) { return x.trim(); }).filter(Boolean);
    return String(value || '').split(/[;,]/).map(function (x) { return x.trim(); }).filter(Boolean);
  }

  function importCSVCards(text, deckId) {
        var rows = parseCSV(text);
        if (!rows.length) {
          toast('CSV vazio ou invalido.', '!');
          return 0;
        }
        var first = rows[0].map(normalizeCsvHeader);
        var hasHeader = first.some(function (x) {
          return ['front', 'frente', 'pergunta', 'question', 'enunciado', 'verso', 'back', 'resposta', 'tipo', 'type', 'option a', 'correct answer', 'rationale'].includes(x);
        });
        var header = hasHeader ? first : [];
        var dataRows = hasHeader ? rows.slice(1) : rows;
        var idx = function (names, fallback) {
          return findCsvIndex(header, names, fallback);
        };
        var iFront = idx(['front', 'frente', 'pergunta', 'question', 'enunciado'], 0);
        var iFrontHtml = idx(['front_html', 'frente_html', 'question_html'], -1);
        var iBack = idx(['back', 'verso', 'resposta'], 1);
        var iBackHtml = idx(['back_html', 'verso_html', 'answer_html'], -1);
        var iType = idx(['type', 'tipo'], -1);
        var iHint = idx(['hint', 'dica'], -1);
        var iAnswer = idx(['answer', 'gabarito', 'correct answer', 'resposta correta'], -1);
        var iOptions = idx(['options', 'alternativas'], -1);
        var iOptionLetters = ['a', 'b', 'c', 'd', 'e'].map(function (letter) {
          return idx(['option ' + letter, 'alternativa ' + letter, letter.toUpperCase()], -1);
        });
        var iOptionExplanations = ['a', 'b', 'c', 'd', 'e'].map(function (letter) {
          return idx(optionExplanationNames(letter), -1);
        });
        var iExplanation = idx(['explanation', 'explicacao', 'explicação', 'comentario', 'comentário', 'rationale', 'justificativa'], -1);
        var iTags = idx(['tags', 'tag'], hasHeader ? -1 : 2);
        var cards = getCards();
        var cId = currentConcursoId();
        var created = 0;
        dataRows.forEach(function (row) {
          var front = String(row[iFront] || '').trim();
          var back = String(row[iBack] || '').trim();
          var hint = iHint >= 0 ? String(row[iHint] || '').trim() : '';
          var letterOptions = iOptionLetters.map(function (optionIndex) {
            return optionIndex >= 0 ? String(row[optionIndex] || '').trim() : '';
          }).filter(Boolean);
          var rawType = iType >= 0 ? String(row[iType] || '').trim().toLowerCase() : 'flip';
          var hasQuizColumns = letterOptions.length >= 2 && iAnswer >= 0;
          var type = rawType.indexOf('cespe') >= 0 ? 'cespe' : (rawType.indexOf('quiz') >= 0 || rawType.indexOf('quest') >= 0 || hasQuizColumns) ? 'quiz' : 'flip';
          var options = letterOptions.length
            ? letterOptions.map(function (x) { return textToHtml(x); })
            : (iOptions >= 0 ? String(row[iOptions] || '').split(/\||\n/).map(function (x) { return textToHtml(x.trim()); }).filter(Boolean) : []);
          var optionExplanations = iOptionExplanations.map(function (explanationIndex) {
            return explanationIndex >= 0 ? textToHtml(String(row[explanationIndex] || '').trim()) : '';
          });
          var answer = iAnswer >= 0 ? answerTextToLetter(row[iAnswer]) : '';
          var explanation = iExplanation >= 0 ? String(row[iExplanation] || '').trim() : '';
          if (!optionExplanations.some(htmlHasContent) && explanation) {
            optionExplanations = splitOptionExplanations(textToHtml(explanation), options.length);
          }
          var frontHtml = iFrontHtml >= 0 && row[iFrontHtml] ? normalizeImportedHtml(row[iFrontHtml]) : textToHtml(front);
          var backHtml = iBackHtml >= 0 && row[iBackHtml] ? normalizeImportedHtml(row[iBackHtml]) : textToHtml(back);
          if (!front) return;
          if (type === 'flip' && !back) return;
          if (type === 'quiz' && (options.filter(htmlHasContent).length < 2 || !answer)) return;
          cards.push({
            id: uid('fccard'),
            concursoId: cId,
            deckId: deckId,
            type: type,
            front: frontHtml,
            back: type === 'flip' ? backHtml : '',
            options: type === 'quiz' ? options : [],
            optionExplanations: type === 'quiz' ? optionExplanations : [],
            hint: hint ? textToHtml(hint) : '',
            answer: type === 'flip' ? '' : (answer || back),
            explanation: type === 'quiz' || type === 'cespe' ? textToHtml(explanation || back) : '',
            tags: iTags >= 0 ? String(row[iTags] || '').split(/[;,]/).map(function (x) { return x.trim(); }).filter(Boolean) : [],
            createdAt: nowIso(),
            updatedAt: nowIso(),
            srs: initSrs(),
          });
          created++;
        });
        saveCards(cards);
        return created;
  }

  function importJSONCards(text, deckId) {
    var payload;
    try {
      payload = JSON.parse(text);
    } catch (e) {
      toast('JSON invalido. Verifique o arquivo exportado.', '!');
      return 0;
    }
    var questions = Array.isArray(payload)
      ? payload
      : Array.isArray(payload.cards) ? payload.cards
      : Array.isArray(payload.questions) ? payload.questions
      : Array.isArray(payload.items) ? payload.items
      : [];
    if (!questions.length) {
      toast('JSON sem questoes reconheciveis.', '!');
      return 0;
    }
    var cards = getCards();
    var cId = currentConcursoId();
    var created = 0;
    questions.forEach(function (question) {
      var declaredType = String(question.type || question.tipo || '').toLowerCase();
      var front = String(question.front || question.frontHtml || question.question || question.enunciado || question.prompt || question.text || '').trim();
      var back = String(question.back || question.backHtml || question.answerText || question.verso || question.resposta || '').trim();
      if (!front) return;

      if (declaredType === 'flip' || (!Array.isArray(question.options) && !Array.isArray(question.alternatives) && back)) {
        cards.push({
          id: uid('fccard'),
          concursoId: cId,
          deckId: deckId,
          type: 'flip',
          front: normalizeImportedHtml(front),
          back: normalizeImportedHtml(back),
          options: [],
          optionExplanations: [],
          hint: question.hint || question.dica ? normalizeImportedHtml(question.hint || question.dica) : '',
          answer: '',
          explanation: '',
          tags: normalizeImportedTags(question.tags),
          createdAt: nowIso(),
          updatedAt: nowIso(),
          srs: initSrs(),
        });
        created++;
        return;
      }

      var rawOptions = Array.isArray(question.options) ? question.options : Array.isArray(question.alternatives) ? question.alternatives : [];
      var options = [];
      var optionExplanations = [];
      var correctAnswer = normalizeQuizAnswer(question.correctAnswer || question.answer || question.gabarito || '');
      rawOptions.forEach(function (option, index) {
        var textValue = typeof option === 'string' ? option : String(option.text || option.option || option.alternative || option.labelText || '').trim();
        if (!textValue) return;
        var label = typeof option === 'object' && option ? normalizeQuizAnswer(option.label || option.letter || option.key || quizLetter(index)) : quizLetter(index);
        if (typeof option === 'object' && option && option.isCorrect) correctAnswer = label;
        options.push(normalizeImportedHtml(textValue));
        optionExplanations.push(typeof option === 'object' && option ? normalizeImportedHtml(option.rationale || option.explanation || option.comment || option.comentario || option.justificativa || '') : '');
      });
      if (options.filter(htmlHasContent).length < 2 || !correctAnswer) return;
      var answerIndex = rawOptions.findIndex(function (option, index) {
        var label = typeof option === 'object' && option ? normalizeQuizAnswer(option.label || option.letter || option.key || quizLetter(index)) : quizLetter(index);
        return label === correctAnswer;
      });
      var normalizedAnswer = answerIndex >= 0 ? quizLetter(answerIndex) : correctAnswer;
      var correctExplanation = optionExplanations[Math.max(0, normalizedAnswer.charCodeAt(0) - 65)] || '';
      cards.push({
        id: uid('fccard'),
        concursoId: cId,
        deckId: deckId,
        type: 'quiz',
        front: normalizeImportedHtml(front),
        back: '',
        options: options,
        optionExplanations: optionExplanations,
        hint: question.hint || question.dica ? normalizeImportedHtml(question.hint || question.dica) : '',
        answer: normalizedAnswer,
        explanation: correctExplanation || normalizeImportedHtml(question.explanation || question.explicacao || question.comentario || ''),
        tags: normalizeImportedTags(question.tags),
        createdAt: nowIso(),
        updatedAt: nowIso(),
        srs: initSrs(),
      });
      created++;
    });
    saveCards(cards);
    return created;
  }
  function deleteCard(cardId) {
    if (!confirm('Excluir este flashcard?')) return;
    var cards = getCards();
    saveCards(cards.filter(function (card) { return card.id !== cardId; }));
    if (state.activeDeckId) openDeck(state.activeDeckId);
    updateTabBadge();
  }

  function deleteDeck(deckId) {
    var decks = getDecks();
    var ids = getDescendantIds(deckId, decks);
    var cards = getCards();
    var affectedCards = cards.filter(function (card) { return ids.includes(card.deckId); }).length;
    var message = affectedCards > 0
      ? 'Excluir este baralho, sub-baralhos e ' + affectedCards + ' flashcard(s)?'
      : 'Excluir este baralho e seus sub-baralhos?';
    if (!confirm(message)) return;
    saveDecks(decks.filter(function (deck) { return !ids.includes(deck.id); }));
    saveCards(cards.filter(function (card) { return !ids.includes(card.deckId); }));
    if (state.activeDeckId && ids.includes(state.activeDeckId)) state.activeDeckId = null;
    render();
    updateTabBadge();
  }

  function getStudyDeckIds(deckId, decks) {
    if (deckId) return getDescendantIds(deckId, decks);
    return decks.map(function (deck) { return deck.id; });
  }

  function cardMatchesScope(card, scope) {
    if (scope === 'all') return true;
    if (scope === 'new') return String(card.createdAt || '').slice(0, 10) === today();
    return isDue(card);
  }

  function sortStudyCards(cards) {
    return cards.slice().sort(function (a, b) {
      if (isDue(a) !== isDue(b)) return isDue(a) ? -1 : 1;
      return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
    });
  }

  function shuffleCards(cards) {
    var copy = cards.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }
    return copy;
  }

  function sortHardestCards(cards) {
    return cards.slice().sort(function (a, b) {
      var as = a.srs || {};
      var bs = b.srs || {};
      if (Number(bs.lapses || 0) !== Number(as.lapses || 0)) return Number(bs.lapses || 0) - Number(as.lapses || 0);
      if (Number(as.ease || 2.5) !== Number(bs.ease || 2.5)) return Number(as.ease || 2.5) - Number(bs.ease || 2.5);
      return String(as.lastReview || a.createdAt || '').localeCompare(String(bs.lastReview || b.createdAt || ''));
    });
  }

  function hasStudyChildren(deckId, decks) {
    if (!deckId) return decks.length > 1;
    return decks.some(function (deck) { return deck.parentId === deckId; });
  }

  function getCardsForStudy(deckId, scope, options) {
    var cId = currentConcursoId();
    var decks = getDecks(cId);
    var ids = getStudyDeckIds(deckId, decks);
    var cards = getCards(cId).filter(function (card) {
      return ids.includes(card.deckId) && cardMatchesScope(card, scope);
    });

    if (options && options.limitByDeck) {
      var max = Math.max(1, Number(options.maxPerDeck || 5));
      var grouped = {};
      cards.forEach(function (card) {
        grouped[card.deckId] = grouped[card.deckId] || [];
        grouped[card.deckId].push(card);
      });
      cards = Object.keys(grouped).reduce(function (acc, id) {
        var group = options.pickMode === 'hard' ? sortHardestCards(grouped[id]) : shuffleCards(grouped[id]);
        return acc.concat(group.slice(0, max));
      }, []);
    }

    return options && options.pickMode === 'hard' ? sortHardestCards(cards) : sortStudyCards(cards);
  }

  function startStudyFromStats(scope) {
    startStudy(state.activeDeckId || null, scope || 'due');
  }

  function openAggregateStudyModal(deckId, scope) {
    var cId = currentConcursoId();
    var decks = getDecks(cId);
    var title = deckId ? ((decks.find(function (deck) { return deck.id === deckId; }) || {}).name || 'Baralho') : 'Todos os flashcards';
    var total = getCardsForStudy(deckId, scope, { limitByDeck: false }).length;
    var deckGroups = Array.from(new Set(getCardsForStudy(deckId, scope, { limitByDeck: false }).map(function (card) { return card.deckId; }))).length;
    showModal([
      '<div class="flash-modal-card aggregate">',
      '  <div class="flash-modal-title">Como deseja estudar?</div>',
      '  <p class="flash-modal-sub">' + escapeHtml(title) + ' &bull; ' + total + ' card(s) disponiveis em ' + deckGroups + ' item(ns).</p>',
      '  <input type="hidden" id="flashAggregateDeck" value="' + escapeHtml(deckId || '') + '">',
      '  <input type="hidden" id="flashAggregateScope" value="' + escapeHtml(scope || 'due') + '">',
      '  <label class="flash-radio-row"><input type="radio" name="flashAggregateMode" value="all" checked> Estudar todos os flashcards encontrados</label>',
      '  <label class="flash-radio-row"><input type="radio" name="flashAggregateMode" value="limit"> Limitar quantidade por topico/subtopico</label>',
      '  <div class="flash-aggregate-grid">',
      '    <div>',
      '      <label>Maximo por topico/subtopico</label>',
      '      <input class="flash-input" id="flashAggregateMax" type="number" min="1" value="5">',
      '    </div>',
      '    <div>',
      '      <label>Selecao</label>',
      '      <select class="flash-input" id="flashAggregatePick">',
      '        <option value="random">Aleatorios</option>',
      '        <option value="hard">Mais dificeis</option>',
      '      </select>',
      '    </div>',
      '  </div>',
      '  <div class="flash-modal-actions">',
      '    <button class="flash-btn secondary" onclick="FlashcardsDashboard.closeModal()">Cancelar</button>',
      '    <button class="flash-btn primary" onclick="FlashcardsDashboard.confirmAggregateStudy()">Comecar</button>',
      '  </div>',
      '</div>',
    ].join(''));
  }

  function confirmAggregateStudy() {
    var deckId = document.getElementById('flashAggregateDeck').value || null;
    var scope = document.getElementById('flashAggregateScope').value || 'due';
    var mode = document.querySelector('input[name="flashAggregateMode"]:checked');
    var max = document.getElementById('flashAggregateMax').value;
    var pick = document.getElementById('flashAggregatePick').value;
    closeModal();
    startStudy(deckId, scope, {
      confirmed: true,
      limitByDeck: mode && mode.value === 'limit',
      maxPerDeck: max,
      pickMode: pick,
    });
  }

  function startStudy(deckId, scope, options) {
    options = options || {};
    var cId = currentConcursoId();
    var decks = getDecks(cId);
    if (!options.confirmed && hasStudyChildren(deckId, decks)) {
      openAggregateStudyModal(deckId, scope || 'due');
      return;
    }
    var cards = getCardsForStudy(deckId, scope || 'due', options);
    if (!cards.length) {
      toast(scope === 'all' ? 'Nenhum card encontrado.' : scope === 'new' ? 'Nenhum card novo hoje.' : 'Nenhum card pendente encontrado.', 'OK');
      return;
    }
    state.study = {
      deckId: deckId,
      cards: cards,
      index: 0,
      revealed: false,
      selectedAnswer: '',
      hintVisible: false,
      results: { again: 0, hard: 0, good: 0, easy: 0 },
    };
    var view = document.getElementById('flashMainView');
    if (view) view.innerHTML = renderStudy();
  }

  function renderStudy() {
    var st = state.study;
    if (!st) return renderDecksView();
    if (st.index >= st.cards.length) return renderStudyResults();
    var card = st.cards[st.index];
    var progress = Math.round((st.index / st.cards.length) * 100);
    var typeLabel = card.type === 'cespe' ? 'CESPE' : card.type === 'quiz' ? 'Quest&otilde;es Comentadas' : 'Flip';
    var isQuiz = card.type === 'quiz';
    var canFlip = !isQuiz;
    var studyClasses = ['flash-flip-card'];
    if (st.revealed) studyClasses.push('flipped');
    if (isQuiz) studyClasses.push('quiz-mode');
    if (isQuiz && st.revealed) studyClasses.push('answered');
    var frontBits = splitStudyFrontAndHint(card);
    return [
      '<div class="flash-study">',
      '  <div class="flash-study-top">',
      '    <button class="flash-btn ghost" onclick="FlashcardsDashboard.cancelStudy()">&#8592; Sair</button>',
      '    <span>Card ' + (st.index + 1) + '/' + st.cards.length + '</span>',
      '  </div>',
      '  <div class="flash-progress"><div style="width:' + progress + '%"></div></div>',
      '  <div class="flash-flip-shell">',
      '    <div class="' + studyClasses.join(' ') + '" id="flashStudyCard"' + (canFlip ? ' onclick="FlashcardsDashboard.revealStudyCard()" onkeydown="FlashcardsDashboard.handleStudyCardKey(event)" role="button" tabindex="0"' : '') + '>',
      '      <div class="flash-flip-face front">',
      '        <div class="flash-study-kicker">' + typeLabel + '</div>',
      '        <div class="flash-study-front">' + (frontBits.front || '') + '</div>',
      renderStudyHint(frontBits.hint),
      renderStudyPrompt(card),
      canFlip ? '        <div class="flash-flip-hint">Clique para virar</div>' : '',
      '      </div>',
      isQuiz ? '' : '      <div class="flash-flip-face back">',
      isQuiz ? '' : '        <div class="flash-study-kicker">Resposta</div>',
      isQuiz ? '' : renderStudyAnswer(card),
      canFlip ? '        <div class="flash-flip-hint">Clique para rever a pergunta</div>' : '',
      isQuiz ? '' : '      </div>',
      '    </div>',
      '  </div>',
      renderSrsBar(st.revealed, card),
      '</div>',
    ].join('');
  }

  function renderStudyHint(hint) {
    if (!htmlHasContent(hint)) return '';
    var visible = !!(state.study && state.study.hintVisible);
    return [
      '<div class="flash-hint-spoiler ' + (visible ? 'open' : '') + '">',
      '  <button type="button" onclick="FlashcardsDashboard.toggleStudyHint(event)">' + (visible ? 'Ocultar dica' : 'Mostrar dica') + '</button>',
      visible ? '  <div class="flash-hint-box">' + hint + '</div>' : '',
      '</div>',
    ].join('');
  }

  function renderStudyPrompt(card) {
    if (card.type === 'quiz' && Array.isArray(card.options) && card.options.length) {
      var selected = state.study && state.study.selectedAnswer ? normalizeQuizAnswer(state.study.selectedAnswer) : '';
      var answer = normalizeQuizAnswer(card.answer);
      var revealed = !!(state.study && state.study.revealed);
      var comments = getOptionExplanations(card);
      return '<div class="flash-study-options flash-study-options-rich">' + card.options.map(function (opt, idx) {
        if (!htmlHasContent(opt)) return '';
        var letter = quizLetter(idx);
        var classes = ['flash-quiz-option'];
        if (revealed && letter === answer) classes.push('correct');
        if (revealed && letter === selected && letter !== answer) classes.push('wrong selected');
        if (revealed && letter === selected && letter === answer) classes.push('selected');
        if (revealed && letter !== answer && letter !== selected) classes.push('muted');
        var comment = revealed && htmlHasContent(comments[idx]) ? '<div class="flash-quiz-option-comment">' + comments[idx] + '</div>' : '';
        var status = '';
        if (revealed && letter === answer) status = '<div class="flash-quiz-option-status correct">Resposta correta</div>';
        else if (revealed && letter === selected) status = '<div class="flash-quiz-option-status wrong">Sua resposta incorreta</div>';
        return '<button type="button" class="' + classes.join(' ') + '" onclick="FlashcardsDashboard.chooseQuizAnswer(\'' + letter + '\')"' + (revealed ? ' disabled' : '') + '><strong>' + letter + '.</strong><span><span class="flash-quiz-option-text">' + opt + '</span>' + status + comment + '</span></button>';
      }).join('') + '</div>';
    }
    if (card.type === 'cespe') {
      return '<div class="flash-study-options"><div>Certo</div><div>Errado</div></div>';
    }
    return '';
  }

  function renderStudyAnswer(card) {
    if (card.type === 'flip') return '<div class="flash-study-back">' + (card.back || '') + '</div>';
    if (card.type === 'quiz') {
      var answer = normalizeQuizAnswer(card.answer);
      var selected = state.study && state.study.selectedAnswer ? normalizeQuizAnswer(state.study.selectedAnswer) : '';
      var isCorrect = selected && selected === answer;
      var message = selected
        ? (isCorrect ? 'A alternativa ' + selected + ' esta correta.' : 'A alternativa ' + selected + ' esta incorreta.')
        : 'Escolha uma alternativa para ver o comentario.';
      return '<div class="flash-study-back quiz-feedback ' + (isCorrect ? 'correct' : 'wrong') + '"><strong>' + escapeHtml(message) + '</strong><span>Gabarito: ' + escapeHtml(answer || '-') + '</span></div>';
    }
    if (card.type === 'cespe') return '<div class="flash-study-back"><strong>Gabarito:</strong> ' + escapeHtml(card.answer || '-') + '<br>' + (card.explanation || '') + '</div>';
    return '<div class="flash-study-back">Sem resposta cadastrada.</div>';
  }

  function renderSrsBar(visible, card) {
    var again = previewSrs(card, 'again');
    var hard = previewSrs(card, 'hard');
    var good = previewSrs(card, 'good');
    var easy = previewSrs(card, 'easy');
    return [
      '<div class="flash-srs' + (visible ? ' visible' : '') + '" id="flashStudySrs">',
      '  <button class="again" onclick="FlashcardsDashboard.answerStudy(\'again\')"><strong>Errei</strong><span>' + formatReviewInterval(again.interval) + '</span></button>',
      '  <button class="hard" onclick="FlashcardsDashboard.answerStudy(\'hard\')"><strong>Dificil</strong><span>' + formatReviewInterval(hard.interval) + '</span></button>',
      '  <button class="good" onclick="FlashcardsDashboard.answerStudy(\'good\')"><strong>Bom</strong><span>' + formatReviewInterval(good.interval) + '</span></button>',
      '  <button class="easy" onclick="FlashcardsDashboard.answerStudy(\'easy\')"><strong>Facil</strong><span>' + formatReviewInterval(easy.interval) + '</span></button>',
      '</div>',
    ].join('');
  }

  function revealStudyCard() {
    if (!state.study) return;
    var current = state.study.cards[state.study.index];
    if (current && current.type === 'quiz') return;
    var card = document.getElementById('flashStudyCard');
    var srs = document.getElementById('flashStudySrs');
    if (!state.study.revealed) {
      state.study.revealed = true;
      if (srs) srs.classList.add('visible');
    }
    if (card) card.classList.toggle('flipped');
    if (srs) srs.classList.add('visible');
  }

  function chooseQuizAnswer(answer) {
    var st = state.study;
    if (!st) return;
    var card = st.cards[st.index];
    if (!card || card.type !== 'quiz' || st.revealed) return;
    st.selectedAnswer = normalizeQuizAnswer(answer);
    st.revealed = true;
    var view = document.getElementById('flashMainView');
    if (view) view.innerHTML = renderStudy();
  }

  function toggleStudyHint(event) {
    if (event) event.stopPropagation();
    if (!state.study) return;
    state.study.hintVisible = !state.study.hintVisible;
    var view = document.getElementById('flashMainView');
    if (view) view.innerHTML = renderStudy();
  }

  function handleStudyCardKey(event) {
    if (!event || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    revealStudyCard();
  }

  function answerStudy(quality) {
    var st = state.study;
    if (!st) return;
    var card = st.cards[st.index];
    var cId = currentConcursoId();
    var cards = getCards(cId);
    var idx = cards.findIndex(function (item) { return item.id === card.id; });
    if (idx >= 0) {
      cards[idx].srs = reviewSrs(cards[idx], quality);
      cards[idx].updatedAt = nowIso();
      saveCards(cards);
    }
    st.results[quality] += 1;
    appendLog({
      id: uid('fclog'),
      concursoId: cId,
      deckId: card.deckId,
      cardId: card.id,
      quality: quality,
      correct: card.type === 'quiz' && st.selectedAnswer ? normalizeQuizAnswer(st.selectedAnswer) === normalizeQuizAnswer(card.answer) : quality !== 'again',
      data: today(),
      createdAt: nowIso(),
    });
    st.index += 1;
    st.revealed = false;
    st.selectedAnswer = '';
    st.hintVisible = false;
    var view = document.getElementById('flashMainView');
    if (view) view.innerHTML = renderStudy();
    updateTabBadge();
  }

  function renderStudyResults() {
    var st = state.study;
    var total = st.cards.length;
    var done = st.results.hard + st.results.good + st.results.easy;
    var pct = total ? Math.round((done / total) * 100) : 0;
    return [
      '<div class="flash-panel flash-results">',
      '  <div class="flash-empty-icon">&#127881;</div>',
      '  <h3>Sessao concluida</h3>',
      '  <p>' + total + ' card(s) estudados, ' + pct + '% marcados como acerto.</p>',
      '  <div class="flash-mini result">',
      '    <div><span>' + st.results.again + '</span><small>Errei</small></div>',
      '    <div><span>' + st.results.hard + '</span><small>Dificil</small></div>',
      '    <div><span>' + st.results.good + '</span><small>Bom</small></div>',
      '    <div><span>' + st.results.easy + '</span><small>Facil</small></div>',
      '  </div>',
      '  <div class="flash-modal-actions center">',
      '    <button class="flash-btn secondary" onclick="FlashcardsDashboard.backToDecks()">Baralhos</button>',
      st.deckId
        ? '    <button class="flash-btn primary" onclick="FlashcardsDashboard.openDeck(\'' + st.deckId + '\')">Voltar ao baralho</button>'
        : '    <button class="flash-btn primary" onclick="FlashcardsDashboard.backToDecks()">Voltar aos baralhos</button>',
      '  </div>',
      '</div>',
    ].join('');
  }

  function cancelStudy() {
    var deckId = state.study && state.study.deckId;
    state.study = null;
    if (deckId) openDeck(deckId);
    else backToDecks();
  }

  function showModal(html) {
    closeModal();
    var overlay = document.createElement('div');
    overlay.id = 'flashModalOverlay';
    overlay.className = 'flash-modal-overlay';
    overlay.innerHTML = html;
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closeModal();
    });
    document.body.appendChild(overlay);
    var first = overlay.querySelector('input, textarea, select, button');
    if (first) first.focus();
  }

  function closeModal() {
    var old = document.getElementById('flashModalOverlay');
    if (old) old.remove();
  }

  function updateTabBadge() {
    var badge = document.getElementById('flashTabBadge');
    if (!badge) return;
    var due = calcStats().due;
    badge.textContent = due > 0 ? due : '';
    badge.style.display = due > 0 ? 'inline-flex' : 'none';
  }

  function showDashTab(tab) {
    var overview = document.getElementById('dashboardOverview');
    var flash = document.getElementById('dashboardFlashcards');
    var btnOverview = document.getElementById('navDashboardOverview') || document.getElementById('dashTabOverview');
    var btnFlash = document.getElementById('navFlashcardsDashboard') || document.getElementById('dashTabFlashcards');
    if (!overview || !flash) return;
    var isFlash = tab === 'flashcards';
    overview.style.display = isFlash ? 'none' : '';
    flash.style.display = isFlash ? '' : 'none';
    if (btnOverview) btnOverview.classList.toggle('active', !isFlash);
    if (btnFlash) btnFlash.classList.toggle('active', isFlash);
    sessionStorage.setItem('ct_dashboard_tab', isFlash ? 'flashcards' : 'overview');
    if (isFlash) render();
  }

  function boot() {
    installStyles();
    syncFromTrack({ skipRender: true });
    updateTabBadge();
    var preferred = sessionStorage.getItem('ct_dashboard_tab');
    var hash = String(window.location.hash || '');
    var flashMatch = hash.match(/^#flashcards(?::(.+))?/);
    if (flashMatch) {
      sessionStorage.setItem('ct_dashboard_tab', 'flashcards');
      showDashTab('flashcards');
      if (flashMatch[1]) {
        var deckId = decodeURIComponent(flashMatch[1]);
        setTimeout(function () { openDeck(deckId); }, 0);
      }
      return;
    }
    showDashTab(preferred === 'flashcards' ? 'flashcards' : 'overview');
  }

  function installStyles() {
    if (document.getElementById('flashcards-dashboard-style')) return;
    var style = document.createElement('style');
    style.id = 'flashcards-dashboard-style';
    style.textContent = [
      '#flashTabBadge{min-width:20px;height:20px;border-radius:20px;display:inline-flex;align-items:center;justify-content:center;background:var(--red);color:#fff;font-size:11px;font-weight:900;padding:0 6px}',
      '.flash-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:22px}',
      '.flash-title-row{display:flex;align-items:center;gap:12px}',
      '.flash-logo{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:rgba(79,142,247,.12);border:1px solid rgba(79,142,247,.25);font-size:24px}',
      '.flash-title-row h2{font-size:28px;line-height:1.1;margin:0;color:var(--text)}',
      '.flash-title-row p{font-size:14px;color:var(--text3);margin:8px 0 0}',
      '.flash-actions,.flash-detail-actions,.flash-modal-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}',
      '.flash-modal-actions{justify-content:flex-end;margin-top:22px;padding-top:16px;border-top:1px solid var(--border)}',
      '.flash-modal-actions.center{justify-content:center;border-top:none}',
      '.flash-btn{appearance:none;border:1px solid var(--border2);border-radius:9px;padding:9px 14px;background:transparent;color:var(--text);font-family:var(--sans);font-size:12px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:.16s}',
      '.flash-btn:hover{transform:translateY(-1px);border-color:var(--accent)}',
      '.flash-btn.primary{background:linear-gradient(135deg,var(--accent),var(--accent2));border-color:transparent;color:#fff;box-shadow:0 12px 24px rgba(79,142,247,.22)}',
      '.flash-btn.secondary{background:var(--bg2)}',
      '.flash-btn.ghost{background:transparent;color:var(--text3)}',
      '.flash-btn.big{margin-top:20px;padding:12px 22px;font-size:14px}',
      '.flash-stat-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px;margin-bottom:22px}',
      '.flash-stat-card{background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:18px 20px;position:relative;overflow:hidden}',
      '.flash-stat-card.clickable{appearance:none;text-align:left;cursor:pointer;font-family:var(--sans);width:100%;transition:transform .16s,border-color .16s,box-shadow .16s}.flash-stat-card.clickable:hover,.flash-stat-card.clickable:focus-visible{transform:translateY(-2px);border-color:var(--accent);box-shadow:0 16px 36px rgba(79,142,247,.16);outline:none}',
      '.flash-stat-card:before{content:"";position:absolute;left:0;right:0;top:0;height:3px;background:var(--accent)}',
      '.flash-stat-card.red:before{background:var(--red)}.flash-stat-card.purple:before{background:var(--accent2)}.flash-stat-card.yellow:before{background:var(--yellow)}.flash-stat-card.green:before{background:var(--green)}',
      '.flash-stat-value{font-size:28px;font-weight:900;color:var(--text);letter-spacing:0}',
      '.flash-stat-label{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--text3);margin-top:8px}',
      '.flash-grid{display:grid;grid-template-columns:minmax(0,2.1fr) minmax(320px,.9fr);gap:18px;align-items:start}',
      '.flash-panel{background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:16px;box-shadow:0 14px 32px rgba(0,0,0,.16)}',
      '.flash-tree-panel{padding:0;overflow:hidden}.flash-tree-panel .flash-panel-title{padding:16px 18px 10px;margin:0}',
      '.flash-panel-title{font-size:13px;font-weight:900;color:var(--text);margin-bottom:12px;text-transform:uppercase;letter-spacing:.8px}',
      '.flash-tree,.flash-children{list-style:none;margin:0;padding:0}',
      '.flash-tree{padding:0 16px 16px}.flash-node{margin:0}.flash-children{display:none;margin:0 0 0 28px;padding:0 0 10px;border-left:1px solid var(--border)}.flash-children.open{display:block}',
      '.flash-row{display:flex;align-items:center;gap:10px;min-height:48px;padding:12px 12px;border-radius:0;cursor:pointer;transition:.16s;border-top:1px solid var(--border)}',
      '.flash-tree>.flash-node>.flash-row{border:1px solid var(--border);border-radius:10px;margin-top:10px;background:rgba(255,255,255,.015)}.flash-row.depth-1{margin-left:12px}.flash-row.depth-2{min-height:42px;padding:9px 12px;margin-left:12px}',
      '.flash-row{cursor:default}.flash-row-main{cursor:pointer}.flash-row:hover{background:rgba(255,255,255,.035)}.flash-row.depth-0.has-children{font-size:14px}',
      '.flash-expand{width:22px;height:22px;border:0;background:transparent;color:var(--text3);cursor:pointer;transition:.16s;font-size:15px}.flash-expand.open{transform:rotate(90deg)}',
      '.flash-spacer{width:22px;flex-shrink:0}.flash-row-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}.flash-level-label{font-size:10px;font-weight:900;letter-spacing:.8px;text-transform:uppercase;color:var(--text3)}.flash-name{font-size:13px;font-weight:900;color:var(--text);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:normal;line-height:1.35}.flash-count{font-size:12px;color:var(--text3);font-weight:800;white-space:nowrap}.flash-due-badge{font-size:11px;font-weight:900;color:var(--red);background:rgba(245,90,90,.12);border-radius:8px;padding:4px 8px;white-space:nowrap}',
      '.flash-row-actions{display:flex;gap:5px;opacity:0;transition:.16s;flex-wrap:wrap;justify-content:flex-end}.flash-row:hover .flash-row-actions{opacity:1}.flash-row-actions button,.flash-card-actions button{border:1px solid var(--border);background:transparent;color:var(--text3);border-radius:7px;padding:5px 8px;font-size:11px;font-weight:800;cursor:pointer}.flash-row-actions button:hover,.flash-card-actions button:hover{border-color:var(--accent);color:var(--accent)}',
      '.flash-empty{text-align:center;padding:46px 24px}.flash-empty.small{padding:30px 18px}.flash-empty-icon{font-size:46px;margin-bottom:12px}.flash-empty h3,.flash-results h3{font-size:20px;color:var(--text);margin:0 0 8px}.flash-empty p,.flash-results p{font-size:13px;color:var(--text3);line-height:1.6;margin:0 0 18px}',
      '.flash-mini{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px}.flash-mini.result{grid-template-columns:repeat(4,1fr);max-width:560px;margin:18px auto}.flash-mini>div{background:rgba(255,255,255,.025);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center}.flash-mini span{display:block;font-size:24px;font-weight:900;color:var(--text)}.flash-mini small{display:block;font-size:11px;color:var(--text3);font-weight:800;text-transform:uppercase;margin-top:4px}',
      '.flash-activity-title{font-size:12px;font-weight:900;color:var(--text3);text-transform:uppercase;letter-spacing:.9px;margin:10px 0}.flash-pie-card{position:relative;display:grid;grid-template-columns:136px minmax(0,1fr);gap:16px;align-items:center;min-height:168px;padding:12px;border:1px solid var(--border);border-radius:12px;background:rgba(255,255,255,.018);overflow:visible}.flash-pie-chart{width:132px;height:132px;border-radius:50%;background:conic-gradient(var(--pie));display:grid;place-items:center;box-shadow:0 18px 38px rgba(0,0,0,.24);transition:transform .18s ease,filter .18s ease}.flash-pie-card:hover .flash-pie-chart{transform:scale(1.08);filter:saturate(1.16)}.flash-pie-center{width:72px;height:72px;border-radius:50%;background:var(--bg2);border:1px solid var(--border2);display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:inset 0 0 0 4px rgba(255,255,255,.018)}.flash-pie-center span{font-size:24px;font-weight:900;color:var(--text);line-height:1}.flash-pie-center small{font-size:10px;font-weight:900;color:var(--text3);text-transform:uppercase;margin-top:4px}.flash-pie-list{display:flex;flex-direction:column;gap:6px}.flash-pie-row{display:grid;grid-template-columns:10px minmax(66px,1fr) auto;align-items:center;gap:8px;font-size:11px;color:var(--text3);font-weight:800}.flash-pie-row strong{color:var(--text2);font-size:11px}.flash-pie-dot{width:10px;height:10px;border-radius:999px;box-shadow:0 0 0 3px rgba(255,255,255,.025)}.flash-pie-popover{position:absolute;left:18px;right:18px;bottom:calc(100% + 10px);z-index:40;opacity:0;pointer-events:none;transform:translateY(8px) scale(.98);transition:opacity .16s ease,transform .16s ease;background:rgba(19,22,30,.98);border:1px solid var(--border2);border-radius:12px;padding:12px;box-shadow:0 18px 44px rgba(0,0,0,.42);backdrop-filter:blur(10px)}.flash-pie-card:hover .flash-pie-popover{opacity:1;transform:translateY(0) scale(1)}.flash-pie-popover-title{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.9px;color:var(--accent);margin-bottom:8px}.flash-pie-popover .flash-pie-row{grid-template-columns:10px 1fr auto;padding:4px 0}',
      '.flash-studied-card{margin-top:14px;padding:14px;border:1px solid var(--border);border-radius:12px;background:rgba(255,255,255,.018)}.flash-studied-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}.flash-studied-title{font-size:12px;font-weight:900;color:var(--text);text-transform:uppercase;letter-spacing:.8px}.flash-studied-sub{font-size:11px;color:var(--text3);font-weight:700;margin-top:4px;line-height:1.35}.flash-studied-total{text-align:right;flex-shrink:0}.flash-studied-total span{display:block;font-size:26px;font-weight:900;color:var(--text);line-height:1}.flash-studied-total small{font-size:10px;font-weight:900;color:var(--text3);text-transform:uppercase}.flash-studied-body{display:grid;grid-template-columns:106px minmax(0,1fr);gap:14px;align-items:center}.flash-studied-chart{width:104px;height:104px;border-radius:50%;background:conic-gradient(var(--studied));display:grid;place-items:center;box-shadow:0 14px 30px rgba(0,0,0,.22)}.flash-studied-chart>div{width:60px;height:60px;border-radius:50%;background:var(--bg2);border:1px solid var(--border2);display:flex;flex-direction:column;align-items:center;justify-content:center}.flash-studied-chart span{font-size:19px;font-weight:900;color:var(--green);line-height:1}.flash-studied-chart small{font-size:9px;font-weight:900;color:var(--text3);text-transform:uppercase;margin-top:4px}.flash-studied-list{display:flex;flex-direction:column;gap:8px}.flash-studied-row{display:grid;grid-template-columns:10px 1fr auto;gap:8px;align-items:center;font-size:12px;font-weight:900}.flash-studied-row span{width:10px;height:10px;border-radius:999px}.flash-studied-row.good span{background:var(--green)}.flash-studied-row.bad span{background:var(--red)}.flash-studied-row strong{color:var(--text2)}.flash-studied-row em{font-style:normal;color:var(--text3);font-size:11px}.flash-studied-rate{margin-top:2px;padding-top:8px;border-top:1px solid var(--border);font-size:11px;font-weight:800;color:var(--text3)}',
      '.flash-detail{display:flex;flex-direction:column;gap:16px}.flash-detail-head{display:flex;align-items:center;gap:14px;justify-content:space-between;flex-wrap:wrap}.flash-detail-head h3{font-size:22px;margin:0;color:var(--text)}.flash-detail-head p{font-size:12px;color:var(--text3);margin:5px 0 0}',
      '.flash-child-list{display:flex;flex-direction:column;gap:8px}.flash-child-card{text-align:left;border:1px solid var(--border);background:rgba(255,255,255,.025);border-radius:10px;padding:12px 14px;color:var(--text);font-family:var(--sans);cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:14px}.flash-child-card:hover{border-color:var(--accent);background:rgba(79,142,247,.08)}.flash-child-title{font-size:13px;font-weight:900;line-height:1.35}.flash-child-meta{color:var(--text3);font-size:12px;font-weight:800;white-space:nowrap}',
      '.flash-card-list{display:flex;flex-direction:column;gap:10px}.flash-card-row{display:flex;align-items:center;gap:14px;border:1px solid var(--border);background:rgba(255,255,255,.02);border-radius:12px;padding:12px}.flash-card-main{flex:1;min-width:0}.flash-card-main strong{display:block;color:var(--text);font-size:13px;margin:7px 0}.flash-card-main span:last-child{font-size:12px;color:var(--text3);line-height:1.5}.flash-type,.flash-status{display:inline-flex;align-items:center;border-radius:999px;padding:3px 8px;font-size:10px;font-weight:900;text-transform:uppercase;margin-right:6px}.flash-type{background:rgba(79,142,247,.12);color:var(--accent)}.flash-status{background:rgba(255,255,255,.04);color:var(--text3)}.flash-card-actions{display:flex;gap:6px;flex-shrink:0}',
      '.flash-rich-wrap{border:1px solid var(--border2);border-radius:12px;background:var(--bg3);overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,.025)}.flash-rich-toolbar{display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:9px 12px;border-bottom:1px solid var(--border);background:rgba(255,255,255,.035)}.flash-rich-toolbar button,.flash-rich-select{height:30px;border:1px solid transparent;background:rgba(255,255,255,.035);color:var(--text2);border-radius:7px;padding:0 10px;font-family:var(--sans);font-size:12px;font-weight:800;cursor:pointer}.flash-rich-toolbar button{min-width:30px}.flash-rich-select{min-width:118px;outline:none}.flash-rich-toolbar button:hover,.flash-rich-select:hover{border-color:var(--accent);color:var(--accent);background:rgba(79,142,247,.09)}.flash-rich-editor{min-height:138px;padding:16px 18px;color:var(--text);font-size:14px;line-height:1.6;outline:none}.flash-rich-editor:empty:before{content:attr(data-placeholder);color:var(--text3)}.flash-rich-editor ul,.flash-rich-editor ol,.flash-study-front ul,.flash-study-front ol,.flash-study-back ul,.flash-study-back ol{margin:10px 0;padding-left:30px;list-style-position:outside}.flash-rich-editor li,.flash-study-front li,.flash-study-back li{padding-left:4px;margin:5px 0}.flash-rich-editor blockquote,.flash-study-front blockquote,.flash-study-back blockquote{border-left:3px solid var(--accent);margin:10px 0;padding:8px 12px;background:rgba(79,142,247,.07);border-radius:8px}.flash-rich-editor pre,.flash-study-front pre,.flash-study-back pre{background:rgba(0,0,0,.18);border:1px solid var(--border);border-radius:8px;padding:10px;white-space:pre-wrap}.flash-rich-editor img,.flash-study-front img,.flash-study-back img,.flash-card-main img{max-width:100%;border-radius:10px;border:1px solid var(--border);display:block;margin:10px 0}.flash-rich-editor a,.flash-study-front a,.flash-study-back a{color:var(--accent)}.flash-alt-list{display:flex;flex-direction:column;gap:12px}.flash-alt-item{border:1px solid var(--border);border-radius:12px;padding:10px;background:rgba(255,255,255,.018)}.flash-alt-head{display:flex;align-items:center;gap:8px;margin-bottom:8px;color:var(--text3);font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.8px}.flash-alt-letter{width:24px;height:24px;border-radius:999px;background:rgba(79,142,247,.14);color:var(--accent);display:grid;place-items:center;font-size:12px}.flash-alt-item .flash-rich-editor{min-height:90px}.flash-add-alt{margin-top:10px}.flash-study-options-rich div,.flash-quiz-option{display:flex;gap:10px;align-items:flex-start}.flash-study-options-rich strong{color:var(--accent);min-width:24px}.flash-study-options-rich span{flex:1}.flash-quiz-option{width:100%;text-align:left;border:1px solid var(--border);border-radius:12px;padding:13px 14px;background:rgba(255,255,255,.025);color:var(--text2);font:700 14px var(--sans);cursor:pointer;transition:transform .18s ease,border-color .18s ease,background .18s ease,box-shadow .18s ease}.flash-quiz-option:hover{transform:translateY(-1px);border-color:var(--accent);background:rgba(79,142,247,.08)}.flash-quiz-option:disabled{cursor:default}.flash-quiz-option.correct{border-color:rgba(62,207,142,.8);background:rgba(62,207,142,.12);box-shadow:0 0 0 1px rgba(62,207,142,.16)}.flash-quiz-option.wrong{border-color:rgba(245,90,90,.85);background:rgba(245,90,90,.12);box-shadow:0 0 0 1px rgba(245,90,90,.16)}.flash-quiz-option.selected{transform:translateY(-1px)}.quiz-feedback{animation:flashFeedbackIn .32s ease both}.quiz-feedback.correct{border-color:rgba(62,207,142,.45)}.quiz-feedback.wrong{border-color:rgba(245,90,90,.45)}.quiz-feedback>strong{display:block;margin-bottom:8px}.quiz-feedback>span{display:block;color:var(--text3);font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.8px;margin-bottom:12px}.flash-answer-option{margin-top:12px;padding-top:12px;border-top:1px solid var(--border)}.flash-answer-option strong{display:block;color:var(--accent);margin-bottom:8px}@keyframes flashFeedbackIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}',
      '.flash-modal-overlay{position:fixed;inset:0;z-index:30000;background:rgba(3,6,13,.72);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:22px}.flash-modal-card{width:min(560px,96vw);max-height:90vh;overflow:auto;background:var(--bg2);border:1px solid var(--border2);border-radius:18px;padding:24px;box-shadow:0 28px 80px rgba(0,0,0,.42)}.flash-modal-card.wide{width:min(920px,96vw)}.flash-modal-title{font-size:20px;font-weight:900;color:var(--text);margin-bottom:18px}.flash-modal-card label{display:block;font-size:11px;font-weight:900;letter-spacing:.9px;text-transform:uppercase;color:var(--text3);margin:14px 0 7px}.flash-input{width:100%;background:var(--bg3);border:1px solid var(--border2);border-radius:10px;color:var(--text);font-family:var(--sans);font-size:13px;padding:11px 12px;outline:none}.flash-input:focus{border-color:var(--accent)}textarea.flash-input{resize:vertical;line-height:1.5}#flashDeckEmoji{display:none}',
      '.flash-import-format{border:1px solid var(--border);border-radius:12px;background:rgba(255,255,255,.025);padding:13px 14px;margin:10px 0}.flash-import-format strong{display:block;color:var(--text);font-size:13px;margin-bottom:5px}.flash-import-format span{display:block;color:var(--text3);font-size:12px;line-height:1.45;font-weight:800}',
      '.flash-alt-head{display:grid!important;grid-template-columns:26px minmax(0,1fr) auto auto;align-items:center;gap:10px}.flash-alt-title-input{width:100%;min-height:42px;resize:vertical;background:rgba(255,255,255,.035);border:1px solid var(--border2);border-radius:10px;color:var(--text);font:800 13px/1.45 var(--sans);padding:10px 12px;outline:none}.flash-alt-title-input:focus{border-color:var(--accent);box-shadow:0 0 0 2px rgba(79,142,247,.12)}.flash-correct-toggle{display:inline-flex!important;align-items:center;gap:7px;margin:0!important;padding:8px 10px;border:1px solid var(--border);border-radius:999px;background:rgba(255,255,255,.025);color:var(--text3)!important;font-size:11px!important;font-weight:900!important;letter-spacing:.3px!important;text-transform:uppercase!important;white-space:nowrap}.flash-correct-toggle input{accent-color:var(--green)}.flash-correct-toggle:has(input:checked){border-color:rgba(62,207,142,.6);background:rgba(62,207,142,.11);color:var(--green)!important}.flash-symbol-mini{border:1px solid var(--border);background:rgba(79,142,247,.08);color:var(--accent);border-radius:8px;padding:8px 10px;font:900 12px var(--sans);cursor:pointer}.flash-symbol-bank{display:none;grid-template-columns:repeat(auto-fill,minmax(34px,1fr));gap:6px;padding:10px;border-bottom:1px solid var(--border);background:rgba(255,255,255,.018)}.flash-symbol-bank.open{display:grid}.flash-symbol-bank button{height:32px;border:1px solid var(--border);border-radius:8px;background:rgba(255,255,255,.035);color:var(--text);font:900 15px var(--sans);cursor:pointer}.flash-symbol-bank button:hover{border-color:var(--accent);color:var(--accent);background:rgba(79,142,247,.09)}.flash-alt-item .flash-rich-editor{min-height:82px}.flash-alt-item .flash-rich-wrap{margin-top:10px}',
      '.flash-modal-card.aggregate{width:min(540px,96vw)}.flash-modal-sub{color:var(--text3);font-size:13px;line-height:1.55;margin:-8px 0 16px}.flash-radio-row{display:flex!important;align-items:center;gap:10px;text-transform:none!important;letter-spacing:0!important;font-size:13px!important;color:var(--text2)!important;background:rgba(255,255,255,.025);border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin:10px 0!important}.flash-radio-row input{accent-color:var(--accent)}.flash-aggregate-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}',
      '.flash-study{max-width:920px;margin:0 auto}.flash-study-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;color:var(--text3);font-size:13px;font-weight:800}.flash-progress{height:7px;background:var(--bg2);border-radius:999px;overflow:hidden;margin-bottom:18px}.flash-progress div{height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:inherit}.flash-study-card{background:var(--bg2);border:1px solid var(--border);border-radius:18px;padding:28px;min-height:360px;text-align:center;box-shadow:0 18px 44px rgba(0,0,0,.2)}.flash-study-kicker{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1.2px;color:var(--accent);margin-bottom:18px}.flash-study-front{font-size:20px;line-height:1.58;color:var(--text);font-weight:800;margin-bottom:20px;text-align:left}.flash-study-back{background:rgba(255,255,255,.035);border:1px solid var(--border);border-radius:14px;padding:18px;text-align:left;color:var(--text2);font-size:15px;line-height:1.65;margin:18px 0}.flash-study-options{display:grid;gap:10px;margin:18px 0;text-align:left}.flash-study-options div{background:rgba(255,255,255,.025);border:1px solid var(--border);border-radius:12px;padding:12px;color:var(--text2)}.flash-srs{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:20px}.flash-srs button{border:1px solid transparent;border-radius:12px;padding:13px 10px;cursor:pointer;font-family:var(--sans);display:flex;flex-direction:column;gap:3px}.flash-srs strong{font-size:13px}.flash-srs span{font-size:11px;opacity:.75}.flash-srs .again{background:rgba(245,90,90,.12);color:var(--red)}.flash-srs .hard{background:rgba(245,135,74,.12);color:var(--orange)}.flash-srs .good{background:rgba(62,207,142,.12);color:var(--green)}.flash-srs .easy{background:rgba(79,142,247,.12);color:var(--accent)}.flash-results{text-align:center}',
      '.flash-flip-shell{max-width:920px;margin:20px auto 0;perspective:1600px}.flash-flip-card{display:grid;position:relative;min-height:0;cursor:pointer;transform-style:preserve-3d;transition:transform .62s cubic-bezier(.2,.72,.2,1)}.flash-flip-card.flipped{transform:rotateY(180deg)}.flash-flip-card.quiz-mode,.flash-flip-card.quiz-mode.flipped{display:block;transform:none;cursor:default}.flash-flip-face{grid-area:1/1;position:relative;background:var(--bg2);border:1px solid var(--border);border-radius:18px;padding:30px;box-shadow:0 18px 44px rgba(0,0,0,.2);display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;overflow:visible;text-align:left;backface-visibility:hidden;-webkit-backface-visibility:hidden}.flash-flip-face.back{transform:rotateY(180deg);border-color:rgba(62,207,142,.35);background:linear-gradient(135deg,var(--bg2),rgba(62,207,142,.06))}.flash-flip-card.quiz-mode .flash-flip-face{transform:none}.flash-flip-card.quiz-mode .flash-flip-face.back{display:none;margin-top:16px}.flash-flip-card.quiz-mode.answered .flash-flip-face.back{display:flex}.flash-flip-hint{margin-top:20px;color:var(--text3);font-size:12px;font-weight:800;text-align:center}.flash-flip-face .flash-study-front{width:100%;max-width:none}.flash-flip-face .flash-study-back{width:100%;max-width:none;max-height:none}.flash-srs{max-width:920px;margin:18px auto 0;opacity:0;pointer-events:none;transform:translateY(8px);transition:opacity .2s,transform .2s}.flash-srs.visible{opacity:1;pointer-events:auto;transform:none}',
      '.flash-hint-spoiler{margin:0 0 18px}.flash-hint-spoiler button{border:1px solid rgba(79,142,247,.32);background:rgba(79,142,247,.08);color:var(--accent);border-radius:999px;padding:8px 12px;font:900 12px var(--sans);cursor:pointer;transition:transform .16s,border-color .16s,background .16s}.flash-hint-spoiler button:hover{transform:translateY(-1px);border-color:var(--accent);background:rgba(79,142,247,.14)}.flash-hint-box{margin-top:10px;border:1px dashed rgba(79,142,247,.42);border-radius:12px;padding:13px 14px;background:rgba(79,142,247,.07);color:var(--text2);font-size:14px;line-height:1.55;font-weight:800;animation:flashFeedbackIn .24s ease both}.flash-study-options-rich{gap:12px}.flash-study-options-rich .flash-quiz-option{display:grid;grid-template-columns:30px minmax(0,1fr);gap:12px;align-items:flex-start;padding:16px 18px;border-radius:10px;font-size:15px;line-height:1.45;overflow:hidden}.flash-study-options-rich .flash-quiz-option>strong{min-width:0;color:var(--accent);font-size:15px;line-height:1.45}.flash-quiz-option-text{display:block;color:var(--text2);font-weight:800}.flash-quiz-option-status{margin-top:13px;font-size:13px;font-weight:900}.flash-quiz-option-status.correct{color:var(--green)}.flash-quiz-option-status.wrong{color:var(--red)}.flash-quiz-option-comment{margin-top:10px;color:var(--text2);font-size:14px;line-height:1.65;font-weight:700;opacity:.92}.flash-quiz-option.correct{border-color:var(--green);background:rgba(62,207,142,.09);box-shadow:0 0 0 1px rgba(62,207,142,.42),0 16px 38px rgba(62,207,142,.08);animation:flashFeedbackIn .28s ease both}.flash-quiz-option.wrong{border-color:var(--red);background:rgba(245,90,90,.08);box-shadow:0 0 0 1px rgba(245,90,90,.42),0 16px 38px rgba(245,90,90,.08);animation:flashFeedbackIn .28s ease both}.flash-quiz-option.muted{opacity:.68}.flash-quiz-option:disabled{opacity:1}.flash-flip-card.quiz-mode.answered .flash-flip-face.back{border-color:rgba(255,255,255,.08);background:transparent;box-shadow:none;padding:0}.flash-flip-card.quiz-mode.answered .flash-flip-face.back .flash-study-kicker{display:none}.flash-flip-card.quiz-mode.answered .flash-study-back.quiz-feedback{margin:14px 0 0;border-radius:12px;background:rgba(255,255,255,.025);padding:14px 16px}.flash-study-options-rich .flash-quiz-option:hover:disabled{transform:none}',
      '@media(max-width:1100px){.flash-stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.flash-grid{grid-template-columns:1fr}.flash-head{flex-direction:column}.flash-actions{width:100%}.flash-actions .flash-btn{flex:1}.flash-srs{grid-template-columns:repeat(2,1fr)}}',
      '@media(max-width:700px){.flash-stat-grid{grid-template-columns:1fr}.flash-card-row,.flash-detail-head{align-items:stretch;flex-direction:column}.flash-card-actions,.flash-detail-actions{width:100%}.flash-card-actions button,.flash-detail-actions .flash-btn{flex:1}.flash-row{align-items:flex-start}.flash-row-actions{width:100%;opacity:1;justify-content:flex-start}.flash-count,.flash-due-badge{display:none}.flash-child-card{align-items:flex-start;flex-direction:column}.flash-study-front{font-size:18px}}',
    ].join('\n');
    document.head.appendChild(style);
  }

  window.showDashTab = showDashTab;
  window.FlashcardsDashboard = {
    render: render,
    syncCurrent: function () {
      var result = syncFromTrack();
      toast('Sincronizacao concluida: ' + result.created + ' criado(s), ' + result.updated + ' atualizado(s), ' + (result.copied || 0) + ' card(s) reaproveitado(s).', 'OK');
    },
    openDeck: openDeck,
    syncDeckToTopic: syncDeckToTopic,
    backToDecks: backToDecks,
    toggleChildren: toggleChildren,
    openDeckModal: openDeckModal,
    saveDeckModal: saveDeckModal,
    openCardModal: openCardModal,
    toggleCardFields: toggleCardFields,
    saveCardModal: saveCardModal,
    formatRich: formatRich,
    formatRichBlock: formatRichBlock,
    toggleSymbolBank: toggleSymbolBank,
    insertSymbol: insertSymbol,
    insertRichLink: insertRichLink,
    pickRichImage: pickRichImage,
    addQuizAlternative: addQuizAlternative,
    openImportModal: openImportModal,
    importFile: importFile,
    exportJSON: exportJSON,
    exportCSV: exportCSV,
    deleteCard: deleteCard,
    deleteDeck: deleteDeck,
    startStudyFromStats: startStudyFromStats,
    confirmAggregateStudy: confirmAggregateStudy,
    startStudy: startStudy,
    revealStudyCard: revealStudyCard,
    toggleStudyHint: toggleStudyHint,
    handleStudyCardKey: handleStudyCardKey,
      answerStudy: answerStudy,
      chooseQuizAnswer: chooseQuizAnswer,
    cancelStudy: cancelStudy,
    closeModal: closeModal,
    updateTabBadge: updateTabBadge,
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

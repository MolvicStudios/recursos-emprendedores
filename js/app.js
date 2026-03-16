/* ==============================================
   Recursos para Emprendedores — Lógica principal
   Carga dinámica, búsqueda, filtros, scroll spy
   ============================================== */

(function () {
  'use strict';

  // ---- Referencias al DOM ----
  const mainContent = document.getElementById('main-content');
  const categoryNav = document.getElementById('category-nav-inner');
  const searchInput = document.getElementById('search-input');
  const statsCount = document.getElementById('stats-count');
  const statsCats = document.getElementById('stats-cats');
  const scrollTopBtn = document.getElementById('scroll-top');
  const themeToggle = document.getElementById('theme-toggle');
  const footerUpdate = document.getElementById('footer-update');
  const yearEl = document.getElementById('year');
  const noResults = document.getElementById('no-results');

  // ---- Estado ----
  let allData = null; // Datos del JSON
  let activeFilter = 'todos'; // Filtro de tipo de acceso activo
  let searchTerm = ''; // Término de búsqueda actual
  let debounceTimer = null;
  let categoryObserver = null;

  // ---- Inicialización ---- 
  init();

  function init() {
    // Año dinámico en footer
    if (yearEl) {
      yearEl.textContent = new Date().getFullYear();
    }

    // Tema: revisar preferencia guardada o del sistema
    initTheme();

    // Cargar datos
    loadData();

    // Eventos
    if (searchInput) {
      searchInput.addEventListener('input', onSearchInput);
    }
    if (scrollTopBtn) {
      scrollTopBtn.addEventListener('click', scrollToTop);
    }
    if (themeToggle) {
      themeToggle.addEventListener('click', toggleTheme);
    }

    // Scroll to top - mostrar/ocultar
    window.addEventListener('scroll', onScroll, { passive: true });

    // Eventos de filtro
    document.querySelectorAll('.filter-btn').forEach(function (btn) {
      btn.addEventListener('click', onFilterClick);
    });
  }

  // ---- Carga de datos ----
  function loadData() {
    fetch('emprendedores.json')
      .then(function (res) {
        if (!res.ok) throw new Error('Error al cargar los datos');
        return res.json();
      })
      .then(function (data) {
        allData = data;
        renderAll();
      })
      .catch(function (err) {
        showError(err.message);
      });
  }

  // ---- Renderizado completo ----
  function renderAll() {
    if (!allData || !allData.categorias) return;

    // Actualizar estadísticas
    var totalRecursos = 0;
    allData.categorias.forEach(function (cat) {
      totalRecursos += cat.recursos ? cat.recursos.length : 0;
    });
    if (statsCount) statsCount.textContent = totalRecursos;
    if (statsCats) statsCats.textContent = allData.categorias.length;

    // Fecha de actualización
    if (footerUpdate && allData.meta && allData.meta.ultima_actualizacion) {
      footerUpdate.textContent = 'Última actualización: ' + allData.meta.ultima_actualizacion;
    }

    // Renderizar navegación de categorías
    renderNav();

    // Renderizar secciones
    renderSections();

    // Configurar Intersection Observer para animaciones y scroll spy
    setupObservers();
  }

  // ---- Navegación de categorías ----
  function renderNav() {
    if (!categoryNav) return;
    // Limpiar
    while (categoryNav.firstChild) {
      categoryNav.removeChild(categoryNav.firstChild);
    }

    allData.categorias.forEach(function (cat) {
      var btn = document.createElement('button');
      btn.className = 'nav-item';
      btn.setAttribute('type', 'button');
      btn.setAttribute('aria-label', 'Ir a ' + cat.nombre);
      btn.dataset.target = cat.id;

      var emojiSpan = document.createElement('span');
      emojiSpan.className = 'nav-item-emoji';
      emojiSpan.setAttribute('aria-hidden', 'true');
      emojiSpan.textContent = cat.emoji;

      var nameSpan = document.createElement('span');
      nameSpan.textContent = cat.nombre;

      btn.appendChild(emojiSpan);
      btn.appendChild(nameSpan);

      btn.addEventListener('click', function () {
        var target = document.getElementById('cat-' + cat.id);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });

      categoryNav.appendChild(btn);
    });
  }

  // ---- Renderizar secciones de categorías ----
  function renderSections() {
    if (!mainContent) return;

    // Limpiar contenido dinámico
    var dynamicEls = mainContent.querySelectorAll('.category-section');
    dynamicEls.forEach(function (el) { el.remove(); });

    var fragment = document.createDocumentFragment();
    var visibleCount = 0;

    allData.categorias.forEach(function (cat, index) {
      var filteredResources = filterResources(cat.recursos || []);

      // No mostrar categoría si no tiene recursos visibles
      if (filteredResources.length === 0) return;

      visibleCount += filteredResources.length;

      var section = document.createElement('section');
      section.className = 'category-section';
      section.id = 'cat-' + cat.id;
      section.setAttribute('aria-labelledby', 'heading-' + cat.id);

      // Cabecera de categoría
      var header = document.createElement('div');
      header.className = 'category-header';

      var emoji = document.createElement('span');
      emoji.className = 'category-emoji';
      emoji.setAttribute('aria-hidden', 'true');
      emoji.textContent = cat.emoji;

      var title = document.createElement('h2');
      title.className = 'category-title';
      title.id = 'heading-' + cat.id;
      title.textContent = cat.nombre;

      var count = document.createElement('span');
      count.className = 'category-count';
      count.textContent = filteredResources.length + ' recursos';

      header.appendChild(emoji);
      header.appendChild(title);
      header.appendChild(count);
      section.appendChild(header);

      // Grid de recursos
      var grid = document.createElement('div');
      grid.className = 'resources-grid';

      filteredResources.forEach(function (recurso) {
        grid.appendChild(createCard(recurso));
      });

      section.appendChild(grid);
      fragment.appendChild(section);
    });

    // Insertar antes de no-results
    var noResultsEl = mainContent.querySelector('.no-results');
    if (noResultsEl) {
      mainContent.insertBefore(fragment, noResultsEl);
    } else {
      mainContent.appendChild(fragment);
    }

    // Mostrar/ocultar no-results
    if (noResults) {
      if (visibleCount === 0 && (searchTerm || activeFilter !== 'todos')) {
        noResults.classList.add('visible');
      } else {
        noResults.classList.remove('visible');
      }
    }
  }

  // ---- Filtrar recursos ----
  function filterResources(recursos) {
    return recursos.filter(function (r) {
      // Filtro por tipo de acceso
      if (activeFilter !== 'todos') {
        var tipo = r.tipo_acceso ? r.tipo_acceso.toLowerCase().replace('-', '') : '';
        var filtro = activeFilter.replace('-', '');
        if (tipo !== filtro) return false;
      }

      // Filtro por búsqueda
      if (searchTerm) {
        var term = searchTerm.toLowerCase();
        var nombre = (r.nombre || '').toLowerCase();
        var desc = (r.descripcion || '').toLowerCase();
        var notas = (r.notas || '').toLowerCase();
        if (nombre.indexOf(term) === -1 && desc.indexOf(term) === -1 && notas.indexOf(term) === -1) {
          return false;
        }
      }

      return true;
    });
  }

  // ---- Crear tarjeta de recurso ----
  function createCard(recurso) {
    var card = document.createElement('article');
    card.className = 'resource-card';

    // Cabecera: nombre + destacado
    var cardHeader = document.createElement('div');
    cardHeader.className = 'card-header';

    var nameEl = document.createElement('h3');
    nameEl.className = 'resource-name';
    var link = document.createElement('a');
    link.href = recurso.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = recurso.nombre;
    nameEl.appendChild(link);
    cardHeader.appendChild(nameEl);

    if (recurso.destacado) {
      var star = document.createElement('span');
      star.className = 'featured-star';
      star.textContent = '⭐';
      star.setAttribute('aria-label', 'Recurso destacado');
      star.setAttribute('title', 'Destacado');
      cardHeader.appendChild(star);
    }

    card.appendChild(cardHeader);

    // Descripción (con resaltado de búsqueda)
    var descEl = document.createElement('p');
    descEl.className = 'resource-desc';
    if (searchTerm && recurso.descripcion) {
      descEl.appendChild(highlightText(recurso.descripcion, searchTerm));
    } else {
      descEl.textContent = recurso.descripcion || '';
    }
    card.appendChild(descEl);

    // Badges
    var badges = document.createElement('div');
    badges.className = 'card-badges';

    // Badge tipo acceso
    var tipoBadge = document.createElement('span');
    var tipoClass = 'badge badge--' + (recurso.tipo_acceso || 'gratis').toLowerCase().replace(' ', '-');
    tipoBadge.className = tipoClass;
    var tipoLabels = {
      'gratis': 'Gratis',
      'freemium': 'Freemium',
      'open-source': 'Open Source'
    };
    tipoBadge.textContent = tipoLabels[recurso.tipo_acceso] || recurso.tipo_acceso || 'Gratis';
    badges.appendChild(tipoBadge);

    // Badge idioma
    var idiomaBadge = document.createElement('span');
    var idiomaLower = (recurso.idioma || 'multi').toLowerCase();
    idiomaBadge.className = 'badge badge--' + (idiomaLower === 'es' ? 'es' : idiomaLower === 'en' ? 'en' : 'multi');
    idiomaBadge.textContent = recurso.idioma || 'Multi';
    badges.appendChild(idiomaBadge);

    card.appendChild(badges);

    // Notas
    if (recurso.notas) {
      var notesEl = document.createElement('p');
      notesEl.className = 'resource-notes';
      notesEl.textContent = recurso.notas;
      card.appendChild(notesEl);
    }

    return card;
  }

  // ---- Resaltar texto de búsqueda ----
  function highlightText(text, term) {
    var fragment = document.createDocumentFragment();
    var lowerText = text.toLowerCase();
    var lowerTerm = term.toLowerCase();
    var lastIndex = 0;
    var index = lowerText.indexOf(lowerTerm);

    while (index !== -1) {
      // Texto antes de la coincidencia
      if (index > lastIndex) {
        fragment.appendChild(document.createTextNode(text.substring(lastIndex, index)));
      }
      // Texto resaltado
      var mark = document.createElement('mark');
      mark.className = 'highlight';
      mark.textContent = text.substring(index, index + term.length);
      fragment.appendChild(mark);
      lastIndex = index + term.length;
      index = lowerText.indexOf(lowerTerm, lastIndex);
    }

    // Texto restante
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
    }

    return fragment;
  }

  // ---- Observers (animación y scroll spy) ----
  function setupObservers() {
    // Observer para animación de tarjetas
    if ('IntersectionObserver' in window) {
      var cardObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            cardObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.05, rootMargin: '0px 0px -30px 0px' });

      document.querySelectorAll('.resource-card').forEach(function (card) {
        cardObserver.observe(card);
      });

      // Observer para scroll spy (navegación activa)
      if (categoryObserver) categoryObserver.disconnect();
      categoryObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var catId = entry.target.id.replace('cat-', '');
            updateActiveNav(catId);
          }
        });
      }, { threshold: 0.1, rootMargin: '-80px 0px -60% 0px' });

      document.querySelectorAll('.category-section').forEach(function (section) {
        categoryObserver.observe(section);
      });
    } else {
      // Fallback: mostrar todas las tarjetas directamente
      document.querySelectorAll('.resource-card').forEach(function (card) {
        card.classList.add('visible');
      });
    }
  }

  // ---- Actualizar navegación activa ----
  function updateActiveNav(catId) {
    if (!categoryNav) return;
    categoryNav.querySelectorAll('.nav-item').forEach(function (item) {
      if (item.dataset.target === catId) {
        item.classList.add('active');
        // Scroll la nav para que el item activo sea visible
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } else {
        item.classList.remove('active');
      }
    });
  }

  // ---- Búsqueda en tiempo real con debounce ----
  function onSearchInput() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      searchTerm = searchInput.value.trim();
      renderSections();
      setupObservers();
    }, 300);
  }

  // ---- Filtro por tipo de acceso ----
  function onFilterClick(e) {
    var btn = e.currentTarget;
    activeFilter = btn.dataset.filter || 'todos';

    // Actualizar estado activo de botones
    document.querySelectorAll('.filter-btn').forEach(function (b) {
      b.classList.remove('active');
    });
    btn.classList.add('active');

    // Re-renderizar
    renderSections();
    setupObservers();
  }

  // ---- Tema claro/oscuro ----
  function initTheme() {
    var saved = localStorage.getItem('theme');
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
      updateThemeIcon(saved);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      document.documentElement.setAttribute('data-theme', 'light');
      updateThemeIcon('light');
    } else {
      updateThemeIcon('dark');
    }
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme');
    var next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeIcon(next);
  }

  function updateThemeIcon(theme) {
    if (!themeToggle) return;
    themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
    themeToggle.setAttribute('aria-label', theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
  }

  // ---- Scroll ----
  function onScroll() {
    if (scrollTopBtn) {
      if (window.scrollY > 400) {
        scrollTopBtn.classList.add('visible');
      } else {
        scrollTopBtn.classList.remove('visible');
      }
    }
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---- Error ----
  function showError(message) {
    if (!mainContent) return;
    var errorDiv = document.createElement('div');
    errorDiv.className = 'error-state';
    errorDiv.setAttribute('role', 'alert');

    var icon = document.createElement('span');
    icon.className = 'error-state-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '⚠️';

    var title = document.createElement('h2');
    title.textContent = 'Error al cargar los recursos';

    var desc = document.createElement('p');
    desc.textContent = message || 'No se ha podido cargar el fichero de datos. Inténtalo de nuevo más tarde.';

    errorDiv.appendChild(icon);
    errorDiv.appendChild(title);
    errorDiv.appendChild(desc);

    // Limpiar y mostrar error
    while (mainContent.firstChild) {
      mainContent.removeChild(mainContent.firstChild);
    }
    mainContent.appendChild(errorDiv);
  }

})();

/* ==============================================
   Recursos para Emprendedores — Banner de Cookies
   GDPR/LOPD: Bloquea scripts de terceros hasta
   obtener consentimiento explícito del usuario
   ============================================== */

(function () {
  'use strict';

  var CONSENT_KEY = 'cookie_consent';
  var banner = document.getElementById('cookie-banner');
  var acceptBtn = document.getElementById('cookie-accept');
  var essentialBtn = document.getElementById('cookie-essential');

  init();

  function init() {
    var consent = getConsent();

    if (consent === null) {
      // Primera visita: mostrar banner
      showBanner();
    }
    // Si ya dio su consentimiento, no hacer nada más
  }

  // ---- Mostrar banner ----
  function showBanner() {
    if (!banner) return;

    // Pequeño delay para la animación
    setTimeout(function () {
      banner.classList.add('visible');
      // Enfocar el banner para accesibilidad
      banner.focus();
    }, 500);

    if (acceptBtn) {
      acceptBtn.addEventListener('click', function () {
        setConsent('all');
        hideBanner();
      });
    }

    if (essentialBtn) {
      essentialBtn.addEventListener('click', function () {
        setConsent('essential');
        hideBanner();
      });
    }
  }

  // ---- Ocultar banner ----
  function hideBanner() {
    if (!banner) return;
    banner.classList.remove('visible');
    // Devolver el foco al contenido principal
    var main = document.querySelector('main') || document.body;
    main.focus();
  }

  // ---- Guardar preferencia ----
  function setConsent(value) {
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch (e) {
      // localStorage no disponible (modo privado, etc.)
    }
  }

  // ---- Leer preferencia ----
  function getConsent() {
    try {
      var val = localStorage.getItem(CONSENT_KEY);
      if (val === 'all' || val === 'essential') return val;
      return null;
    } catch (e) {
      return null;
    }
  }

})();

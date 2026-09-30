/**
 * Aplicación Principal - Visor de Suelos de los Valles Calchaquíes
 * Navegación intuitiva con conmutación directa Fase <-> Serie y visualización integral.
 */

let appData = null;
let currentActiveFase = null;
let currentActiveSerie = null;
let currentSidebarMode = 'fase'; // 'fase' | 'serie'

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Iniciar mapa
  window.mapModule.initMap();

  // 2. Cargar base alfanumérica consolidada
  try {
    const res = await fetch('data/suelos_calcha_info.json');
    appData = await res.json();
    console.log("Datos de suelos cargados:", appData);
    populateSeriesCatalog();
    populateGlossary();
  } catch (err) {
    console.error("Error al cargar data/suelos_calcha_info.json:", err);
  }

  // 3. Cargar capa GeoJSON
  await window.mapModule.loadSoilLayer('data/suelos_vcalcha.geojson');

  // 4. Configurar eventos de interfaz
  setupUIEvents();
});

function setupUIEvents() {
  // Selectores de Temática y Fondo
  const themeSelect = document.getElementById('thematic-select');
  if (themeSelect) {
    themeSelect.addEventListener('change', (e) => window.mapModule.setThematic(e.target.value));
  }

  const basemapSelect = document.getElementById('basemap-select');
  if (basemapSelect) {
    basemapSelect.addEventListener('change', (e) => window.mapModule.setBaseMap(e.target.value));
  }

  // Buscador de texto
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  if (searchInput && searchBtn) {
    const doSearch = () => {
      const q = searchInput.value.trim();
      if (q) {
        const found = window.mapModule.findAndHighlight(q);
        if (!found) {
          alert(`No se encontró ninguna unidad o serie que coincida con "${q}". Pruebe con "Angastaco", "Aa3", "Sc2A", "Tolombón", etc.`);
        }
      }
    };
    searchBtn.addEventListener('click', doSearch);
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSearch();
    });
  }

  // Botón GPS
  const gpsBtn = document.getElementById('gps-btn');
  if (gpsBtn) {
    gpsBtn.addEventListener('click', () => window.mapModule.locateUser());
  }

  // Control Solo Bordes / Transparente
  const toggleBordersBtn = document.getElementById('toggle-borders-btn');
  const checkBordersLegend = document.getElementById('check-borders-legend');
  let isOnlyBorders = false;

  const setBordersState = (state) => {
    isOnlyBorders = state;
    window.mapModule.toggleOnlyBorders(isOnlyBorders);
    if (toggleBordersBtn) {
      if (isOnlyBorders) {
        toggleBordersBtn.classList.add('bg-amber-700', 'text-white', 'border-amber-800');
        toggleBordersBtn.classList.remove('bg-slate-100', 'text-slate-700', 'border-slate-300');
      } else {
        toggleBordersBtn.classList.remove('bg-amber-700', 'text-white', 'border-amber-800');
        toggleBordersBtn.classList.add('bg-slate-100', 'text-slate-700', 'border-slate-300');
      }
    }
    if (checkBordersLegend) {
      checkBordersLegend.checked = isOnlyBorders;
    }
  };

  if (toggleBordersBtn) {
    toggleBordersBtn.addEventListener('click', () => setBordersState(!isOnlyBorders));
  }
  if (checkBordersLegend) {
    checkBordersLegend.addEventListener('change', (e) => setBordersState(e.target.checked));
  }

  // Slider de Opacidad
  const opacitySlider = document.getElementById('opacity-slider');
  if (opacitySlider) {
    opacitySlider.addEventListener('input', (e) => window.mapModule.setLayerOpacity(e.target.value));
  }

  // Sidebar: Cerrar
  const closeSidebarBtn = document.getElementById('close-sidebar-btn');
  const sidebar = document.getElementById('sidebar');
  if (closeSidebarBtn && sidebar) {
    closeSidebarBtn.addEventListener('click', () => {
      sidebar.classList.remove('open');
    });
  }

  // Sidebar: Maximizar / Restaurar
  const toggleMaxBtn = document.getElementById('toggle-maximize-sidebar-btn');
  const maxText = document.getElementById('sb-max-text');
  if (toggleMaxBtn && sidebar) {
    toggleMaxBtn.addEventListener('click', () => {
      const isMax = sidebar.classList.toggle('maximized');
      const icon = toggleMaxBtn.querySelector('i');
      if (icon) {
        if (isMax) {
          icon.className = 'fa-solid fa-compress text-amber-400';
          if (maxText) maxText.textContent = 'Reducir';
          toggleMaxBtn.title = 'Restaurar tamaño original';
        } else {
          icon.className = 'fa-solid fa-expand text-amber-400';
          if (maxText) maxText.textContent = 'Ampliar';
          toggleMaxBtn.title = 'Maximizar o restaurar tamaño de la ficha';
        }
      }
    });

    const sbHeader = sidebar.querySelector('.p-4.bg-slate-900');
    if (sbHeader) {
      sbHeader.style.cursor = 'default';
      sbHeader.addEventListener('dblclick', (e) => {
        if (e.target.closest('button')) return;
        toggleMaxBtn.click();
      });
    }
  }

  // Conmutadores de Vista: Fase vs Serie
  const btnViewFase = document.getElementById('btn-view-fase');
  const btnViewSerie = document.getElementById('btn-view-serie');
  const quickGoSerieBtn = document.getElementById('quick-go-serie-btn');
  const switchToSerieBtn = document.getElementById('switch-to-serie-btn');
  const backToFaseBtn = document.getElementById('back-to-fase-btn');
  const cardMetricAptitud = document.getElementById('card-metric-aptitud');
  const cardMetricSerie = document.getElementById('card-metric-serie');

  if (btnViewFase) btnViewFase.addEventListener('click', () => setSidebarView('fase'));
  if (btnViewSerie) btnViewSerie.addEventListener('click', () => setSidebarView('serie'));
  if (quickGoSerieBtn) quickGoSerieBtn.addEventListener('click', () => setSidebarView('serie'));
  if (switchToSerieBtn) switchToSerieBtn.addEventListener('click', () => setSidebarView('serie'));
  if (backToFaseBtn) backToFaseBtn.addEventListener('click', () => setSidebarView('fase'));
  if (cardMetricAptitud) cardMetricAptitud.addEventListener('click', () => setSidebarView('fase'));
  if (cardMetricSerie) cardMetricSerie.addEventListener('click', () => setSidebarView('serie'));

  // Descarga de PDF desde el sidebar
  const downloadPdfBtn = document.getElementById('download-pdf-btn');
  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', () => {
      if (currentSidebarMode === 'fase' && currentActiveFase) {
        const aptData = appData?.aptitudes?.[currentActiveFase.aptitud_riego];
        window.exportSoilCalchaPDF(currentActiveSerie, currentActiveFase, aptData);
      } else if (currentActiveSerie) {
        const firstFaseCode = currentActiveSerie.fases_asociadas?.[0];
        const faseData = firstFaseCode ? appData.fases[firstFaseCode] : { serie: currentActiveSerie.nombre, nomencla: currentActiveSerie.nombre };
        const aptData = appData?.aptitudes?.[faseData?.aptitud_riego];
        window.exportSoilCalchaPDF(currentActiveSerie, faseData, aptData);
      }
    });
  }

  // Modales
  setupModal('open-catalog-btn', 'catalog-modal', 'close-catalog-btn');
  setupModal('open-glossary-btn', 'glossary-modal', 'close-glossary-btn');
  setupModal('open-about-btn', 'about-modal', 'close-about-btn');

  const understandAboutBtn = document.getElementById('understand-about-btn');
  if (understandAboutBtn) {
    understandAboutBtn.addEventListener('click', () => {
      document.getElementById('about-modal')?.classList.remove('active');
    });
  }

  // Evento al hacer clic en un polígono del mapa
  window.addEventListener('soilSelected', (e) => {
    const feat = e.detail.feature;
    const p = feat.properties || {};
    const nomencla = (p.nomencla || '').trim();

    if (nomencla && appData?.fases?.[nomencla]) {
      selectFase(nomencla, false);
    } else {
      showGenericFeatureDetails(feat);
    }
  });
}

function setupModal(openBtnId, modalId, closeBtnId) {
  const openBtn = document.getElementById(openBtnId);
  const modal = document.getElementById(modalId);
  const closeBtn = document.getElementById(closeBtnId);

  if (!modal) return;

  if (openBtn) {
    openBtn.addEventListener('click', () => modal.classList.add('active'));
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  }

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      modal.classList.remove('active');
    }
  });
}

/**
 * Cambiar entre la vista de Fase Cartográfica y la vista General de la Serie
 */
function setSidebarView(mode) {
  currentSidebarMode = mode;
  const viewFase = document.getElementById('view-fase-content');
  const viewSerie = document.getElementById('view-serie-content');
  const btnFase = document.getElementById('btn-view-fase');
  const btnSerie = document.getElementById('btn-view-serie');
  const pdfBtnText = document.getElementById('btn-download-pdf-text');

  if (mode === 'fase') {
    if (viewFase) viewFase.classList.remove('hidden');
    if (viewSerie) viewSerie.classList.add('hidden');

    if (btnFase) {
      btnFase.className = "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 bg-amber-700 text-white shadow-sm";
    }
    if (btnSerie) {
      btnSerie.className = "flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 bg-white text-slate-700 hover:bg-slate-200 border border-slate-300";
    }

    if (pdfBtnText && currentActiveFase) {
      pdfBtnText.textContent = `Descargar Ficha PDF (Fase ${currentActiveFase.nomencla})`;
    }
  } else {
    if (viewFase) viewFase.classList.add('hidden');
    if (viewSerie) viewSerie.classList.remove('hidden');

    if (btnSerie) {
      btnSerie.className = "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 bg-amber-700 text-white shadow-sm";
    }
    if (btnFase) {
      btnFase.className = "flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 bg-white text-slate-700 hover:bg-slate-200 border border-slate-300";
    }

    if (pdfBtnText && currentActiveSerie) {
      pdfBtnText.textContent = `Descargar Ficha PDF (Serie ${currentActiveSerie.nombre})`;
    }
  }
}

/**
 * Seleccionar y cargar una Fase Cartográfica específica en la Ficha
 * Muestra directamente: Fases hermanas, Descripción de Fase, Aptitud de Riego y Perfil Modal.
 */
function selectFase(nomencla, zoomToMap = true) {
  if (!appData?.fases?.[nomencla]) return;

  const fData = appData.fases[nomencla];
  currentActiveFase = fData;

  const sName = fData.serie;
  const sData = appData.series?.[sName] || { nombre: sName, fases_asociadas: [nomencla] };
  currentActiveSerie = sData;

  const aptCode = fData.aptitud_riego || '-';
  const aptDesc = appData.aptitudes?.[aptCode] || fData.aptitud_descripcion || 'Información de aptitud de riego no disponible.';

  // 1. Encabezado principal del panel
  document.getElementById('sb-simbolo').textContent = fData.nomencla;
  document.getElementById('sb-tipo-uc').textContent = 'Fase Cartográfica';
  document.getElementById('sb-nombre-uc').textContent = fData.nombre || sName;
  document.getElementById('sb-superficie').textContent = fData.hectareas_total ? `${fData.hectareas_total.toLocaleString('es-AR')} ha` : '-';

  // Badges superiores de resumen
  const elAptBadge = document.getElementById('sb-aptitud-badge');
  if (elAptBadge) elAptBadge.textContent = `Clase ${aptCode}`;

  const elSerieBadge = document.getElementById('sb-serie-badge');
  if (elSerieBadge) elSerieBadge.textContent = sName || '-';

  // 2. Títulos de los botones de conmutación
  document.getElementById('label-view-fase').textContent = `Fase ${fData.nomencla}`;
  document.getElementById('label-view-serie').textContent = `Serie ${sName}`;

  // 3. VISTA DE FASE: Barra de selección de Fases hermanas de la misma Serie
  document.getElementById('fase-serie-parent-name').textContent = sName;
  const fasesBar = document.getElementById('fases-selector-bar');
  if (fasesBar) {
    fasesBar.innerHTML = '';
    const siblingFases = sData.fases_asociadas || [nomencla];
    siblingFases.forEach(sibCode => {
      const btn = document.createElement('button');
      const isCurrent = sibCode === nomencla;
      btn.className = `px-2.5 py-1 rounded-lg text-xs font-bold transition border ${
        isCurrent
          ? 'bg-amber-700 text-white border-amber-800 shadow-sm ring-2 ring-amber-400'
          : 'bg-white hover:bg-amber-100 text-amber-900 border-amber-300'
      }`;
      btn.textContent = sibCode;
      btn.title = isCurrent ? `Fase activa actual (${sibCode})` : `Consultar información de la Fase ${sibCode}`;
      btn.addEventListener('click', () => {
        selectFase(sibCode, true);
      });
      fasesBar.appendChild(btn);
    });
  }

  // 4. VISTA DE FASE: Tarjeta descriptiva
  document.getElementById('fase-display-nombre').textContent = fData.nombre || `${sName} (${fData.nomencla})`;
  document.getElementById('fase-display-apt-badge').textContent = `Aptitud: Clase ${aptCode}`;
  document.getElementById('fase-display-desc').textContent = fData.descripcion || 'Sin descripción de campo registrada para esta fase.';

  // 5. VISTA DE FASE: Evaluación de Aptitud para Riego
  document.getElementById('fase-display-apt-title').textContent = `Evaluación de Aptitud para Riego: Clase ${aptCode}`;
  document.getElementById('fase-display-apt-desc').textContent = aptDesc;

  // 6. VISTA DE FASE: Perfil Modal de Horizontes
  const tbody = document.getElementById('fase-display-horizontes-tbody');
  if (tbody) {
    tbody.innerHTML = '';
    const horizontes = sData.horizontes || [];
    if (horizontes.length > 0) {
      horizontes.forEach(h => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="font-bold text-amber-900 text-center">${h.horizonte || '-'}</td>
          <td class="font-semibold text-slate-700 text-center">${h.horizonte_p || '-'}</td>
          <td class="text-center font-mono text-[11px] text-slate-600 whitespace-nowrap">${h.desde ?? 0} - ${h.hasta ?? (h.mas ? '+' : '-')}</td>
          <td class="text-slate-700 text-[11px] leading-tight">${h.descripcion || '-'}</td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="p-3 text-center text-slate-400 italic text-xs">
            Esta serie no cuenta con descripción analítica de perfil modal disponible.
          </td>
        </tr>
      `;
    }
  }

  // 7. Botón inferior para pasar a la Serie
  document.getElementById('btn-serie-target-name').textContent = sName;

  // 8. Cargar también en segundo plano la VISTA DE SERIE por si el usuario conmuta
  renderSerieDataInView(sData);

  // 9. Establecer vista de Fase como activa
  setSidebarView('fase');

  // 10. Abrir el sidebar
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.add('open');

  // 11. Resaltar en el mapa si fue solicitado
  if (zoomToMap) {
    window.mapModule.findAndHighlight(nomencla);
  }
}

/**
 * Seleccionar y cargar la vista general de la Serie
 */
function selectSerie(serieName, zoomToMap = false) {
  if (!appData?.series?.[serieName]) return;

  const sData = appData.series[serieName];
  currentActiveSerie = sData;

  const firstFaseCode = sData.fases_asociadas?.[0];
  if (firstFaseCode && appData.fases[firstFaseCode]) {
    currentActiveFase = appData.fases[firstFaseCode];
  }

  // 1. Encabezado principal
  document.getElementById('sb-simbolo').textContent = 'SERIE';
  document.getElementById('sb-tipo-uc').textContent = 'Serie General de Suelos';
  document.getElementById('sb-nombre-uc').textContent = `Serie ${sData.nombre}`;
  document.getElementById('sb-superficie').textContent = sData.hectareas_total ? `${sData.hectareas_total.toLocaleString('es-AR')} ha` : '-';

  // Badges superiores de resumen
  const elAptBadge = document.getElementById('sb-aptitud-badge');
  if (elAptBadge) elAptBadge.textContent = `${sData.fases_asociadas?.length || 0} Fases`;

  const elSerieBadge = document.getElementById('sb-serie-badge');
  if (elSerieBadge) elSerieBadge.textContent = sData.nombre || '-';

  // 2. Renderizar datos en la vista de Serie
  renderSerieDataInView(sData);

  // 3. Conmutar a vista de Serie
  setSidebarView('serie');

  // 4. Abrir sidebar
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.add('open');

  // 5. Resaltar todos los polígonos de la serie si se solicitó
  if (zoomToMap) {
    window.mapModule.highlightSeriesPolygons(serieName, sData.fases_asociadas);
  }
}

/**
 * Renderizar los datos en el contenedor de Vista de Serie
 */
function renderSerieDataInView(sData) {
  document.getElementById('serie-display-nombre').textContent = `Serie ${sData.nombre}`;
  document.getElementById('serie-display-total-ha').textContent = sData.hectareas_total ? `${sData.hectareas_total.toLocaleString('es-AR')} hectáreas` : 'En cálculo';
  document.getElementById('serie-display-caracteristicas').textContent = sData.caracteristicas || 'Sin descripción morfogenética registrada.';

  document.getElementById('serie-display-variaciones').textContent = sData.variaciones || '-';
  document.getElementById('serie-display-drenaje').textContent = sData.drenaje || '-';
  document.getElementById('serie-display-vegetacion').textContent = sData.vegetacion || '-';
  document.getElementById('serie-display-uso').textContent = sData.uso || '-';
  document.getElementById('serie-display-distribucion').textContent = sData.distribucion || '-';
  document.getElementById('serie-display-asociacion').textContent = sData.asociacion || '-';
  document.getElementById('serie-display-origen').textContent = sData.origen_nombre || '-';

  // Directorio de Fases de esta Serie
  const fasesCountSpan = document.getElementById('serie-fases-count');
  const fasesListDiv = document.getElementById('serie-fases-cards-list');
  const fases = sData.fases_asociadas || [];

  if (fasesCountSpan) fasesCountSpan.textContent = `${fases.length} ${fases.length === 1 ? 'fase' : 'fases'}`;

  if (fasesListDiv) {
    fasesListDiv.innerHTML = '';
    if (fases.length > 0) {
      fases.forEach(fCode => {
        const fInfo = appData?.fases?.[fCode] || {};
        const card = document.createElement('div');
        card.className = "bg-slate-50 border border-slate-200 rounded-lg p-2.5 hover:border-amber-400 transition flex items-center justify-between gap-2";
        card.innerHTML = `
          <div>
            <div class="flex items-center gap-1.5">
              <span class="font-mono font-bold text-xs bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">${fCode}</span>
              <span class="text-[11px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">Riego: ${fInfo.aptitud_riego || '-'}</span>
            </div>
            <div class="text-xs text-slate-800 font-medium mt-1">${fInfo.nombre || '-'}</div>
          </div>
          <button class="select-fase-action-btn bg-amber-700 hover:bg-amber-800 text-white px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 transition flex items-center gap-1">
            <span>Ver Fase</span>
            <i class="fa-solid fa-arrow-right text-[10px]"></i>
          </button>
        `;
        card.querySelector('.select-fase-action-btn').addEventListener('click', () => {
          selectFase(fCode, true);
        });
        fasesListDiv.appendChild(card);
      });
    } else {
      fasesListDiv.innerHTML = '<div class="text-xs text-slate-400 italic">No se registran fases cartográficas para esta serie.</div>';
    }
  }
}

/**
 * Mostrar información para entidades sin fase específica (ej: ríos, poblaciones)
 */
function showGenericFeatureDetails(feature) {
  const p = feature.properties || {};
  const tipo = (p.tipo || 'Elemento Misceláneo').trim();
  const nombre = p.nombre || p.otros_nomb || tipo;

  document.getElementById('sb-simbolo').textContent = tipo.substring(0, 3).toUpperCase();
  document.getElementById('sb-tipo-uc').textContent = tipo;
  document.getElementById('sb-nombre-uc').textContent = nombre;
  document.getElementById('sb-superficie').textContent = p.area_ha ? `${p.area_ha.toLocaleString('es-AR')} ha` : '-';

  const elAptBadge = document.getElementById('sb-aptitud-badge');
  if (elAptBadge) elAptBadge.textContent = 'No aplica';

  const elSerieBadge = document.getElementById('sb-serie-badge');
  if (elSerieBadge) elSerieBadge.textContent = tipo;

  document.getElementById('fase-serie-parent-name').textContent = tipo;
  document.getElementById('fases-selector-bar').innerHTML = '<span class="text-xs text-slate-400 italic">Área no edáfica o cuerpo de agua.</span>';
  document.getElementById('fase-display-nombre').textContent = nombre;
  document.getElementById('fase-display-apt-badge').textContent = 'No aplicable';
  document.getElementById('fase-display-desc').textContent = `Elemento territorial clasificado como ${tipo}. No presenta estratigrafía edáfica ni aptitud para agricultura de riego.`;
  document.getElementById('fase-display-apt-title').textContent = 'Aptitud para Riego: No Aplicable';
  document.getElementById('fase-display-apt-desc').textContent = 'Área sin aptitud edáfica o correspondiente a un cauce de agua o poblado.';
  document.getElementById('fase-display-horizontes-tbody').innerHTML = '<tr><td colspan="4" class="p-3 text-center text-slate-400 italic text-xs">Sin horizontes de suelo.</td></tr>';

  document.getElementById('sidebar')?.classList.add('open');
}

// Poblar Catálogo de las 27 Series
function populateSeriesCatalog() {
  const container = document.getElementById('series-cards-container');
  const searchInput = document.getElementById('catalog-search-input');
  const countBadge = document.getElementById('catalog-count-badge');
  if (!container || !appData?.series) return;

  const allSeries = Object.values(appData.series);

  const render = (filterText = '') => {
    container.innerHTML = '';
    const q = filterText.toLowerCase().trim();

    const filtered = allSeries.filter(s => {
      const matchName = s.nombre.toLowerCase().includes(q);
      const matchFases = (s.fases_asociadas || []).some(f => f.toLowerCase().includes(q));
      const matchDesc = (s.caracteristicas || '').toLowerCase().includes(q);
      return matchName || matchFases || matchDesc;
    });

    if (countBadge) countBadge.textContent = `${filtered.length} de ${allSeries.length} series`;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="col-span-full text-center py-8 text-slate-400 text-sm">
          No se encontraron series que coincidan con "${filterText}".
        </div>
      `;
      return;
    }

    filtered.forEach(s => {
      const card = document.createElement('div');
      card.className = "bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition flex flex-col justify-between";

      const fasesCount = s.fases_asociadas ? s.fases_asociadas.length : 0;
      const haTotal = s.hectareas_total ? s.hectareas_total.toLocaleString('es-AR') + ' ha' : '-';
      const horizCount = s.horizontes ? s.horizontes.length : 0;

      card.innerHTML = `
        <div>
          <div class="flex items-start justify-between gap-2 mb-2">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                ${fasesCount} ${fasesCount === 1 ? 'Fase' : 'Fases'}
              </span>
              <h3 class="text-base font-bold text-slate-800 mt-1">${s.nombre}</h3>
            </div>
            <span class="text-xs text-slate-500 font-mono font-medium">${haTotal}</span>
          </div>

          <p class="text-xs text-slate-600 line-clamp-3 mb-3 leading-relaxed">
            ${s.caracteristicas || 'Sin descripción morfogenética registrada.'}
          </p>

          <div class="text-[11px] text-slate-500 mb-3 space-y-1">
            <div><b>Drenaje:</b> ${s.drenaje || '-'}</div>
            <div><b>Vegetación:</b> ${s.vegetacion ? s.vegetacion.substring(0, 60) + '...' : '-'}</div>
            <div><b>Horizontes analíticos:</b> ${horizCount > 0 ? horizCount + ' capas descritas' : 'En proceso'}</div>
          </div>
        </div>

        <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-auto">
          <button class="view-map-btn flex-1 bg-amber-700 hover:bg-amber-800 text-white py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition">
            <i class="fa-solid fa-location-dot"></i>
            <span>Ver en mapa</span>
          </button>
          <button class="consult-serie-btn bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition" title="Consultar Serie en Ficha">
            <i class="fa-solid fa-eye"></i>
            <span class="hidden sm:inline">Ficha</span>
          </button>
          <button class="download-pdf-btn bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition" title="Descargar Ficha PDF">
            <i class="fa-solid fa-file-pdf text-red-600"></i>
            <span class="hidden sm:inline">PDF</span>
          </button>
        </div>
      `;

      // Eventos de botones
      card.querySelector('.view-map-btn').addEventListener('click', () => {
        document.getElementById('catalog-modal')?.classList.remove('active');
        window.mapModule.highlightSeriesPolygons(s.nombre, s.fases_asociadas);
      });

      card.querySelector('.consult-serie-btn').addEventListener('click', () => {
        document.getElementById('catalog-modal')?.classList.remove('active');
        selectSerie(s.nombre, false);
      });

      card.querySelector('.download-pdf-btn').addEventListener('click', () => {
        const firstFaseCode = s.fases_asociadas?.[0];
        const faseData = firstFaseCode ? appData.fases[firstFaseCode] : { serie: s.nombre, nomencla: s.nombre };
        const aptData = appData.aptitudes[faseData?.aptitud_riego];
        window.exportSoilCalchaPDF(s, faseData, aptData);
      });

      container.appendChild(card);
    });
  };

  render();

  if (searchInput) {
    searchInput.addEventListener('input', (e) => render(e.target.value));
  }
}

// Poblar Glosario Edafológico
function populateGlossary() {
  const container = document.getElementById('glossary-terms-container');
  const searchInput = document.getElementById('glossary-search-input');
  if (!container || !appData?.glosario) return;

  const terms = appData.glosario;

  const render = (filterText = '') => {
    container.innerHTML = '';
    const q = filterText.toLowerCase().trim();

    const filtered = terms.filter(t => {
      return t.termino.toLowerCase().includes(q) || t.definicion.toLowerCase().includes(q);
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-slate-400 text-sm">
          No se encontraron términos que coincidan con "${filterText}".
        </div>
      `;
      return;
    }

    filtered.forEach(t => {
      const item = document.createElement('div');
      item.className = "bg-white border border-slate-200 rounded-lg p-3 hover:border-amber-400 transition";
      item.innerHTML = `
        <h4 class="text-xs font-bold text-amber-900 uppercase tracking-wide mb-1 flex items-center gap-1.5">
          <i class="fa-solid fa-bookmark text-amber-600 text-[10px]"></i>
          ${t.termino}
        </h4>
        <p class="text-xs text-slate-600 leading-relaxed">${t.definicion}</p>
      `;
      container.appendChild(item);
    });
  };

  render();

  if (searchInput) {
    searchInput.addEventListener('input', (e) => render(e.target.value));
  }
}

/**
 * Módulo de Mapa para Visor de Suelos de los Valles Calchaquíes
 */

let map;
let geojsonLayer;
let baseLayers = {};
let currentThematic = 'aptitud'; // 'aptitud', 'serie', 'tipo'
let allFeatures = [];
let selectedLayer = null;

// Estados de visualización transparente / solo bordes
let onlyBorders = false;
let layerOpacity = 0.65;

// Paletas de colores
const PALETTES = {
  aptitud: {
    '1': '#10b981',       // Clase 1: Muy alta aptitud (verde brillante)
    '2s': '#34d399',      // Clase 2: Moderada aptitud (verde medio)
    '2st': '#84cc16',     // Clase 2st: Moderada aptitud
    '2t': '#a3e635',      // Clase 2t: Moderada aptitud
    '3s': '#eab308',      // Clase 3: Limitación moderada a severa (amarillo)
    '3sd': '#facc15',     // Clase 3sd
    '3st': '#fde047',     // Clase 3st
    '3t': '#ca8a04',      // Clase 3t
    '4d': '#f97316',      // Clase 4: Severa limitación / marginal bajo riego (naranja)
    '4e': '#fb923c',      // Clase 4e: Especial arenosa
    '4sd': '#ea580c',     // Clase 4sd
    '4st': '#fdba74',     // Clase 4st
    '4td': '#c2410c',     // Clase 4td
    '6': '#ef4444',       // Clase 6: No apta para riego (rojo)
    'rio': '#38bdf8',     // Cursos de agua
    'default': '#94a3b8'  // Otros
  }
};

const serieColorCache = {};
function getSerieColor(serieName) {
  if (!serieName || serieName === 'None') return '#94a3b8';
  if (serieColorCache[serieName]) return serieColorCache[serieName];
  let hash = 0;
  for (let i = 0; i < serieName.length; i++) {
    hash = serieName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  const color = '#' + '00000'.substring(0, 6 - c.length) + c;
  serieColorCache[serieName] = color;
  return color;
}

function getFeatureThemeColor(p) {
  if (p.tipo && (p.tipo.toLowerCase().includes('río') || p.tipo.toLowerCase().includes('arroyo'))) {
    return PALETTES.aptitud.rio;
  }

  if (currentThematic === 'aptitud') {
    const apt = (p.aptitud || '').trim();
    return PALETTES.aptitud[apt] || PALETTES.aptitud['default'];
  } else if (currentThematic === 'serie') {
    const serie = (p.serie || '').trim();
    return getSerieColor(serie);
  } else if (currentThematic === 'tipo') {
    const t = (p.tipo || '').toLowerCase();
    if (t.includes('poblac')) return '#f59e0b';
    if (t.includes('río') || t.includes('arroyo') || t.includes('cauce') || t.includes('represa')) return '#0284c7';
    return '#10b981';
  }
  return '#94a3b8';
}

// Estilo de cada polígono
function getFeatureStyle(feature) {
  const p = feature.properties || {};
  const themeColor = getFeatureThemeColor(p);

  if (onlyBorders) {
    return {
      fillColor: 'transparent',
      fillOpacity: 0,
      weight: 1.8,
      color: themeColor,
      dashArray: ''
    };
  }

  return {
    fillColor: themeColor,
    weight: 1,
    opacity: 0.85,
    color: '#ffffff',
    dashArray: '',
    fillOpacity: layerOpacity
  };
}

// Inicializar Mapa
function initMap() {
  map = L.map('map', {
    center: [-25.4614, -66.0186],
    zoom: 9,
    zoomControl: false,
    minZoom: 7,
    maxZoom: 18
  });

  L.control.zoom({ position: 'topright' }).addTo(map);
  L.control.scale({ imperial: false, position: 'bottomright' }).addTo(map);

  // Capas Base
  baseLayers.satelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, USDA, USGS',
    maxZoom: 18
  });

  // ArgenMap oficial del Instituto Geográfico Nacional (IGN Argentina)
  baseLayers.argenmap = L.tileLayer('https://wms.ign.gob.ar/geoserver/gwc/service/tms/1.0.0/capabaseargenmap@EPSG:3857@png/{z}/{x}/{-y}.png', {
    attribution: '&copy; <a href="https://www.ign.gob.ar/" target="_blank">Instituto Geográfico Nacional (IGN Argentina)</a>',
    minZoom: 3,
    maxZoom: 18
  });

  // OpenStreetMap (OSM)
  baseLayers.osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
    maxZoom: 19
  });

  // Topográfico Esri
  baseLayers.topo = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Topo Map',
    maxZoom: 18
  });

  // Alias para mantener compatibilidad si se referencia 'calles'
  baseLayers.calles = baseLayers.argenmap;

  // Capa satélite por defecto
  baseLayers.satelite.addTo(map);

  updateLegend();
  return map;
}

// Cargar capa GeoJSON
async function loadSoilLayer(url) {
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
    const data = await resp.json();
    allFeatures = data.features;

    const hoverBox = document.getElementById('hover-info-box');

    geojsonLayer = L.geoJSON(data, {
      style: getFeatureStyle,
      onEachFeature: function(feature, layer) {
        layer.on({
          mouseover: function(e) {
            const l = e.target;
            const p = feature.properties || {};

            if (l !== selectedLayer) {
              l.setStyle({
                weight: 3,
                color: '#f59e0b',
                fillOpacity: onlyBorders ? 0.2 : Math.min(1, layerOpacity + 0.25)
              });
              l.bringToFront();
            }

            if (hoverBox) {
              hoverBox.classList.remove('hidden');
              hoverBox.innerHTML = `
                <div class="text-xs">
                  <div class="flex items-center justify-between gap-2 border-b pb-1 mb-1">
                    <span class="font-bold text-amber-900">${p.nomencla || p.tipo || 'S/N'}</span>
                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">Riego: ${p.aptitud || '-'}</span>
                  </div>
                  <div class="font-medium text-slate-800">${p.nombre || p.serie || p.otros_nomb || 'Área no clasificada'}</div>
                  <div class="text-[11px] text-slate-500 flex justify-between mt-0.5">
                    <span>Serie: <b>${p.serie || '-'}</b></span>
                    <span>Área: <b>${p.area_ha ? p.area_ha + ' ha' : '-'}</b></span>
                  </div>
                </div>
              `;
            }
          },
          mouseout: function(e) {
            const l = e.target;
            if (l !== selectedLayer) {
              geojsonLayer.resetStyle(l);
            }
            if (hoverBox) {
              hoverBox.classList.add('hidden');
            }
          },
          click: function(e) {
            selectFeature(feature, layer);
          }
        });
      }
    }).addTo(map);

    map.fitBounds(geojsonLayer.getBounds(), { padding: [20, 20] });
  } catch (err) {
    console.error("Error al cargar GeoJSON:", err);
  }
}

// Seleccionar un polígono
function selectFeature(feature, layer) {
  if (selectedLayer && geojsonLayer) {
    geojsonLayer.resetStyle(selectedLayer);
  }

  selectedLayer = layer;
  if (layer) {
    layer.setStyle({
      weight: 3.5,
      color: '#2563eb', // Borde azul vibrante
      fillOpacity: onlyBorders ? 0.3 : Math.min(1, layerOpacity + 0.3)
    });
    layer.bringToFront();
  }

  const event = new CustomEvent('soilSelected', { detail: { feature } });
  window.dispatchEvent(event);
}

// Cambiar temática visual
function setThematic(thematicKey) {
  currentThematic = thematicKey;
  if (geojsonLayer) {
    geojsonLayer.setStyle(getFeatureStyle);
    if (selectedLayer) {
      selectedLayer.setStyle({ weight: 3.5, color: '#2563eb' });
    }
  }
  updateLegend();
}

// Alternar entre Solo Bordes Transparentes y Relleno
function toggleOnlyBorders(active) {
  onlyBorders = active;
  if (geojsonLayer) {
    geojsonLayer.setStyle(getFeatureStyle);
    if (selectedLayer) {
      selectedLayer.setStyle({ weight: 3.5, color: '#2563eb' });
    }
  }
}

// Cambiar opacidad de la capa
function setLayerOpacity(opacity) {
  layerOpacity = Number(opacity);
  if (geojsonLayer && !onlyBorders) {
    geojsonLayer.setStyle(getFeatureStyle);
    if (selectedLayer) {
      selectedLayer.setStyle({ weight: 3.5, color: '#2563eb' });
    }
  }
}

// Cambiar mapa base
function setBaseMap(type) {
  Object.values(baseLayers).forEach(l => map.removeLayer(l));
  if (baseLayers[type]) {
    baseLayers[type].addTo(map);
  }
}

// Actualizar leyenda
function updateLegend() {
  const legendDiv = document.getElementById('legend-content');
  if (!legendDiv) return;

  let html = '';
  if (currentThematic === 'aptitud') {
    html += '<div class="text-xs font-semibold text-slate-700 mb-2">Clases de Aptitud para Riego:</div>';
    const items = [
      { label: 'Clase 1: Muy alta aptitud', color: '#10b981' },
      { label: 'Clase 2: Moderada aptitud (2s, 2st, 2t)', color: '#84cc16' },
      { label: 'Clase 3: Limitación moderada/severa (3s, 3sd, 3st, 3t)', color: '#eab308' },
      { label: 'Clase 4: Marginal / Uso especial (4d, 4e, 4sd, 4st, 4td)', color: '#f97316' },
      { label: 'Clase 6: No apta para riego / Pastoreo', color: '#ef4444' },
      { label: 'Ríos y Cursos de Agua', color: '#38bdf8' }
    ];
    items.forEach(it => {
      html += `
        <div class="flex items-center gap-2 mb-1 text-xs text-slate-600">
          <span class="w-3.5 h-3.5 rounded-sm inline-block shadow-sm shrink-0" style="background-color: ${it.color}"></span>
          <span class="leading-tight">${it.label}</span>
        </div>
      `;
    });
  } else if (currentThematic === 'serie') {
    html += '<div class="text-xs font-semibold text-slate-700 mb-1">Series de Suelos:</div>';
    html += '<p class="text-[11px] text-slate-500">Coloreado individual por cada una de las 27 series de los Valles Calchaquíes.</p>';
  } else if (currentThematic === 'tipo') {
    html += '<div class="text-xs font-semibold text-slate-700 mb-2">Tipo de Unidad:</div>';
    const items = [
      { label: 'Unidades Cartográficas de Suelo (UC)', color: '#10b981' },
      { label: 'Ríos, Arroyos y Cursos', color: '#0284c7' },
      { label: 'Poblaciones y Áreas Urbanas', color: '#f59e0b' }
    ];
    items.forEach(it => {
      html += `
        <div class="flex items-center gap-2 mb-1 text-xs text-slate-600">
          <span class="w-3.5 h-3.5 rounded-sm inline-block shadow-sm shrink-0" style="background-color: ${it.color}"></span>
          <span class="leading-tight">${it.label}</span>
        </div>
      `;
    });
  }

  legendDiv.innerHTML = html;
}

// Resaltar TODOS los polígonos donde participa una Serie (Fases Cartográficas asociadas)
function highlightSeriesPolygons(serieName, fasesList = []) {
  if (!serieName || !geojsonLayer) return false;

  const sNomLower = serieName.toLowerCase().trim();
  const fasesLower = (fasesList || []).map(u => u.toLowerCase().trim());

  if (selectedLayer) {
    geojsonLayer.resetStyle(selectedLayer);
    selectedLayer = null;
  }

  const matchingLayers = [];

  geojsonLayer.eachLayer(layer => {
    const p = layer.feature.properties || {};
    const nom = (p.nomencla || '').toLowerCase().trim();
    const s1 = (p.serie || '').toLowerCase().trim();

    const isMatch = s1 === sNomLower || 
                    fasesLower.includes(nom) || 
                    nom.includes(sNomLower);

    if (isMatch) {
      matchingLayers.push(layer);
      layer.setStyle({
        weight: 3.5,
        color: '#f59e0b',
        fillOpacity: Math.min(1, layerOpacity + 0.3)
      });
      layer.bringToFront();
    } else {
      geojsonLayer.resetStyle(layer);
    }
  });

  if (matchingLayers.length > 0) {
    const group = L.featureGroup(matchingLayers);
    map.fitBounds(group.getBounds(), { padding: [50, 50], maxZoom: 14 });
    return true;
  } else {
    return findAndHighlight(serieName);
  }
}

// Búsqueda de entidad por texto
function findAndHighlight(query) {
  if (!query || !geojsonLayer) return false;
  const q = query.toLowerCase().trim();
  let targetLayer = null;
  let targetFeature = null;

  geojsonLayer.eachLayer(layer => {
    const p = layer.feature.properties || {};
    const nom = (p.nomencla || '').toLowerCase();
    const s1 = (p.serie || '').toLowerCase();
    const nomb = (p.nombre || '').toLowerCase();
    const otros = (p.otros_nomb || '').toLowerCase();

    if (nom === q || s1 === q || nom.includes(q) || s1.includes(q) || nomb.includes(q) || otros.includes(q)) {
      if (!targetLayer) {
        targetLayer = layer;
        targetFeature = layer.feature;
      }
    }
  });

  if (targetLayer) {
    map.fitBounds(targetLayer.getBounds(), { maxZoom: 14, padding: [50, 50] });
    selectFeature(targetFeature, targetLayer);
    return true;
  }
  return false;
}

// Localizar por GPS
function locateUser() {
  if (!navigator.geolocation) {
    alert("Geolocalización no soportada por su navegador.");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      map.setView([lat, lng], 14);
      const marker = L.circleMarker([lat, lng], {
        radius: 8,
        fillColor: '#2563eb',
        color: '#ffffff',
        weight: 3,
        fillOpacity: 0.9
      }).addTo(map);
      marker.bindPopup("<b>Tu ubicación actual</b>").openPopup();
    },
    err => {
      alert("No se pudo obtener la ubicación: " + err.message);
    },
    { enableHighAccuracy: true }
  );
}

window.mapModule = {
  initMap,
  loadSoilLayer,
  setThematic,
  setBaseMap,
  findAndHighlight,
  highlightSeriesPolygons,
  locateUser,
  selectFeature,
  toggleOnlyBorders,
  setLayerOpacity
};

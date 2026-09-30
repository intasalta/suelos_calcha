# Visor de Suelos de los Valles Calchaquíes (Salta)

Aplicación web geográfica e interactiva para la consulta, visualización y descarga de fichas técnicas de las **27 series de suelos** y **106 fases cartográficas** de los Valles Calchaquíes (Provincia de Salta, Argentina).

Desarrollada para operar de manera 100% estática en **GitHub Pages** (sin requerir servidor backend ni bases de datos activas).

---

## 🚀 Características Principales

1. **Cartografía Interactiva Vectorial:**
   - 1.029 polígonos vectoriales optimizados (~1.5 MB) que cubren toda la cuenca del Río Calchaquí y Santa María (desde Cachi y La Poma hasta Cafayate y Tolombón).
   - Capas base intercambiables: Satélite de alta resolución (Esri World Imagery), ArgenMap oficial (IGN Argentina), OpenStreetMap (OSM) y Topográfico.
   - Tematización cromática por **Aptitud para Riego** (Clases 1 a 6 y subclases interpretativas `s`, `t`, `d`, `e`), **Serie Principal** y **Tipo de Unidad**.
   - Modo **Solo Bordes / Transparente** y barra deslizadora de **Opacidad** para visualizar el parcelario agrícola y las imágenes satelitales subyacentes.
   - Herramienta de posicionamiento **GPS en tiempo real** para uso a campo en smartphones y tablets.

2. **Ficha Técnica Lateral con Opción "Ampliar / Reducir":**
   - Panel de consulta detallado con botón **"Ampliar"** para expandir a 880 px (o doble clic sobre el encabezado) facilitando la lectura completa de datos sin desbordes.
   - Pestaña **Serie**: Descripción morfogenética, drenaje, vegetación, uso, distribución geográfica, relación con otras series y listado de fases asociadas interactivas.
   - Pestaña **Perfil Modal**: Tabla completa de horizontes analíticos con profundidades, designación y características morfológicas.
   - Pestaña **Aptitud para Riego**: Evaluación agronómica del potencial bajo riego y limitaciones de suelo, topografía o drenaje.
   - Pestaña **Fase**: Datos cartográficos específicos del polígono seleccionado.

3. **Generador y Descarga Directa de Fichas Técnicas en PDF:**
   - Botón en la ficha lateral y en cada tarjeta del catálogo para compilar y descargar al instante informes oficiales en formato A4 con membrete institucional del INTA y tablas detalladas.

4. **Catálogo de las 27 Series de Suelos:**
   - Directorio completo con buscador en vivo, resumen morfogenético, fases que la integran, botón **"Ver en mapa"** (resalta automáticamente todos los polígonos donde participa la serie) y botón **"PDF"**.

5. **Glosario Edafológico Integrado:**
   - Más de 70 términos edafológicos oficiales accesibles con buscador predictivo para técnicos, productores y estudiantes.

---

## 💻 ¿Cómo Probar Localmente?

En una consola de comandos (PowerShell o CMD):

```powershell
cd C:\INTA\IA\SUELOS_VCALCHA\VISOR_SUELOSCALCHA
python -m http.server 8001
```

Abre tu navegador web en:
👉 **[http://localhost:8001](http://localhost:8001)**

---

## 🌐 ¿Cómo Publicar en GitHub Pages? (2 Pasos)

### Paso 1: Subir los archivos a tu repositorio de GitHub

```bash
cd C:\INTA\IA\SUELOS_VCALCHA\VISOR_SUELOSCALCHA
git init
git add .
git commit -m "Visor de Suelos de los Valles Calchaquíes - INTA"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/suelos-valles-calchaquies.git
git push -u origin main
```

### Paso 2: Activar GitHub Pages

1. En tu repositorio en GitHub, entra a **Settings** -> **Pages**.
2. En **Build and deployment > Source**, selecciona **Deploy from a branch**.
3. En **Branch**, elige `main` y la carpeta `/ (root)`.
4. Haz clic en **Save**. En un par de minutos tu aplicación estará disponible online en:
   `https://TU-USUARIO.github.io/suelos-valles-calchaquies/`

---

## 👥 Créditos y Autoría

- **Origen del Levantamiento Edafológico (1970):** Convenio Gobierno de la Provincia de Salta y Universidad Nacional de La Plata (UNLP). Autores: Ing. Agr. Rafael Valencia, Lic. Alberto Lago, Lic. Teodoro Chafatinos, Lic. Roberto Ibarguren, Ing. Agr. Rubén Menegatti y Lic. Adelqui Ocaranza.
- **Adecuación a SIG (2015):** Castrillo Silvana, Elena Hernán, Paoli Héctor (INTA EEA Salta). Digitalización, georreferenciación y vinculación alfanumérica de 31 hojas cartográficas de los Valles Calchaquíes.
- **Desarrollo de la Aplicación Web:** Lic. Hernán Elena (INTA EEA Salta).


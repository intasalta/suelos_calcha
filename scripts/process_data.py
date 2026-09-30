"""
ETL Pipeline para el Visor de Suelos de los Valles Calchaquíes
Procesa:
1. Excel: Valles_Calchaquíes_070222.xlsx
2. GeoJSON: suelos_vcalcha.geojson
3. DOCX: GLOSARIO DE EDAFOLOGÍA Y SUELOS.docx
4. DOCX: Adecuación a un SIG Suelos V Calchaquies 021122.docx
5. Logo: logo_inta.png -> js/logo_inta_base64.js

Genera:
- data/suelos_calcha_info.json
- data/suelos_vcalcha.geojson (optimizado)
- js/logo_inta_base64.js
"""

import os
import re
import json
import base64
import zipfile
import xml.etree.ElementTree as ET
import openpyxl
from shapely.geometry import shape, mapping

BASE_DIR = r"C:\INTA\IA\SUELOS_VCALCHA"
APP_DIR = os.path.join(BASE_DIR, "VISOR_SUELOSCALCHA")
DATA_DIR = os.path.join(APP_DIR, "data")
JS_DIR = os.path.join(APP_DIR, "js")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(JS_DIR, exist_ok=True)

def export_logo_base64():
    logo_path = os.path.join(BASE_DIR, "logo_inta.png")
    if not os.path.exists(logo_path):
        print("Warning: logo_inta.png not found")
        return
    with open(logo_path, "rb") as f:
        encoded = base64.b64encode(f.read()).decode("utf-8")
    js_content = f"// Logo INTA en base64 para reportes PDF\nwindow.LOGO_INTA_BASE64 = 'data:image/png;base64,{encoded}';\n"
    out_path = os.path.join(JS_DIR, "logo_inta_base64.js")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(js_content)
    print(f"Exported logo base64 to {out_path}")

def parse_docx_paragraphs(doc_path):
    if not os.path.exists(doc_path):
        return []
    with zipfile.ZipFile(doc_path) as z:
        xml_content = z.read("word/document.xml")
        root = ET.fromstring(xml_content)
        paragraphs = []
        for p in root.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p"):
            texts = [t.text for t in p.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t") if t.text]
            if texts:
                line = "".join(texts).strip()
                if line:
                    paragraphs.append(line)
        return paragraphs

def parse_glossary():
    doc_path = os.path.join(BASE_DIR, "GLOSARIO DE EDAFOLOGÍA Y SUELOS.docx")
    paragraphs = parse_docx_paragraphs(doc_path)
    glossary = []
    current_term = None
    current_def = []

    for p in paragraphs:
        if p.upper().startswith("GLOSARIO"):
            continue
        # Check if line starts with bullet or term pattern
        # e.g., "• TERMINO: Definición" or "TERMINO: Definición"
        m = re.match(r"^[•\-\*]?\s*([A-ZÁÉÍÓÚÑ\s]{2,40}):\s*(.*)$", p)
        if m:
            if current_term and current_def:
                glossary.append({
                    "termino": current_term.strip().title(),
                    "definicion": " ".join(current_def).strip()
                })
            current_term = m.group(1).strip()
            current_def = [m.group(2).strip()]
        else:
            if current_term:
                current_def.append(p.strip())

    if current_term and current_def:
        glossary.append({
            "termino": current_term.strip().title(),
            "definicion": " ".join(current_def).strip()
        })

    print(f"Parsed {len(glossary)} glossary terms")
    return glossary

def parse_metadata():
    doc_path = os.path.join(BASE_DIR, "Adecuación a un SIG Suelos V Calchaquies 021122.docx")
    paragraphs = parse_docx_paragraphs(doc_path)
    
    hojas = [
        "La Poma", "Campo Negro", "Río Salado", "El Rodeo", "Totoral", "Palermo",
        "Los Cerrillos", "Payogasta Norte", "Payogasta Sur", "Cachi", "La Paya",
        "San José de Escalchi", "Gibraltar", "Seclantás Norte", "Seclantás Sur",
        "El Churcal", "Chimpa", "Banda Grande (Molinos)", "Angostura", "San Martín",
        "Angastaco", "La Florida", "Santa Rosa", "Payogastilla", "San Felipe",
        "San Rafael", "Cafayate", "San Carlos", "Corralito", "Animaná", "Tolombón"
    ]

    metadata = {
        "titulo": "Levantamiento de los Suelos de los Valles Calchaquíes - Provincia de Salta",
        "origen": "Convenio Gobierno de la Provincia de Salta y Universidad Nacional de La Plata (UNLP), 1970",
        "autores_originales": [
            "Ing. Agr. Rafael Valencia",
            "Lic. Alberto Lago",
            "Lic. Teodoro Chafatinos",
            "Lic. Roberto Ibarguren",
            "Ing. Agr. Rubén Menegatti",
            "Lic. Adelqui Ocaranza"
        ],
        "adecuacion_sig": "Instituto Nacional de Tecnología Agropecuaria (INTA) - EEA Salta",
        "año_adecuacion_sig": 2015,
        "autores_adecuacion_sig": [
            "Castrillo Silvana",
            "Elena Hernán",
            "Paoli Héctor"
        ],
        "desarrollo_web": "Lic. Hernán Elena",
        "cobertura": "Cuenca del Río Calchaquí y Santa María (170.000+ ha relevadas)",
        "hojas_cartograficas": hojas,
        "objetivo": "Digitalización, ajuste geométrico, georreferenciación y vinculación alfanumérica de la cartografía de suelos de los Valles Calchaquíes para consulta pública interactiva."
    }
    return metadata

def clean_str(val):
    if val is None:
        return None
    s = str(val).strip()
    return s if s else None

def parse_excel():
    wb_path = os.path.join(BASE_DIR, "Valles_Calchaquíes_070222.xlsx")
    wb = openpyxl.load_workbook(wb_path, data_only=True)

    # 1. Sheet Aptitud para riego
    aptitudes = {}
    if "Aptitud para riego" in wb.sheetnames:
        ws = wb["Aptitud para riego"]
        for r in ws.iter_rows(values_only=True):
            if not r or r[0] == "Aptitud para riego" or r[0] is None:
                continue
            code = str(r[0]).strip()
            desc = clean_str(r[1])
            aptitudes[code] = desc

    if "ap riego new" in wb.sheetnames:
        ws = wb["ap riego new"]
        for r in ws.iter_rows(values_only=True):
            if not r or r[0] == "Aptitud de Riego" or r[0] is None:
                continue
            code = str(r[0]).strip()
            desc = clean_str(r[1])
            if code not in aptitudes or len(desc or "") > len(aptitudes[code] or ""):
                aptitudes[code] = desc

    # 2. Sheet Serie
    series = {}
    ws_serie = wb["Serie"]
    for r in ws_serie.iter_rows(values_only=True):
        if not r or r[1] == "Serie" or r[1] is None:
            continue
        s_nombre = clean_str(r[1])
        if not s_nombre:
            continue
        series[s_nombre] = {
            "cod": r[0],
            "nombre": s_nombre,
            "caracteristicas": clean_str(r[2]),
            "variaciones": clean_str(r[3]),
            "drenaje": clean_str(r[4]),
            "vegetacion": clean_str(r[5]),
            "distribucion": clean_str(r[6]),
            "asociacion": clean_str(r[7]),
            "uso": clean_str(r[8]),
            "origen_nombre": clean_str(r[9]),
            "fases_asociadas": [],
            "horizontes": [],
            "caracteristicas_importantes": []
        }

    # 3. Sheet Fase
    fases = {}
    ws_fase = wb["Fase"]
    for r in ws_fase.iter_rows(values_only=True):
        if not r or r[1] == "Nomencla" or r[1] is None:
            continue
        s_nombre = clean_str(r[0])
        nomencla = clean_str(r[1])
        nombre_fase = clean_str(r[2])
        desc = clean_str(r[3])
        apt_riego = clean_str(r[4])

        if not nomencla:
            continue

        fase_obj = {
            "serie": s_nombre,
            "nomencla": nomencla,
            "nombre": nombre_fase,
            "descripcion": desc,
            "aptitud_riego": apt_riego,
            "aptitud_descripcion": aptitudes.get(apt_riego)
        }
        fases[nomencla] = fase_obj

        # Link to serie
        if s_nombre and s_nombre in series:
            series[s_nombre]["fases_asociadas"].append(nomencla)

    # 4. Sheet Perfil modal
    ws_perfil = wb["Perfil modal"]
    for r in ws_perfil.iter_rows(values_only=True):
        if not r or r[0] == "Serie" or r[0] is None:
            continue
        s_nombre = clean_str(r[0])
        if not s_nombre or s_nombre not in series:
            continue
        horiz_obj = {
            "horizonte": clean_str(r[1]),
            "horizonte_p": clean_str(r[2]),
            "desde": r[3] if isinstance(r[3], (int, float)) else None,
            "hasta": r[4] if isinstance(r[4], (int, float)) else None,
            "mas": clean_str(r[5]),
            "descripcion": clean_str(r[6])
        }
        series[s_nombre]["horizontes"].append(horiz_obj)

    # 5. Sheet Caracteristicas Importantes
    if "Caracteristicas Importantes" in wb.sheetnames:
        ws_ci = wb["Caracteristicas Importantes"]
        for r in ws_ci.iter_rows(values_only=True):
            if not r or r[1] == "Suelos" or r[1] is None:
                continue
            s_nombre = clean_str(r[1])
            if not s_nombre or s_nombre not in series:
                continue
            ci_obj = {
                "espesor_cm": r[3],
                "textura": clean_str(r[4]),
                "color": clean_str(r[5]),
                "estructura": clean_str(r[6]),
                "consistencia": clean_str(r[7]),
                "pH": r[8],
                "carbonato": clean_str(r[9]),
                "observaciones": clean_str(r[10]),
                "geomorfologia": clean_str(r[11]),
                "drenaje": clean_str(r[12]),
                "pendiente": clean_str(r[13])
            }
            series[s_nombre]["caracteristicas_importantes"].append(ci_obj)

    print(f"Processed {len(series)} series, {len(fases)} fases, {len(aptitudes)} aptitud classes")
    return series, fases, aptitudes

def process_geojson_and_link(series, fases):
    in_geojson = os.path.join(BASE_DIR, "suelos_vcalcha.geojson")
    out_geojson = os.path.join(DATA_DIR, "suelos_vcalcha.geojson")

    print(f"Reading original GeoJSON from {in_geojson}...")
    with open(in_geojson, "r", encoding="utf-8") as f:
        gj = json.load(f)

    # Track area and count per serie and fase
    stats_series = {}
    stats_fases = {}

    processed_features = []
    for feat in gj["features"]:
        geom = feat.get("geometry")
        if not geom:
            continue
        
        # Simplify geometry slightly (0.00005 deg ~ 5.5 m)
        try:
            geom_shape = shape(geom)
            simp = geom_shape.simplify(0.00005, preserve_topology=True)
            m = mapping(simp)
        except Exception as e:
            m = geom

        # Round coordinates to 5 decimals
        def r_coords(c):
            if isinstance(c[0], (int, float)):
                return [round(c[0], 5), round(c[1], 5)]
            return [r_coords(sub) for sub in c]

        clean_geom = {
            "type": m["type"],
            "coordinates": r_coords(m["coordinates"])
        }

        p = feat.get("properties", {})
        nomencla = clean_str(p.get("nomencla"))
        u_serie = clean_str(p.get("u_serie"))
        u_nombre = clean_str(p.get("u_nombre"))
        u_aptitud = clean_str(p.get("u_aptitud"))
        tipo = clean_str(p.get("tipo")) or "UC"
        otros_nomb = clean_str(p.get("otros_nomb"))

        area_m2 = float(p.get("shape_area") or 0)
        area_ha = round(area_m2 / 10000.0, 2)

        # Fallbacks & Enrichment from Excel data
        if nomencla and nomencla in fases:
            fase_info = fases[nomencla]
            if not u_serie:
                u_serie = fase_info.get("serie")
            if not u_nombre:
                u_nombre = fase_info.get("nombre")
            if not u_aptitud:
                u_aptitud = fase_info.get("aptitud_riego")

        # Stats
        if u_serie:
            if u_serie not in stats_series:
                stats_series[u_serie] = {"poligonos": 0, "hectareas": 0.0}
            stats_series[u_serie]["poligonos"] += 1
            stats_series[u_serie]["hectareas"] += area_ha

        if nomencla:
            if nomencla not in stats_fases:
                stats_fases[nomencla] = {"poligonos": 0, "hectareas": 0.0}
            stats_fases[nomencla]["poligonos"] += 1
            stats_fases[nomencla]["hectareas"] += area_ha

        clean_props = {
            "nomencla": nomencla,
            "serie": u_serie,
            "nombre": u_nombre,
            "aptitud": u_aptitud,
            "tipo": tipo,
            "otros_nomb": otros_nomb,
            "area_ha": area_ha
        }

        processed_features.append({
            "type": "Feature",
            "geometry": clean_geom,
            "properties": clean_props
        })

    # Update series and fases with spatial stats
    for s_name, stat in stats_series.items():
        if s_name in series:
            series[s_name]["poligonos_count"] = stat["poligonos"]
            series[s_name]["hectareas_total"] = round(stat["hectareas"], 2)

    for f_code, stat in stats_fases.items():
        if f_code in fases:
            fases[f_code]["poligonos_count"] = stat["poligonos"]
            fases[f_code]["hectareas_total"] = round(stat["hectareas"], 2)

    clean_geojson = {
        "type": "FeatureCollection",
        "features": processed_features
    }

    print(f"Writing optimized GeoJSON ({len(processed_features)} features)...")
    with open(out_geojson, "w", encoding="utf-8") as f:
        json.dump(clean_geojson, f, ensure_ascii=False, separators=(",", ":"))

    size_mb = os.path.getsize(out_geojson) / (1024 * 1024)
    print(f"Optimized GeoJSON written successfully: {size_mb:.2f} MB")

def main():
    print("=== INICIANDO PIPELINE DE DATOS VALLES CALCHAQUÍES ===")
    export_logo_base64()
    glossary = parse_glossary()
    metadata = parse_metadata()
    series, fases, aptitudes = parse_excel()
    process_geojson_and_link(series, fases)

    # Save consolidated JSON
    consolidated = {
        "metadata": metadata,
        "series": series,
        "fases": fases,
        "aptitudes": aptitudes,
        "glosario": glossary
    }

    out_json = os.path.join(DATA_DIR, "suelos_calcha_info.json")
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(consolidated, f, ensure_ascii=False, indent=2)

    size_kb = os.path.getsize(out_json) / 1024
    print(f"Consolidated JSON written to {out_json} ({size_kb:.1f} KB)")
    print("=== PIPELINE COMPLETADO EXITOSAMENTE ===")

if __name__ == "__main__":
    main()

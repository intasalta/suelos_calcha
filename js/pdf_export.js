/**
 * Generador de Fichas Técnicas Oficiales en PDF para Suelos de los Valles Calchaquíes
 * Utiliza jsPDF y AutoTable con logotipo institucional de INTA
 */

window.exportSoilCalchaPDF = function(serieData, faseData, aptitudData) {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - (margin * 2);

    const sNombre = (serieData?.nombre || faseData?.serie || 'Suelo Calchaquí').trim();
    const fSimbolo = (faseData?.nomencla || '--').trim();
    const fNombre = (faseData?.nombre || sNombre).trim();
    const aptClase = (faseData?.aptitud_riego || '--').trim();

    // 1. ENCABEZADO INSTITUCIONAL
    doc.setFillColor(113, 63, 18); // #713f12 marrón tierra calchaquí
    doc.rect(margin, 12, contentWidth, 24, 'F');

    // Logo INTA
    if (window.LOGO_INTA_BASE64) {
      try {
        doc.addImage(window.LOGO_INTA_BASE64, 'PNG', margin + 3, 14, 20, 20);
      } catch (e) {
        console.warn("No se pudo insertar logo en PDF:", e);
      }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text("INSTITUTO NACIONAL DE TECNOLOGÍA AGROPECUARIA", margin + 26, 19);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text("Estación Experimental Agropecuaria Salta · Sistema de Información de Suelos", margin + 26, 25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(253, 224, 71); // amarillo cálido
    doc.text("FICHA TÉCNICA: SUELOS DE LOS VALLES CALCHAQUÍES", margin + 26, 31);

    // 2. BANNER DE LA SERIE Y UNIDAD
    let y = 41;
    doc.setFillColor(254, 243, 199); // #fef3c7 amber 100
    doc.setDrawColor(245, 158, 11); // #f59e0b amber 500
    doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'FD');

    doc.setTextColor(113, 63, 18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`Serie ${sNombre}`, margin + 4, y + 6.5);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Unidad Cartográfica: ${fSimbolo} - ${fNombre}`, margin + 4, y + 12);

    // Badge Aptitud Riego
    doc.setFillColor(16, 185, 129); // emerald
    doc.roundedRect(pageWidth - margin - 38, y + 3, 34, 10, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`Aptitud: Clase ${aptClase}`, pageWidth - margin - 35, y + 9.5);

    y += 20;

    // 3. SECCIÓN 1: FACTORES AMBIENTALES Y MORFOLÓGICOS
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text("1. CARACTERÍSTICAS MORFOLÓGICAS Y DE SITIO", margin + 2, y + 4.2);
    y += 8;

    const envBody = [
      [{ content: "Características Principales:", styles: { fontStyle: 'bold', cellWidth: 42 } }, { content: serieData?.caracteristicas || '-' }],
      [{ content: "Variaciones Texturales:", styles: { fontStyle: 'bold' } }, { content: serieData?.variaciones || '-' }],
      [{ content: "Drenaje Natural:", styles: { fontStyle: 'bold' } }, { content: serieData?.drenaje || '-' }],
      [{ content: "Vegetación Natural:", styles: { fontStyle: 'bold' } }, { content: serieData?.vegetacion || '-' }],
      [{ content: "Uso de la Tierra:", styles: { fontStyle: 'bold' } }, { content: serieData?.uso || '-' }],
      [{ content: "Distribución Geográfica:", styles: { fontStyle: 'bold' } }, { content: serieData?.distribucion || '-' }],
      [{ content: "Asociación con otros Suelos:", styles: { fontStyle: 'bold' } }, { content: serieData?.asociacion || '-' }],
      [{ content: "Origen del Nombre:", styles: { fontStyle: 'bold' } }, { content: serieData?.origen_nombre || '-' }]
    ];

    doc.autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      body: envBody,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.2
      },
      columnStyles: {
        0: { fillColor: [248, 250, 252], textColor: [71, 85, 105] }
      }
    });

    y = doc.lastAutoTable.finalY + 6;

    // 4. SECCIÓN 2: PERFIL MODAL DE HORIZONTES
    if (y > pageHeight - 50) {
      doc.addPage();
      y = 15;
    }

    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text("2. PERFIL MODAL ANALÍTICO DE HORIZONTES", margin + 2, y + 4.2);
    y += 8;

    const horizontes = serieData?.horizontes || [];
    if (horizontes.length > 0) {
      const horizHeaders = [["Horiz", "Desig", "Prof (cm)", "Descripción Morfológica de Campo"]];
      const horizRows = horizontes.map(h => [
        h.horizonte || '-',
        h.horizonte_p || '-',
        `${h.desde ?? 0} - ${h.hasta ?? (h.mas ? '+' : '-')}`,
        h.descripcion || '-'
      ]);

      doc.autoTable({
        startY: y,
        margin: { left: margin, right: margin },
        head: horizHeaders,
        body: horizRows,
        theme: 'striped',
        headStyles: {
          fillColor: [113, 63, 18],
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: 'bold',
          halign: 'center'
        },
        styles: {
          fontSize: 7.2,
          cellPadding: 2.2,
          textColor: [30, 41, 59],
          lineColor: [226, 232, 240],
          lineWidth: 0.15
        },
        columnStyles: {
          0: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: 20, halign: 'center' },
          3: { halign: 'left' }
        }
      });
      y = doc.lastAutoTable.finalY + 6;
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Perfil modal de horizontes en proceso de digitalización o sin muestreo directo para esta serie.", margin + 2, y + 4);
      y += 8;
    }

    // 5. SECCIÓN 3: EVALUACIÓN DE APTITUD PARA RIEGO
    if (y > pageHeight - 50) {
      doc.addPage();
      y = 15;
    }

    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text("3. EVALUACIÓN Y APTITUD PARA RIEGO", margin + 2, y + 4.2);
    y += 8;

    const aptDesc = aptitudData || faseData?.aptitud_descripcion || "Información de aptitud de riego específica para la cuenca calchaquí.";
    const aptBody = [
      [
        { content: `Clase ${aptClase}:`, styles: { fontStyle: 'bold', cellWidth: 26, fillColor: [248, 250, 252] } },
        { content: aptDesc }
      ]
    ];

    doc.autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      body: aptBody,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.2
      }
    });

    y = doc.lastAutoTable.finalY + 6;

    // 6. SECCIÓN 4: FASES CARTOGRÁFICAS QUE COMPONEN LA SERIE
    if (serieData?.fases_asociadas && serieData.fases_asociadas.length > 0) {
      if (y > pageHeight - 40) {
        doc.addPage();
        y = 15;
      }

      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, contentWidth, 6, 'F');
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text("4. FASES CARTOGRÁFICAS ASOCIADAS EN EL VALLE CALCHAQUÍ", margin + 2, y + 4.2);
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      const fasesStr = serieData.fases_asociadas.join(", ");
      const splitText = doc.splitTextToSize(`Esta serie se cartografió en las siguientes unidades/fases: ${fasesStr}.`, contentWidth);
      doc.text(splitText, margin + 2, y);
      y += splitText.length * 4 + 4;
    }

    // PIE DE PÁGINA INSTITUCIONAL EN TODAS LAS HOJAS
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Levantamiento Valles Calchaquíes (1970) · Adecuación SIG (2015): S. Castrillo, H. Elena, H. Paoli · Des. Web: Lic. H. Elena · INTA EEA Salta", margin, pageHeight - 8);
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin - 18, pageHeight - 8);
    }

    // Nombre de archivo limpio
    const cleanFileName = `Ficha_Suelo_${sNombre.replace(/\s+/g, '_')}_${fSimbolo}.pdf`;
    doc.save(cleanFileName);
    return true;
  } catch (err) {
    console.error("Error al generar PDF de Suelo Calchaquí:", err);
    alert("Ocurrió un error al compilar el PDF: " + err.message);
    return false;
  }
};

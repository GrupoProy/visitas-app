
import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -----------------------------------------------------------------------------
// Logo institucional
// -----------------------------------------------------------------------------
// Ubicación: backend/src/imagen/senado.png
// Ruta relativa desde backend/src/modules/reportes/ → ../../imagen/senado.png
const LOGO_PATH = path.join(__dirname, '../../imagen/senado.png');

// -----------------------------------------------------------------------------
// Colores institucionales
// -----------------------------------------------------------------------------
const COLORES = {
  primario: '#1e3a8a',      // azul oscuro
  secundario: '#3b82f6',    // azul claro
  gris: '#64748b',
  grisClaro: '#f1f5f9',
  texto: '#0f172a',
};

// -----------------------------------------------------------------------------
// Márgenes y dimensiones (A4 en puntos)
// -----------------------------------------------------------------------------
const MARGEN = { top: 60, bottom: 60, left: 50, right: 50 };
const ANCHO_PAGINA = 595.28;
const ALTO_PAGINA = 841.89;
const ANCHO_UTIL = ANCHO_PAGINA - MARGEN.left - MARGEN.right;

// -----------------------------------------------------------------------------
// API pública
// -----------------------------------------------------------------------------
/**
 * Genera un PDF de reporte y lo envía por res.
 * @param {Object} opts
 * @param {Object} opts.meta       - { titulo, subtitulo, periodo, generadoPor, generadoEn, nombreArchivo }
 * @param {Object} [opts.resumen]  - { clave: valor } para el resumen ejecutivo (opcional)
 * @param {Object} opts.tabla      - { cabecera: [], filas: [[]], anchos: [] }
 * @param {Object} res             - Express response
 */
export const generarPDF = ({ meta, resumen, tabla }, res) => {
  const doc = new PDFDocument({
    size: 'A4',
    margins: MARGEN,
    bufferPages: true,   // ⚠️ Necesario para agregarFooter
    info: {
      Title: meta.titulo || 'Reporte',
      Author: 'Cámara de Senadores de Bolivia',
      Subject: meta.subtitulo || '',
      Creator: 'Sistema de Visitas',
    },
  });

  // Headers HTTP
  res.setHeader('Content-Type', 'application/pdf');
  const nombreArchivo = meta.nombreArchivo || `reporte-${Date.now()}.pdf`;
  res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);

  // Pipe al response
  doc.pipe(res);

  // Header
  dibujarHeader(doc, meta);

  // Resumen ejecutivo (opcional)
  if (resumen && Object.keys(resumen).length > 0) {
    dibujarResumen(doc, resumen);
    doc.moveDown(1);
  }

  // Tabla de datos
  if (tabla && tabla.cabecera && tabla.filas) {
    dibujarTabla(doc, tabla);
  }

  // Footer en cada página
  agregarFooter(doc);

  doc.end();
};

// -----------------------------------------------------------------------------
// Header institucional
// -----------------------------------------------------------------------------
const dibujarHeader = (doc, meta) => {
  const yInicial = doc.y;

  // Logo (si existe y es formato soportado)
  if (LOGO_PATH && fs.existsSync(LOGO_PATH)) {
    try {
      const ext = path.extname(LOGO_PATH).toLowerCase();
      if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
        doc.image(LOGO_PATH, MARGEN.left, yInicial, { width: 60 });
      } else {
        console.warn(`[PDF] Formato de logo no soportado: ${ext}`);
      }
    } catch (e) {
      console.warn('[PDF] Error al cargar logo:', e.message);
    }
  } else {
    console.warn(`[PDF] Logo no encontrado en: ${LOGO_PATH}`);
  }

  // Texto institucional a la derecha del logo
  const xTexto = MARGEN.left + 75;
  doc
    .fontSize(14)
    .fillColor(COLORES.primario)
    .font('Helvetica-Bold')
    .text('CÁMARA DE SENADORES', xTexto, yInicial + 5, {
      width: ANCHO_UTIL - 75,
    });

  doc
    .fontSize(10)
    .fillColor(COLORES.gris)
    .font('Helvetica')
    .text('Estado Plurinacional de Bolivia', xTexto, yInicial + 22)
    .text('Sistema de Registro y Autorización de Visitas', xTexto, yInicial + 35);

  // Línea divisoria
  doc
    .moveTo(MARGEN.left, yInicial + 75)
    .lineTo(ANCHO_PAGINA - MARGEN.right, yInicial + 75)
    .strokeColor(COLORES.secundario)
    .lineWidth(1.5)
    .stroke();

  // Título del reporte
  doc
    .fontSize(16)
    .fillColor(COLORES.primario)
    .font('Helvetica-Bold')
    .text(meta.titulo || 'Reporte', MARGEN.left, yInicial + 90, {
      width: ANCHO_UTIL,
    });

  // Subtítulo
  if (meta.subtitulo) {
    doc
      .fontSize(10)
      .fillColor(COLORES.gris)
      .font('Helvetica')
      .text(meta.subtitulo, MARGEN.left, doc.y + 2, { width: ANCHO_UTIL });
  }

  // Período
  if (meta.periodo) {
    doc
      .fontSize(10)
      .fillColor(COLORES.texto)
      .font('Helvetica')
      .text(`Período: ${meta.periodo}`, MARGEN.left, doc.y + 6, {
        width: ANCHO_UTIL,
      });
  }

  // Generado por / en
  if (meta.generadoPor || meta.generadoEn) {
    doc
      .fontSize(8)
      .fillColor(COLORES.gris)
      .text(
        `Generado por: ${meta.generadoPor || 'Sistema'} · ${
          meta.generadoEn || new Date().toLocaleString('es-BO')
        }`,
        MARGEN.left,
        doc.y + 4,
        { width: ANCHO_UTIL }
      );
  }

  doc.moveDown(1.5);
};

// -----------------------------------------------------------------------------
// Resumen ejecutivo
// -----------------------------------------------------------------------------
const dibujarResumen = (doc, resumen) => {
  const yInicial = doc.y;

  doc
    .fontSize(11)
    .fillColor(COLORES.primario)
    .font('Helvetica-Bold')
    .text('RESUMEN', MARGEN.left, yInicial, { width: ANCHO_UTIL });

  doc.moveDown(0.5);

  const entradas = Object.entries(resumen);
  const colWidth = ANCHO_UTIL / 2;

  entradas.forEach(([clave, valor], i) => {
    const col = i % 2;
    const x = MARGEN.left + col * colWidth;
    const y = doc.y;

    doc
      .fontSize(9)
      .fillColor(COLORES.gris)
      .font('Helvetica')
      .text(clave, x, y, { width: colWidth - 10, continued: false });

    doc
      .fontSize(10)
      .fillColor(COLORES.texto)
      .font('Helvetica-Bold')
      .text(String(valor), x, doc.y, { width: colWidth - 10 });

    // Si estamos en la segunda columna, avanzar línea
    if (col === 1) doc.moveDown(0.4);
  });

  doc.moveDown(0.8);
};

// -----------------------------------------------------------------------------
// Tabla de datos
// -----------------------------------------------------------------------------
const dibujarTabla = (doc, tabla) => {
  const { cabecera, filas, anchos } = tabla;
  const numCols = cabecera.length;
  const anchoCol = anchos || Array(numCols).fill(ANCHO_UTIL / numCols);
  const fontSizeHeader = 7;    // antes 9
  const fontSizeFila   = 6.5;  // antes 8
  const alturaFila     = 18;   // antes 20
  const alturaHeader   = 20;   // antes 24
  const paddingTexto   = 4;    // antes 5

  // Forzar que las filas quepan en el ancho útil
  const anchoTotal = anchoCol.reduce((a, b) => a + b, 0);
  const factor = ANCHO_UTIL / anchoTotal;
  const anchosFinales = anchoCol.map((a) => a * factor);

  const dibujarCabecera = () => {
    let x = MARGEN.left;
    const y = doc.y;

    // Fondo
    doc.rect(MARGEN.left, y, ANCHO_UTIL, alturaHeader).fill(COLORES.primario);

    doc.fontSize(fontSizeHeader).fillColor('#ffffff').font('Helvetica-Bold');

    cabecera.forEach((col, i) => {
      doc.text(String(col).toUpperCase(), x + paddingTexto, y + 6, {
        width: anchosFinales[i] - paddingTexto * 2,
        align: 'left',
        lineBreak: false,
        ellipsis: true,
      });
      x += anchosFinales[i];
    });

    doc.y = y + alturaHeader;
  };

  const nuevaPagina = () => {
    doc.addPage();
    dibujarCabecera();
    return MARGEN.top;
  };

  // Encabezado inicial
  dibujarCabecera();

  // Filas
  filas.forEach((fila, idx) => {
    // Si no cabe, nueva página
    if (doc.y + alturaFila > ALTO_PAGINA - MARGEN.bottom - 20) {
      nuevaPagina();
    }

    const yFila = doc.y;
    const esPar = idx % 2 === 0;

    // Fondo alternado
    if (esPar) {
      doc.rect(MARGEN.left, yFila, ANCHO_UTIL, alturaFila).fill(COLORES.grisClaro);
    }

    // Texto
    doc.fontSize(fontSizeFila).fillColor(COLORES.texto).font('Helvetica');
    let x = MARGEN.left;
    fila.forEach((celda, i) => {
      doc.text(String(celda ?? ''), x + paddingTexto, yFila + 5, {
        width: anchosFinales[i] - paddingTexto * 2,
        align: 'left',
        lineBreak: false,
        ellipsis: true,
      });
      x += anchosFinales[i];
    });

    // Borde inferior
    doc
      .moveTo(MARGEN.left, yFila + alturaFila)
      .lineTo(MARGEN.left + ANCHO_UTIL, yFila + alturaFila)
      .strokeColor('#e2e8f0')
      .lineWidth(0.5)
      .stroke();

    doc.y = yFila + alturaFila;
  });
};

// -----------------------------------------------------------------------------
// Footer en cada página
// -----------------------------------------------------------------------------
const agregarFooter = (doc) => {
  const paginas = doc.bufferedPageRange();

  for (let i = 0; i < paginas.count; i++) {
    doc.switchToPage(i);

    // Línea superior
    doc
      .moveTo(MARGEN.left, ALTO_PAGINA - MARGEN.bottom + 10)
      .lineTo(ANCHO_PAGINA - MARGEN.right, ALTO_PAGINA - MARGEN.bottom + 10)
      .strokeColor('#e2e8f0')
      .lineWidth(0.5)
      .stroke();

    doc
      .fontSize(8)
      .fillColor(COLORES.gris)
      .font('Helvetica')
      .text(
        `Sistema de Visitas · Generado el ${new Date().toLocaleString('es-BO')}`,
        MARGEN.left,
        ALTO_PAGINA - MARGEN.bottom + 15,
        { width: ANCHO_UTIL / 2, align: 'left' }
      );

    doc.text(
      `Página ${i + 1} de ${paginas.count}`,
      MARGEN.left + ANCHO_UTIL / 2,
      ALTO_PAGINA - MARGEN.bottom + 15,
      { width: ANCHO_UTIL / 2, align: 'right' }
    );
  }
};
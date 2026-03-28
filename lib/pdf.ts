import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface PrescriptionData {
  doctorName: string;
  patientName: string;
  date: string;
  medications: Medication[];
  notes?: string;
}

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

export async function generatePrescriptionPdf(
  data: PrescriptionData
): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  const blue = rgb(0.13, 0.39, 0.68);
  const darkGray = rgb(0.2, 0.2, 0.2);
  const medGray = rgb(0.4, 0.4, 0.4);
  const lightGray = rgb(0.85, 0.85, 0.85);
  const white = rgb(1, 1, 1);

  let y = PAGE_HEIGHT - MARGIN;

  // --- Header line ---
  page.drawRectangle({
    x: MARGIN,
    y: y - 2,
    width: CONTENT_WIDTH,
    height: 3,
    color: blue,
  });
  y -= 25;

  // --- Title ---
  page.drawText("PRESCRIPTION", {
    x: MARGIN,
    y,
    size: 22,
    font: fontBold,
    color: blue,
  });
  y -= 14;

  page.drawText("MediConnect Virtual Clinic", {
    x: MARGIN,
    y,
    size: 10,
    font: fontRegular,
    color: medGray,
  });
  y -= 30;

  // --- Doctor / Patient / Date info ---
  const infoLabelSize = 9;
  const infoValueSize = 11;
  const lineHeight = 16;

  const drawInfoRow = (label: string, value: string) => {
    page.drawText(label, {
      x: MARGIN,
      y,
      size: infoLabelSize,
      font: fontBold,
      color: medGray,
    });
    page.drawText(value, {
      x: MARGIN + 80,
      y,
      size: infoValueSize,
      font: fontRegular,
      color: darkGray,
    });
    y -= lineHeight;
  };

  drawInfoRow("Doctor:", data.doctorName);
  drawInfoRow("Patient:", data.patientName);
  drawInfoRow("Date:", data.date);
  y -= 10;

  // --- Separator ---
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 0.5,
    color: lightGray,
  });
  y -= 20;

  // --- Medications table ---
  page.drawText("Medications", {
    x: MARGIN,
    y,
    size: 14,
    font: fontBold,
    color: blue,
  });
  y -= 20;

  // Column layout
  const cols = [
    { label: "Name", x: MARGIN, width: 150 },
    { label: "Dosage", x: MARGIN + 155, width: 110 },
    { label: "Frequency", x: MARGIN + 270, width: 120 },
    { label: "Duration", x: MARGIN + 395, width: 100 },
  ];

  const rowHeight = 22;
  const headerHeight = 24;

  // Table header background
  page.drawRectangle({
    x: MARGIN,
    y: y - headerHeight + 6,
    width: CONTENT_WIDTH,
    height: headerHeight,
    color: blue,
  });

  // Header text
  for (const col of cols) {
    page.drawText(col.label, {
      x: col.x + 6,
      y: y - 12,
      size: 9,
      font: fontBold,
      color: white,
    });
  }
  y -= headerHeight;

  // Table rows
  for (let i = 0; i < data.medications.length; i++) {
    const med = data.medications[i];

    // Alternate row background
    if (i % 2 === 0) {
      page.drawRectangle({
        x: MARGIN,
        y: y - rowHeight + 6,
        width: CONTENT_WIDTH,
        height: rowHeight,
        color: rgb(0.95, 0.95, 0.97),
      });
    }

    const values = [med.name, med.dosage, med.frequency, med.duration];
    for (let c = 0; c < cols.length; c++) {
      page.drawText(values[c] || "", {
        x: cols[c].x + 6,
        y: y - 10,
        size: 9,
        font: fontRegular,
        color: darkGray,
        maxWidth: cols[c].width - 12,
      });
    }
    y -= rowHeight;
  }

  y -= 20;

  // --- Notes section ---
  if (data.notes) {
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_WIDTH - MARGIN, y },
      thickness: 0.5,
      color: lightGray,
    });
    y -= 20;

    page.drawText("Notes", {
      x: MARGIN,
      y,
      size: 14,
      font: fontBold,
      color: blue,
    });
    y -= 18;

    // Wrap notes text manually for long content
    const maxLineWidth = CONTENT_WIDTH - 10;
    const notesFontSize = 10;
    const words = data.notes.split(" ");
    let line = "";

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const testWidth = fontRegular.widthOfTextAtSize(testLine, notesFontSize);
      if (testWidth > maxLineWidth && line) {
        page.drawText(line, {
          x: MARGIN + 5,
          y,
          size: notesFontSize,
          font: fontRegular,
          color: darkGray,
        });
        y -= 14;
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) {
      page.drawText(line, {
        x: MARGIN + 5,
        y,
        size: notesFontSize,
        font: fontRegular,
        color: darkGray,
      });
    }
    y -= 20;
  }

  // --- Footer ---
  page.drawLine({
    start: { x: MARGIN, y: MARGIN + 20 },
    end: { x: PAGE_WIDTH - MARGIN, y: MARGIN + 20 },
    thickness: 0.5,
    color: lightGray,
  });

  page.drawText("Generated by MediConnect Virtual Clinic", {
    x: MARGIN,
    y: MARGIN + 6,
    size: 8,
    font: fontRegular,
    color: medGray,
  });

  page.drawText(`Page 1 of 1`, {
    x: PAGE_WIDTH - MARGIN - 50,
    y: MARGIN + 6,
    size: 8,
    font: fontRegular,
    color: medGray,
  });

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

import fs from 'node:fs';
import { jsPDF } from 'jspdf';

export function createStyledPdf(title: string, subtitle: string, meta: Record<string, string>, note?: string, isDummy = false): Buffer {
  const doc = new jsPDF();

  // Header Bar
  doc.setFillColor(20, 58, 107); // #143A6B
  doc.rect(0, 0, 210, 24, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('ALL INDIA COUNCIL FOR TECHNICAL EDUCATION', 14, 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Ministry of Education, Govt. of India • ANVESHAN FDR Portal', 14, 18);

  // Dummy badge if simulated
  if (isDummy) {
    doc.setFillColor(245, 166, 35); // amber
    doc.roundedRect(140, 6, 56, 12, 2, 2, 'F');
    doc.setTextColor(20, 58, 107);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('DUMMY / SIMULATED', 145, 14);
  }

  // Document Title
  doc.setTextColor(20, 58, 107);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title, 14, 40);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(74, 98, 128); // #4A6280
  doc.text(subtitle, 14, 48);

  doc.setDrawColor(220, 230, 242);
  doc.line(14, 52, 196, 52);

  // Metadata Table
  let y = 62;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  for (const [key, val] of Object.entries(meta)) {
    doc.setFillColor(243, 247, 252); // #F3F7FC
    doc.rect(14, y - 4, 60, 9, 'F');
    doc.rect(74, y - 4, 122, 9);

    doc.setTextColor(23, 50, 79);
    doc.setFont('helvetica', 'bold');
    doc.text(key, 16, y + 2);

    doc.setFont('helvetica', 'normal');
    doc.text(val, 78, y + 2);
    y += 11;
  }

  if (note) {
    y += 5;
    doc.setFillColor(253, 236, 234); // alert or warn bg
    doc.roundedRect(14, y, 182, 22, 2, 2, 'F');
    doc.setDrawColor(240, 196, 191);
    doc.roundedRect(14, y, 182, 22, 2, 2, 'D');

    doc.setTextColor(159, 29, 20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('REGULATORY & AUDIT VERIFICATION REMARKS:', 18, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(note, 18, y + 14);
  }

  // Footer
  doc.setDrawColor(220, 230, 242);
  doc.line(14, 275, 196, 275);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Anveshan Cryptographic Verification Chain Active • Verification Timestamp: ' + new Date().toISOString(), 14, 282);

  return Buffer.from(doc.output('arraybuffer'));
}

export function ensureDirectoryExists(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function generateInvoice(booking: any) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  page.drawText("Invoice", {
    x: 50,
    y: height - 50,
    size: 30,
    font,
    color: rgb(0, 0, 0),
  });

  page.drawText(`Booking ID: ${booking.id}`, {
    x: 50,
    y: height - 100,
    size: 12,
    font,
    color: rgb(0, 0, 0),
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

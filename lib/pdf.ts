import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

type InvoicePdfInput = {
  orderId: string;
  productName: string;
  customerName: string;
  amount: number;
  discountAmount: number;
  finalAmount: number;
  status: string;
  createdAt: string;
  credential: string | null;
  couponCode: string | null;
};

const PAGE = {
  width: 595.28,
  height: 841.89,
  marginX: 48,
  marginTop: 52,
  marginBottom: 48
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value || 0);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function normalizeStatus(status: string) {
  const s = String(status || "").toLowerCase();

  if (s === "settlement") {
    return {
      label: "PAID / SETTLEMENT",
      bg: rgb(0.90, 0.98, 0.94),
      text: rgb(0.06, 0.46, 0.23),
      border: rgb(0.50, 0.84, 0.63)
    };
  }

  if (s === "pending") {
    return {
      label: "PENDING PAYMENT",
      bg: rgb(1.0, 0.97, 0.88),
      text: rgb(0.72, 0.43, 0.02),
      border: rgb(0.96, 0.82, 0.47)
    };
  }

  return {
    label: s.toUpperCase(),
    bg: rgb(0.98, 0.92, 0.92),
    text: rgb(0.70, 0.12, 0.12),
    border: rgb(0.93, 0.62, 0.62)
  };
}

function drawTextBlock(params: {
  page: PDFPage;
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  font: PDFFont;
  size: number;
  lineHeight?: number;
  color?: ReturnType<typeof rgb>;
}) {
  const {
    page,
    text,
    x,
    y,
    maxWidth,
    font,
    size,
    lineHeight = size + 4,
    color = rgb(0.15, 0.18, 0.24)
  } = params;

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(test, size);

    if (width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);

  let cursorY = y;

  for (const line of lines) {
    page.drawText(line, {
      x,
      y: cursorY,
      font,
      size,
      color
    });
    cursorY -= lineHeight;
  }

  return cursorY;
}

function drawLabelValue(params: {
  page: PDFPage;
  label: string;
  value: string;
  x: number;
  y: number;
  labelFont: PDFFont;
  valueFont: PDFFont;
  maxWidth: number;
}) {
  const { page, label, value, x, y, labelFont, valueFont, maxWidth } = params;

  page.drawText(label, {
    x,
    y,
    font: labelFont,
    size: 10,
    color: rgb(0.43, 0.47, 0.55)
  });

  return drawTextBlock({
    page,
    text: value,
    x,
    y: y - 16,
    maxWidth,
    font: valueFont,
    size: 12,
    lineHeight: 16,
    color: rgb(0.10, 0.12, 0.18)
  });
}

function drawMoneyRow(params: {
  page: PDFPage;
  label: string;
  value: string;
  y: number;
  bold?: boolean;
  muted?: boolean;
  font: PDFFont;
  boldFont: PDFFont;
}) {
  const { page, label, value, y, bold, muted, font, boldFont } = params;
  const chosenFont = bold ? boldFont : font;
  const color = muted ? rgb(0.45, 0.48, 0.55) : rgb(0.14, 0.17, 0.22);
  const valueWidth = chosenFont.widthOfTextAtSize(value, bold ? 13 : 12);

  page.drawText(label, {
    x: PAGE.marginX + 20,
    y,
    font: chosenFont,
    size: bold ? 13 : 12,
    color
  });

  page.drawText(value, {
    x: PAGE.width - PAGE.marginX - 20 - valueWidth,
    y,
    font: chosenFont,
    size: bold ? 13 : 12,
    color: bold ? rgb(0.12, 0.14, 0.20) : color
  });
}

export async function generateInvoicePdf(input: InvoicePdfInput) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE.width, PAGE.height]);

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const statusMeta = normalizeStatus(input.status);

  // Background
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE.width,
    height: PAGE.height,
    color: rgb(0.98, 0.99, 1)
  });

  // Top premium header
  page.drawRectangle({
    x: 0,
    y: PAGE.height - 170,
    width: PAGE.width,
    height: 170,
    color: rgb(0.05, 0.11, 0.24)
  });

  page.drawRectangle({
    x: 0,
    y: PAGE.height - 175,
    width: PAGE.width,
    height: 5,
    color: rgb(0.31, 0.27, 0.90)
  });

  page.drawText("Kograph Premium", {
    x: PAGE.marginX,
    y: PAGE.height - 72,
    font: fontBold,
    size: 26,
    color: rgb(1, 1, 1)
  });

  page.drawText("Premium Digital Purchase Invoice", {
    x: PAGE.marginX,
    y: PAGE.height - 98,
    font: fontRegular,
    size: 11,
    color: rgb(0.82, 0.87, 0.96)
  });

  page.drawText("Invoice resmi transaksi digital", {
    x: PAGE.marginX,
    y: PAGE.height - 116,
    font: fontRegular,
    size: 10,
    color: rgb(0.70, 0.77, 0.90)
  });

  // Status badge
  const badgeX = PAGE.width - PAGE.marginX - 150;
  const badgeY = PAGE.height - 88;

  page.drawRectangle({
    x: badgeX,
    y: badgeY,
    width: 150,
    height: 28,
    color: statusMeta.bg,
    borderColor: statusMeta.border,
    borderWidth: 1
  });

  page.drawText(statusMeta.label, {
    x: badgeX + 12,
    y: badgeY + 9,
    font: fontBold,
    size: 10,
    color: statusMeta.text
  });

  // Main card
  const cardY = 180;
  const cardHeight = 500;

  page.drawRectangle({
    x: PAGE.marginX,
    y: cardY,
    width: PAGE.width - PAGE.marginX * 2,
    height: cardHeight,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.88, 0.90, 0.95),
    borderWidth: 1
  });

  // Section title
  page.drawText("Ringkasan Transaksi", {
    x: PAGE.marginX + 20,
    y: cardY + cardHeight - 34,
    font: fontBold,
    size: 16,
    color: rgb(0.10, 0.12, 0.18)
  });

  page.drawText("Berikut detail pesanan Anda", {
    x: PAGE.marginX + 20,
    y: cardY + cardHeight - 52,
    font: fontRegular,
    size: 10,
    color: rgb(0.45, 0.48, 0.55)
  });

  // Left/right info blocks
  let leftY = cardY + cardHeight - 90;
  let rightY = cardY + cardHeight - 90;

  leftY = drawLabelValue({
    page,
    label: "Invoice / Order ID",
    value: input.orderId,
    x: PAGE.marginX + 20,
    y: leftY,
    labelFont: fontRegular,
    valueFont: fontBold,
    maxWidth: 210
  });

  leftY -= 8;

  leftY = drawLabelValue({
    page,
    label: "Nama Pelanggan",
    value: input.customerName,
    x: PAGE.marginX + 20,
    y: leftY,
    labelFont: fontRegular,
    valueFont: fontRegular,
    maxWidth: 210
  });

  rightY = drawLabelValue({
    page,
    label: "Tanggal Transaksi",
    value: formatDate(input.createdAt),
    x: PAGE.width / 2 + 10,
    y: rightY,
    labelFont: fontRegular,
    valueFont: fontRegular,
    maxWidth: 190
  });

  rightY -= 8;

  rightY = drawLabelValue({
    page,
    label: "Produk",
    value: input.productName,
    x: PAGE.width / 2 + 10,
    y: rightY,
    labelFont: fontRegular,
    valueFont: fontBold,
    maxWidth: 190
  });

  // Divider
  const dividerY = cardY + cardHeight - 178;
  page.drawLine({
    start: { x: PAGE.marginX + 20, y: dividerY },
    end: { x: PAGE.width - PAGE.marginX - 20, y: dividerY },
    thickness: 1,
    color: rgb(0.91, 0.93, 0.96)
  });

  // Pricing box
  const pricingY = dividerY - 180;
  const pricingH = 140;

  page.drawRectangle({
    x: PAGE.marginX + 20,
    y: pricingY,
    width: PAGE.width - PAGE.marginX * 2 - 40,
    height: pricingH,
    color: rgb(0.98, 0.99, 1),
    borderColor: rgb(0.89, 0.92, 0.97),
    borderWidth: 1
  });

  page.drawText("Rincian Pembayaran", {
    x: PAGE.marginX + 36,
    y: pricingY + pricingH - 24,
    font: fontBold,
    size: 13,
    color: rgb(0.10, 0.12, 0.18)
  });

  drawMoneyRow({
    page,
    label: "Harga Produk",
    value: formatRupiah(input.amount),
    y: pricingY + pricingH - 52,
    font: fontRegular,
    boldFont: fontBold
  });

  drawMoneyRow({
    page,
    label: "Diskon",
    value:
      input.discountAmount > 0
        ? `- ${formatRupiah(input.discountAmount)}`
        : formatRupiah(0),
    y: pricingY + pricingH - 78,
    muted: input.discountAmount <= 0,
    font: fontRegular,
    boldFont: fontBold
  });

  if (input.couponCode) {
    page.drawText(`Coupon: ${input.couponCode}`, {
      x: PAGE.marginX + 20,
      y: pricingY + 34,
      font: fontRegular,
      size: 10,
      color: rgb(0.31, 0.27, 0.90)
    });
  }

  page.drawLine({
    start: { x: PAGE.marginX + 20, y: pricingY + 30 },
    end: { x: PAGE.width - PAGE.marginX - 20, y: pricingY + 30 },
    thickness: 1,
    color: rgb(0.89, 0.92, 0.97)
  });

  drawMoneyRow({
    page,
    label: "Total Dibayar",
    value: formatRupiah(input.finalAmount),
    y: pricingY + 12,
    bold: true,
    font: fontRegular,
    boldFont: fontBold
  });

  // Credential section
  const credentialY = pricingY - 115;
  page.drawText("Credential / Delivery", {
    x: PAGE.marginX + 20,
    y: credentialY + 86,
    font: fontBold,
    size: 13,
    color: rgb(0.10, 0.12, 0.18)
  });

  page.drawRectangle({
    x: PAGE.marginX + 20,
    y: credentialY,
    width: PAGE.width - PAGE.marginX * 2 - 40,
    height: 72,
    color: rgb(0.07, 0.10, 0.18),
    borderColor: rgb(0.16, 0.21, 0.34),
    borderWidth: 1
  });

  if (input.credential) {
    drawTextBlock({
      page,
      text: input.credential,
      x: PAGE.marginX + 32,
      y: credentialY + 46,
      maxWidth: PAGE.width - PAGE.marginX * 2 - 64,
      font: fontRegular,
      size: 11,
      lineHeight: 15,
      color: rgb(0.92, 0.95, 1)
    });
  } else {
    drawTextBlock({
      page,
      text:
        input.status === "settlement"
          ? "Credential belum tersedia. Hubungi support apabila pembayaran sudah berhasil namun data belum muncul."
          : "Credential akan tersedia otomatis setelah pembayaran berhasil dikonfirmasi.",
      x: PAGE.marginX + 32,
      y: credentialY + 46,
      maxWidth: PAGE.width - PAGE.marginX * 2 - 64,
      font: fontRegular,
      size: 10.5,
      lineHeight: 14,
      color: rgb(0.75, 0.82, 0.95)
    });
  }

  // Footer note
  page.drawText("Terima kasih telah berbelanja di Kograph Premium.", {
    x: PAGE.marginX,
    y: 92,
    font: fontBold,
    size: 11,
    color: rgb(0.14, 0.17, 0.22)
  });

  page.drawText(
    "Invoice ini dihasilkan otomatis oleh sistem dan dapat digunakan sebagai bukti transaksi resmi.",
    {
      x: PAGE.marginX,
      y: 74,
      font: fontRegular,
      size: 9.5,
      color: rgb(0.45, 0.48, 0.55)
    }
  );

  page.drawText("Support: kographh@gmail.com • Telegram: @KographSupportBot", {
    x: PAGE.marginX,
    y: 56,
    font: fontRegular,
    size: 9.5,
    color: rgb(0.45, 0.48, 0.55)
  });

  return await pdfDoc.save();
}
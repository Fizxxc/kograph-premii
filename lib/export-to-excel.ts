import ExcelJS from "exceljs";
import { formatRupiah } from "@/lib/utils";

type ExportRow = {
  orderId: string;
  productName: string;
  customerName: string;
  amount: number;
  discountAmount: number;
  finalAmount: number;
  couponCode: string;
  status: string;
  createdAt: string;
};

export async function exportTransactionsToExcel(rows: ExportRow[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Kograph Premium";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Transactions", {
    properties: { defaultColWidth: 22 }
  });

  sheet.columns = [
    { header: "Order ID", key: "orderId", width: 28 },
    { header: "Product", key: "productName", width: 28 },
    { header: "Customer", key: "customerName", width: 24 },
    { header: "Amount", key: "amount", width: 18 },
    { header: "Discount", key: "discountAmount", width: 18 },
    { header: "Final Amount", key: "finalAmount", width: 18 },
    { header: "Coupon", key: "couponCode", width: 18 },
    { header: "Status", key: "status", width: 16 },
    { header: "Created At", key: "createdAt", width: 24 }
  ];

  sheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4F46E5" }
    };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      top: { style: "thin", color: { argb: "FFD1D5DB" } },
      left: { style: "thin", color: { argb: "FFD1D5DB" } },
      bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
      right: { style: "thin", color: { argb: "FFD1D5DB" } }
    };
  });

  rows.forEach((row) => {
    sheet.addRow({
      ...row,
      amount: formatRupiah(row.amount),
      discountAmount: formatRupiah(row.discountAmount),
      finalAmount: formatRupiah(row.finalAmount),
      couponCode: row.couponCode || "-"
    });
  });

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.eachCell((cell) => {
      cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } }
      };
    });
  });

  return workbook.xlsx.writeBuffer();
}

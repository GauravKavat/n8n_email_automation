import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return NextResponse.json({ error: "No worksheet found" }, { status: 400 });
    }

    const headers: { columnNumber: number; name: string }[] = [];
    worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      const name = cell.text;
      if (name.trim().length > 0) {
        headers.push({ columnNumber, name });
      }
    });

    const rows: Record<string, unknown>[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const rowData: Record<string, unknown> = {};
      let hasData = false;
      for (const header of headers) {
        const cell = row.getCell(header.columnNumber);
        // If the cell contains a formula, get the result, otherwise get the value
        let value = cell.value;
        if (value && typeof value === 'object' && 'result' in value) {
          value = (value as { result?: unknown }).result as typeof value;
        }
        rowData[header.name] = value;
        if (value !== null && value !== undefined && value !== '') {
          hasData = true;
        }
      }
      if (hasData) {
        rows.push(rowData);
      }
    });

    // Group rows by 'Client orgnization'
    const groupedData: Record<string, Record<string, unknown>[]> = {};
    for (const row of rows) {
      const clientName = row["Client orgnization"];
      if (typeof clientName !== "string" || !clientName) continue;
      
      if (!groupedData[clientName]) {
        groupedData[clientName] = [];
      }
      groupedData[clientName].push(row);
    }

    return NextResponse.json({ grouped: groupedData });
  } catch (error) {
    console.error("POST /api/reports/extract error:", error);
    return NextResponse.json(
      { error: "Failed to extract Excel data" },
      { status: 500 }
    );
  }
}

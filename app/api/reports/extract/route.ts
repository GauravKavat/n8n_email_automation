import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return NextResponse.json({ error: "No worksheet found" }, { status: 400 });
    }

    const headers: string[] = [];
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber] = cell.value ? cell.value.toString() : `Column${colNumber}`;
    });

    const rows: any[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const rowData: any = {};
      let hasData = false;
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const header = headers[colNumber];
        if (header) {
          // If the cell contains a formula, get the result, otherwise get the value
          let value = cell.value;
          if (value && typeof value === 'object' && 'result' in value) {
            value = (value as any).result;
          }
          rowData[header] = value;
          if (value !== null && value !== undefined && value !== '') {
            hasData = true;
          }
        }
      });
      if (hasData) {
        rows.push(rowData);
      }
    });

    // Group rows by 'Client orgnization'
    const groupedData: Record<string, any[]> = {};
    for (const row of rows) {
      const clientName = row["Client orgnization"];
      if (!clientName) continue;
      
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

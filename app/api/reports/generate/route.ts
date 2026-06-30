import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import os from "os";
import fs from "fs/promises";
import path from "path";

const DATE_COLUMNS = [
  "Booking Date",
  "EDD",
  "Delivery Date",
  "Appointment Date"
];

function excelSerialToDate(serial: number): Date {
  return new Date((serial - 25569) * 86400 * 1000);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { client, rows } = body;

    if (!client || !rows || !Array.isArray(rows)) {
      return NextResponse.json(
        { error: "Invalid request payload. Expected { client: string, rows: object[] }" },
        { status: 400 }
      );
    }

    // Pre-process rows for dates
    for (const row of rows) {
      for (const dateCol of DATE_COLUMNS) {
        if (row[dateCol] !== undefined && typeof row[dateCol] === "number") {
          row[dateCol] = excelSerialToDate(row[dateCol]);
        }
      }
    }

    // Create a new workbook and a worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Shipment Report", {
      views: [{ state: 'frozen', ySplit: 1 }] // Freeze the first row
    });

    if (rows.length > 0) {
      // Get the headers from the keys of the first row
      const headers = Object.keys(rows[0]);
      
      // Add column definitions
      worksheet.columns = headers.map(header => ({
        header,
        key: header,
        width: 10 // initial width, will auto-size later
      }));

      // Make the header row bold
      worksheet.getRow(1).font = { bold: true };

      // Add all data rows
      worksheet.addRows(rows);

      // Format date columns and auto-size all columns based on content
      worksheet.columns.forEach((column) => {
        let maxLength = 0;
        
        const isDateColumn = column.header && DATE_COLUMNS.includes(column.header.toString());

        column["eachCell"]?.({ includeEmpty: true }, (cell) => {
          if (isDateColumn && Number(cell.row) > 1) {
            if (cell.value instanceof Date) {
              const hasTime = cell.value.getUTCHours() > 0 || cell.value.getUTCMinutes() > 0 || cell.value.getUTCSeconds() > 0 || cell.value.getUTCMilliseconds() > 0;
              cell.numFmt = hasTime ? "dd/mm/yyyy hh:mm" : "dd/mm/yyyy";
            } else {
              cell.numFmt = "dd/mm/yyyy";
            }
          }
          
          const columnLength = cell.value ? cell.value.toString().length : 0;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        
        // Add a little extra padding
        column.width = maxLength < 10 ? 10 : maxLength + 2;
      });
    }

    // Determine the local Downloads directory
    const reportsDir = path.join(os.homedir(), "Downloads", "ClientReports");
    await fs.mkdir(reportsDir, { recursive: true });

    // Sanitize the client name for Windows filenames
    const safeClientName = client.replace(/[<>:"/\\|?*]/g, "_");
    const filePath = path.join(reportsDir, `${safeClientName}.xlsx`);

    // Save the workbook locally
    await workbook.xlsx.writeFile(filePath);

    // Write workbook to buffer for the HTTP response
    const buffer = await workbook.xlsx.writeBuffer();

    // Return the binary data
    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(client)}.xlsx"`,
      },
    });

  } catch (error) {
    console.error("POST /api/reports/generate error:", error);
    return NextResponse.json(
      { error: "Failed to generate Excel report" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

const DATE_COLUMNS = [
  "Booking Date",
  "EDD",
  "Delivery Date",
  "Appointment Date"
];

function excelSerialToDate(serial: number): Date {
  return new Date((serial - 25569) * 86400 * 1000);
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { client, rows, selectedColumns, orderedColumns } = body;

    if (!client || !rows || !Array.isArray(rows)) {
      return NextResponse.json(
        { error: "Invalid request payload. Expected { client: string, rows: object[] }" },
        { status: 400 }
      );
    }
    if (
      selectedColumns !== undefined &&
      (!Array.isArray(selectedColumns) ||
        !selectedColumns.every((column) => typeof column === "string"))
    ) {
      return NextResponse.json(
        { error: "selectedColumns must be an array of strings" },
        { status: 400 },
      );
    }
    if (
      orderedColumns !== undefined &&
      (!Array.isArray(orderedColumns) ||
        !orderedColumns.every((column) => typeof column === "string"))
    ) {
      return NextResponse.json(
        { error: "orderedColumns must be an array of strings" },
        { status: 400 },
      );
    }
    if (selectedColumns?.length === 0) {
      return NextResponse.json(
        { error: "Select at least one report column" },
        { status: 400 },
      );
    }

    const availableColumns = uniqueStrings(
      rows.flatMap((row) =>
        row && typeof row === "object" ? Object.keys(row) : [],
      ),
    );
    const requestedColumns = uniqueStrings(
      selectedColumns ?? availableColumns,
    );
    const selectedSet = new Set(requestedColumns);
    const availableSet = new Set(availableColumns);
    const requestedOrder = uniqueStrings(orderedColumns ?? requestedColumns);
    const finalColumns = [
      ...requestedOrder.filter(
        (column) => selectedSet.has(column) && availableSet.has(column),
      ),
      ...requestedColumns.filter(
        (column) =>
          availableSet.has(column) && !requestedOrder.includes(column),
      ),
    ];
    const unknownColumns = requestedColumns.filter(
      (column) => !availableSet.has(column),
    );
    const warnings =
      unknownColumns.length > 0
        ? [`Ignored unknown report columns: ${unknownColumns.join(", ")}`]
        : [];

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
      // Add column definitions
      worksheet.columns = finalColumns.map(header => ({
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

    // Write workbook to buffer for the HTTP response
    const buffer = await workbook.xlsx.writeBuffer();

    // Return the binary data
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(client)}.xlsx"`,
        ...(warnings.length > 0
          ? { "X-Report-Warnings": encodeURIComponent(JSON.stringify(warnings)) }
          : {}),
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

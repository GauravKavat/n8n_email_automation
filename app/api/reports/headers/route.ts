import { Readable } from "node:stream";

import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const input = Readable.fromWeb(
      file.stream() as unknown as import("node:stream/web").ReadableStream,
    );
    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(input, {
      entries: "emit",
      sharedStrings: "cache",
      hyperlinks: "ignore",
      styles: "cache",
      worksheets: "emit",
    });

    for await (const worksheet of workbookReader) {
      for await (const row of worksheet) {
        const headers: string[] = [];

        row.eachCell({ includeEmpty: true }, (cell) => {
          const header = cell.text;
          if (header.trim().length > 0) {
            headers.push(header);
          }
        });

        return NextResponse.json({ headers });
      }

      return NextResponse.json(
        { error: "The first worksheet does not contain a header row" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "No worksheet found" },
      { status: 400 },
    );
  } catch (error) {
    console.error("POST /api/reports/headers error:", error);
    return NextResponse.json(
      { error: "Failed to read Excel headers" },
      { status: 400 },
    );
  }
}

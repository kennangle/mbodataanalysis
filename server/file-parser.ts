import Papa from "papaparse";
import * as XLSX from "xlsx";
import { readFileSync } from "fs";
import { PDFParse } from "pdf-parse";

export interface ParsedFileContent {
  text: string;
  metadata: {
    rows?: number;
    columns?: number;
    sheets?: string[];
    pages?: number;
  };
}

export async function parseFile(filePath: string, mimeType: string): Promise<ParsedFileContent> {
  try {
    switch (mimeType) {
      case "text/csv":
        return parseCSV(filePath);
      
      case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      case "application/vnd.ms-excel":
        return parseExcel(filePath);
      
      case "text/plain":
        return parseText(filePath);
      
      case "application/pdf":
        return await parsePDF(filePath);
      
      default:
        return {
          text: `File type ${mimeType} is not supported for text extraction`,
          metadata: {},
        };
    }
  } catch (error) {
    console.error(`Error parsing file:`, error);
    return {
      text: `Error parsing file: ${error instanceof Error ? error.message : String(error)}`,
      metadata: {},
    };
  }
}

function parseCSV(filePath: string): ParsedFileContent {
  const content = readFileSync(filePath, "utf-8");
  const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });
  
  const rows = parsed.data as Array<Record<string, any>>;
  const columns = parsed.meta.fields || [];
  
  const text = formatDataAsText(rows, columns);
  
  return {
    text,
    metadata: {
      rows: rows.length,
      columns: columns.length,
    },
  };
}

function parseExcel(filePath: string): ParsedFileContent {
  const workbook = XLSX.readFile(filePath);
  const sheetNames = workbook.SheetNames;
  
  let allText = "";
  const allRows: any[] = [];
  
  for (const sheetName of sheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (data.length > 0) {
      allText += `\n\n=== Sheet: ${sheetName} ===\n`;
      
      const headers = data[0] as any[];
      const rows = data.slice(1) as any[][];
      
      const rowObjects = rows.map(row => {
        const obj: Record<string, any> = {};
        headers.forEach((header, i) => {
          obj[header || `Column${i + 1}`] = row[i] || "";
        });
        return obj;
      });
      
      allRows.push(...rowObjects);
      allText += formatDataAsText(rowObjects, headers.map((h, i) => h || `Column${i + 1}`));
    }
  }
  
  return {
    text: allText,
    metadata: {
      rows: allRows.length,
      sheets: sheetNames,
    },
  };
}

function parseText(filePath: string): ParsedFileContent {
  const content = readFileSync(filePath, "utf-8");
  return {
    text: content,
    metadata: {},
  };
}

async function parsePDF(filePath: string): Promise<ParsedFileContent> {
  try {
    const dataBuffer = readFileSync(filePath);
    const parser = new PDFParse({ data: dataBuffer });
    const pdfData = await parser.getText();
    
    await parser.destroy();
    
    return {
      text: pdfData.text || "PDF contains no extractable text",
      metadata: {
        pages: pdfData.total || 0,
      },
    };
  } catch (error) {
    console.error("Error parsing PDF:", error);
    
    if (error instanceof Error && error.message.includes("encrypted")) {
      return {
        text: "PDF is password-protected and cannot be read",
        metadata: {},
      };
    }
    
    return {
      text: `Could not extract text from PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
      metadata: {},
    };
  }
}

function formatDataAsText(rows: Array<Record<string, any>>, columns: string[]): string {
  if (rows.length === 0) return "No data found";
  
  const maxRows = 1000;
  const displayRows = rows.slice(0, maxRows);
  
  let text = `Data Summary (${rows.length} total rows, showing first ${displayRows.length}):\n\n`;
  text += `Columns: ${columns.join(", ")}\n\n`;
  
  text += "Sample Data:\n";
  displayRows.slice(0, 10).forEach((row, i) => {
    text += `\nRow ${i + 1}:\n`;
    columns.forEach(col => {
      const value = row[col];
      if (value !== undefined && value !== null && value !== "") {
        text += `  ${col}: ${value}\n`;
      }
    });
  });
  
  if (rows.length > maxRows) {
    text += `\n... and ${rows.length - maxRows} more rows`;
  }
  
  return text;
}

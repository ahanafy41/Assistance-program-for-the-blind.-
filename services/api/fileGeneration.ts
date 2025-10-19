import jsPDF from 'jspdf';
import { Document, Packer, Paragraph } from 'docx';
import * as XLSX from 'xlsx';

/**
 * Generates a PDF file from text content.
 * Note: Arabic text rendering is not fully supported and may appear incorrectly.
 * @param content The text content for the PDF.
 * @returns A promise that resolves to a data URL string of the generated PDF.
 */
export async function generatePdf(content: string): Promise<string> {
    const doc = new jsPDF();
    // Basic text insertion. Full Arabic support would require font embedding.
    const lines = doc.splitTextToSize(content, 180);
    doc.text(lines, 10, 10);
    return doc.output('datauristring');
}

/**
 * Generates a Word document (.docx) from text content.
 * @param content The text content for the document.
 * @returns A promise that resolves to a data URL string of the generated .docx file.
 */
export async function generateWordDoc(content: string): Promise<string> {
    const doc = new Document({
        sections: [{
            children: [new Paragraph(content)],
        }],
    });
    const base64 = await Packer.toBase64String(doc);
    return `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`;
}

/**
 * Generates an Excel spreadsheet (.xlsx) from a JSON string.
 * @param jsonData A JSON string representing an array of objects.
 * @returns A promise that resolves to a data URL string of the generated .xlsx file.
 */
export async function generateExcelSheet(jsonData: string): Promise<string> {
    try {
        const data = JSON.parse(jsonData);
        if (!Array.isArray(data)) {
            throw new Error("Invalid JSON format: Input must be an array of objects.");
        }
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
        const base64 = XLSX.write(workbook, { type: "base64", bookType: "xlsx" });
        return `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
    } catch (error) {
        console.error("Error generating Excel sheet:", error);
        throw new Error(`Failed to create Excel file: ${error instanceof Error ? error.message : String(error)}`);
    }
}
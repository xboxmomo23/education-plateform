"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCsvContent = parseCsvContent;
const DEFAULT_MAX_ROWS = 500;
function normalizeHeader(header) {
    return header.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/\s+/g, "_");
}
function detectDelimiter(line) {
    const commaCount = (line.match(/,/g) || []).length;
    const semiCount = (line.match(/;/g) || []).length;
    if (semiCount > commaCount) {
        return ";";
    }
    if (commaCount > semiCount) {
        return ",";
    }
    // fallback: prefer semicolon if both zero to align with FR CSVs
    return semiCount === 0 && commaCount === 0 ? ";" : ",";
}
function parseCsvContent(content, maxRows = DEFAULT_MAX_ROWS) {
    if (!content || typeof content !== "string") {
        throw new Error("CSV vide ou invalide");
    }
    const normalizedContent = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const firstLineEnd = normalizedContent.indexOf("\n");
    const firstLine = firstLineEnd === -1 ? normalizedContent : normalizedContent.slice(0, firstLineEnd);
    const delimiter = detectDelimiter(firstLine);
    const rows = [];
    let currentField = "";
    const currentRow = [];
    let inQuotes = false;
    const pushField = () => {
        currentRow.push(currentField);
        currentField = "";
    };
    const pushRow = () => {
        rows.push(currentRow.slice());
        currentRow.length = 0;
    };
    for (let i = 0; i < normalizedContent.length; i++) {
        const char = normalizedContent[i];
        if (char === '"') {
            if (inQuotes && normalizedContent[i + 1] === '"') {
                currentField += '"';
                i++;
            }
            else {
                inQuotes = !inQuotes;
            }
            continue;
        }
        if (char === delimiter && !inQuotes) {
            pushField();
            continue;
        }
        if (char === "\n" && !inQuotes) {
            pushField();
            pushRow();
            continue;
        }
        currentField += char;
    }
    // push last field/row if not empty
    if (currentField.length > 0 || inQuotes || currentRow.length > 0) {
        pushField();
        pushRow();
    }
    if (rows.length === 0) {
        throw new Error("CSV vide");
    }
    const headers = rows.shift().map(normalizeHeader);
    if (!headers.length) {
        throw new Error("Entêtes CSV manquantes");
    }
    if (rows.length > maxRows) {
        throw new Error(`Le fichier dépasse la limite de ${maxRows} lignes`);
    }
    const filteredRows = rows.filter((row) => row.some((value) => value.trim().length > 0));
    return { headers, rows: filteredRows, delimiter };
}
//# sourceMappingURL=csv.utils.js.map
export interface ParsedCsv {
    headers: string[];
    rows: string[][];
    delimiter: string;
}
export declare function parseCsvContent(content: string, maxRows?: number): ParsedCsv;
//# sourceMappingURL=csv.utils.d.ts.map
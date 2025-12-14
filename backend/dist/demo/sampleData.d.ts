export type DemoResponseBody = {
    success: boolean;
    data: any;
} | {
    success: boolean;
    error?: string;
};
type DemoResponseEntry = {
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    pattern: RegExp;
    body: DemoResponseBody;
} | {
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    pattern: RegExp;
    body: (req: any) => DemoResponseBody;
};
export declare const demoResponses: DemoResponseEntry[];
export {};
//# sourceMappingURL=sampleData.d.ts.map
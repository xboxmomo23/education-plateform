export type SupportedLocale = "fr" | "en";
export type EstablishmentSettingsDTO = {
    establishmentId: string | null;
    displayName: string;
    contactEmail: string;
    schoolYear: string;
    defaultLocale: SupportedLocale;
};
export declare function getDefaultEstablishmentSettings(): EstablishmentSettingsDTO;
export declare function getEstablishmentSettings(establishmentId: string): Promise<EstablishmentSettingsDTO>;
export declare function upsertEstablishmentSettings(establishmentId: string, data: Partial<{
    displayName: string | null;
    contactEmail: string | null;
    schoolYear: string | null;
    defaultLocale: SupportedLocale | null;
}>): Promise<EstablishmentSettingsDTO>;
//# sourceMappingURL=establishmentSettings.model.d.ts.map
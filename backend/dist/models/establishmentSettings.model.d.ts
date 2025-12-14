export type EstablishmentSettingsDTO = {
    establishmentId: string | null;
    displayName: string;
    contactEmail: string;
    schoolYear: string;
};
export declare function getDefaultEstablishmentSettings(): EstablishmentSettingsDTO;
export declare function getEstablishmentSettings(establishmentId: string): Promise<EstablishmentSettingsDTO>;
export declare function upsertEstablishmentSettings(establishmentId: string, data: Partial<{
    displayName: string | null;
    contactEmail: string | null;
    schoolYear: string | null;
}>): Promise<EstablishmentSettingsDTO>;
//# sourceMappingURL=establishmentSettings.model.d.ts.map
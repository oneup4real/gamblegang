export type LeagueRole = "OWNER" | "ADMIN" | "MEMBER";

export const PERMISSIONS: Record<string, readonly LeagueRole[]> = {
    KICK_MEMBER: ["OWNER"],
    ASSIGN_ROLE: ["OWNER"],
    SET_START_CAPITAL: ["OWNER"],
    CREATE_BET: ["OWNER", "ADMIN"],
    RESOLVE_BET: ["OWNER", "ADMIN"], // Or specific resolution admin
    PLACE_BET: ["OWNER", "ADMIN", "MEMBER"],
    DISPUTE_RESULT: ["OWNER", "ADMIN", "MEMBER"],
} as const;

export function hasPermission(role: LeagueRole, permission: keyof typeof PERMISSIONS): boolean {
    if (!role) return false;
    return PERMISSIONS[permission].includes(role);
}

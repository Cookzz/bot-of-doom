export enum DFPROFILER {
    BASE = "https://www.dfprofiler.com",
    PROFILE_VIEW = "https://www.dfprofiler.com/profile/view",
    CLAN_WEEKLY = "https://www.dfprofiler.com/clan/weekly-loot",
    CLAN = "https://www.dfprofiler.com/clan/view/168"
}

export enum SCRAPE {
    WEEKLY_LOOT_ONLY = 'div[data-bind="text: weekly_loot"]',
    CLAN_WEEKLY_LOOT_ONLY = 'div[data-bind="text: clan_weekly_loot"]'
}

/* Unique function for compete */
export const getTableInfo = (headerData: any, tableData: any[]) => {
    const nameKey = headerData["Username"]
    const rankKey = headerData["Rank"]
    const weeklyLootKey = headerData["Weekly Loots"]

    const membersInfo = tableData.map((v: any) => 
        ({ name: v[nameKey], clan: v[rankKey], loot_weekly: String(v[weeklyLootKey]).replace(/,/g, "") })
    )

    return membersInfo
}
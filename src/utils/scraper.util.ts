export enum DFPROFILER {
    BASE = "https://www.dfprofiler.com",
    PROFILE_VIEW = "https://www.dfprofiler.com/profile/view",
    CLAN_WEEKLY = "https://www.dfprofiler.com/clan/weekly-loot",
    CLAN = "https://www.dfprofiler.com/clan/view/168"
}

export enum SCRAPE {
    BASIC_INFO = ".profiler-username-header, .clan, div[data-bind*='text: profession_level']",
    LOOT_INFO = "div[data-bind*='text: weekly_loot'], div[data-bind*='text: all_time_loot'], div[data-bind*='text: clan_weekly_loot'], div[data-bind*='text: clan_total_loot']",
    WEEKLY_LOOT_ONLY = "div[data-bind*='text: weekly_loot']"
}
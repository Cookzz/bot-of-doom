import ky from 'ky'
import * as cheerio from 'cheerio';
import { tryCatch } from "./utils/common.util";
import { API } from "./utils/api.util";
import { DFPROFILER, getTableInfo, SCRAPE } from "./utils/scraper.util";
import { parseTerritoryCss } from "./utils/bossmap.util";
import type { BossCell, BossEvent, BossLetter, BossmapBundle } from "./types/bossmap.type";

class Scraper {
    async getProfile(id: any): Promise<any>{
        const { data, error } = await tryCatch(ky.get(`${DFPROFILER.PROFILE_VIEW}/${id}`).text())

        if (error){
            return null
        }

        const profileElement = data
        const $ = cheerio.load(profileElement)

        const user_info = this.getBasicInfo($)
        const loot_info = this.getLootInfo($)

        const combinedInfo = Object.assign({}, user_info, loot_info)
        return combinedInfo
    }

    async getClanWeekly(){
        const { data, error } = await tryCatch(ky.get(DFPROFILER.CLAN_WEEKLY).text())

        if (error){
            return { data: null, error }
        }

        const weeklyClanElement = data
        const $ = cheerio.load(weeklyClanElement)

        const result = this.getWeeklyTable($)

        return result
    }

    async getClanMemberWeeklyLoot(){
        const { data, error } = await tryCatch(ky.get(DFPROFILER.CLAN).text())

        if (error){
            return null
        }

        const clanElement = data
        const $ = cheerio.load(clanElement)

        return this.getMembers($)
    }

    async getCompetingClanMemberWeeklyLoot(){
        const { data, error } = await tryCatch(ky.get(DFPROFILER.CLAN).text())

        if (error){
            return null
        }

        const clanElement = data
        const $ = cheerio.load(clanElement)

        return this.getCompeteMembers($)
    }

    private getBasicInfo($: cheerio.CheerioAPI){
        return $.extract({
            name: '.profiler-username-header',
            clan: '.clan',
            profession_level: 'div[data-bind="text: profession_level"]'
        })
    }

    private getLootInfo($: cheerio.CheerioAPI){
        return $.extract({
            loot_weekly: 'div[data-bind="text: weekly_loot"]',
            loot_alltime: 'div[data-bind="text: all_time_loot"]',
            clan_weekly: 'div[data-bind="text: clan_weekly_loot"]',
            clan_alltime: 'div[data-bind="text: clan_total_loot"]'
        })
    }

    private getMemberWeeklyLoot($: cheerio.CheerioAPI){
        const loot_weekly = $(SCRAPE.WEEKLY_LOOT_ONLY).text()

        return { loot_weekly }
    }

    private getMemberClanWeeklyLoot($: cheerio.CheerioAPI){
        const loot_weekly = $(SCRAPE.CLAN_WEEKLY_LOOT_ONLY).text()

        return { loot_weekly }
    }

    private getWeeklyTable($: cheerio.CheerioAPI){
        const rows: any[] = [];
        const sel = "tbody > tr";
        $(sel).each(function() {
            const row = $(this).find('td').map((i, el) => $(el).text().replace(/[\n\r\t]/gm, "")).get();
            rows.push(row);
        });

        return rows.slice(0, 25)
    }

    /*
      /clan needs each member's personal weekly loot, which only exists on
       their individual profile page, so these must be fetched one by one
       (with a small concurrency limit so it doesn't overwhelm df profile)
    */
    private async getMembers($: cheerio.CheerioAPI){
        const links: string[] = []
        const sel = "tbody tr td";
        $(sel).each((index, elem) => {
            const link = $(elem).find('a').attr('href');
            // Make sure the href attribute exists and is not empty
            if (link && link.trim() !== '') {
                links.push(link);
            }
        })

        const memberInfos: any[] = await mapLimit(links, 4, async (link: string) => {
            const profileLink = `${API.BASE_URL}${link}`
            const { data, error } = await tryCatch(ky.get(profileLink).text())

            if (error){
                return null //skip failed profiles, keep fetching the rest
            }

            const profileElement = data

            const $$ = cheerio.load(profileElement)
            const user_info = this.getBasicInfo($$)
            const loot_info = this.getMemberWeeklyLoot($$)

            return Object.assign({}, user_info, loot_info)
        })

        const validMembers = memberInfos.filter(info => info)
        const sortedInfo = validMembers.sort((a, b) => Number(b.loot_weekly) - Number(a.loot_weekly))

        return sortedInfo
    }

    private getCompeteMembers($: cheerio.CheerioAPI){
        // Select the table element
        const table = $('table');

        // Initialize an empty array to store the table data
        const tableData: any[] = [];
        const headerData: any = {};

        table.find('th').each((j, cell) => {
            // Add the cell data to the row data object
            const cellText: string = $(cell).text().replace(/[\n\r\t]/gm, "")
            if (!isBlank(cellText)){
                headerData[cellText] = j;
            }
        });

        // Iterate over each row of the table using the find and each methods
        table.find('tr').each((i, row) => {
            // Initialize an empty object to store the row data
            const rowData: any = {};

            // Iterate over each cell of the row using the find and each methods
            $(row).find('td').each((j, cell) => {
                // Add the cell data to the row data object
                const cleanCellText = $(cell).text().replace(/[\n\r\t]/gm, "")
                rowData[j] = cleanCellText;
            });

            // Add the row data to the table data array
            if (Object.keys(rowData).length > 0){
                tableData.push(rowData);
            }
        });

        const membersInfo = getTableInfo(headerData, tableData)
        const sortedInfo = membersInfo.filter(m => Number(m.loot_weekly) !== 0).sort((a, b) => Number(b.loot_weekly) - Number(a.loot_weekly))

        return sortedInfo
    }

    /*
      /bossmap only renders markers client-side from /bossmap/json, so the
      static page is used solely for the grid outline and the outpost letters
    */
    async getBossmapBundle(): Promise<BossmapBundle> {
        const [mapEl, mapJ, mapCss] = [DFPROFILER.BOSSMAP, DFPROFILER.BOSSMAP_JSON, DFPROFILER.BOSSMAP_CSS]

        // concurrently fetch instead of doing it one by one
        const dfpHeaders = { "X-Requested-With": "XMLHttpRequest" }
        const [mapRes, eventsRes, cssRes] = await Promise.allSettled([
            ky.get(mapEl, { headers: dfpHeaders }).text(),
            ky.get(mapJ, { headers: dfpHeaders }).json<Record<string, any>>(),
            ky.get(mapCss).text(),
        ])

        if (mapRes.status === 'rejected') throw mapRes.reason
        if (eventsRes.status === 'rejected') throw eventsRes.reason
        if (cssRes.status === 'rejected') throw cssRes.reason

        const mapData = mapRes.value
        const eventsData = eventsRes.value
        const cssData = cssRes.value

        const $ = cheerio.load(mapData)
        const cell_matches = $('td.coord').map((_, el) => {
            const cls = $(el).attr('class') ?? ''
            return { cls, text: $(el).text().trim(), title: $(el).attr('data-title') ?? '' }
        }).get()

        const cells: BossCell[] = []
        const letters: BossLetter[] = []
        for (const { cls, text, title } of cell_matches) {
            const match = cls.match(/x(\d+) y(\d+)/)
            if (!match) continue
            const x = Number(match[1]), y = Number(match[2])
            cells.push({ x, y })
            if (text) {
                letters.push({ x, y, letter: text, title })
            }
        }

        const xs = cells.map(c => c.x)
        const ys = cells.map(c => c.y)

        // the payload also carries version/bosshash/servertime; everything else is events
        const events: BossEvent[] = Object.entries(eventsData)
            .filter(([key]) => !['version', 'bosshash', 'servertime'].includes(key))
            .map(([, value]) => value as BossEvent)
        const servertime = Number(eventsData.servertime)
        const outpostsAttacked = Object.entries(eventsData).some(([, value]) => (value as BossEvent)?.isoa === '1')

        return {
            bounds: { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) },
            cells,
            letters,
            terrains: parseTerritoryCss(cssData),
            events,
            servertime,
            outpostsAttacked,
        }
    }
}

export default Scraper

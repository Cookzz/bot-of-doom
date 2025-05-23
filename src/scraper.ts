import ky from 'ky'
import * as cheerio from 'cheerio';
import { DFPROFILER, getTableInfo, SCRAPE } from "./utils/scraper.util";
import { isBlank, tryCatch } from "./utils/common.util";
import { API } from "./utils/api.util";

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
            return null
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
        
        const result = await this.getMembers($)

        return result
    }

    async getCompetingClanMemberWeeklyLoot(){
        const { data, error } = await tryCatch(ky.get(DFPROFILER.CLAN).text())

        if (error){
            return null
        }

        const clanElement = data
        const $ = cheerio.load(clanElement)
        
        const result = await this.getCompeteMembers($)

        return result
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

        let memberInfos = []

        for (const link of links) {
            const profileLink = `${API.BASE_URL}${link}`
            const { data, error } = await tryCatch(ky.get(profileLink).text())

            if (error){
                return null
            }

            const profileElement = data

            const $$ = cheerio.load(profileElement)
            const user_info = this.getBasicInfo($$)
            const loot_info = this.getMemberWeeklyLoot($$)

            const combinedInfo = Object.assign({}, user_info, loot_info)
            memberInfos.push(combinedInfo)
        }

        const sortedInfo = memberInfos.sort((a, b) => Number(b.loot_weekly) - Number(a.loot_weekly))

        return sortedInfo
    }

    private async getCompeteMembers($: cheerio.CheerioAPI){
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
}

export default Scraper
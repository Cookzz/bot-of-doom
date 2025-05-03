import puppeteer, { Page } from "puppeteer"
import { DFPROFILER, SCRAPE } from "./utils/scraper.util";

class Scraper {
    async getProfile(id: any){
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        // Navigate the page to a URL.
        await page.goto(`${DFPROFILER.PROFILE_VIEW}/${id}`);

        // Set screen size.
        await page.setViewport({width: 1080, height: 1024});

        const user_info = await this.getBasicInfo(page)
        const loot_info = await this.getLootInfo(page)

        await browser.close();

        const combinedInfo = Object.assign({}, user_info, loot_info)
        return combinedInfo
    }

    async getClanWeekly(){
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        // Navigate the page to a URL.
        await page.goto(DFPROFILER.CLAN_WEEKLY);

        // Set screen size.
        await page.setViewport({width: 1080, height: 1024});

        const result = await this.getWeeklyTable(page)

        await browser.close();

        return result
    }

    async getClanMemberWeeklyLoot(){
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        // Navigate the page to a URL.
        await page.goto(DFPROFILER.CLAN);

        // Set screen size.
        await page.setViewport({width: 1080, height: 1024});

        const result = await this.getMembers(page)

        await browser.close();

        return result
    }

    private async getBasicInfo(page: Page){
        const basicInfo = await page.$$eval(SCRAPE.BASIC_INFO, (els: any)=>{
            return els.map((el: any) => el.textContent)
        })

        const info = {
            name: basicInfo[0],
            clan: basicInfo[1],
            profession_level: basicInfo[2]
        }

        return info;
    }

    private async getLootInfo(page: Page){
        const basicInfo = await page.$$eval(SCRAPE.LOOT_INFO, (els: any)=>{
            return els.map((el: any) => el.textContent)
        })

        const info = {
            loot_weekly: basicInfo[0],
            loot_alltime: basicInfo[1],
            clan_weekly: basicInfo[2],
            clan_alltime: basicInfo[3]
        }

        return info;
    }

    private async getMemberWeeklyLoot(page: Page){
        const textSelector = await page
            .locator(SCRAPE.WEEKLY_LOOT_ONLY)
            .waitHandle();
        const loot_weekly = await textSelector?.evaluate(el => el.textContent);

        return { loot_weekly }
    }

    private async getWeeklyTable(page: Page){
        return await page.$$eval('#DataTables_Table_0 tr', rows => {
            return Array.from(rows, row => {
                const columns = row.querySelectorAll('td');
                return Array.from(columns, column => column.innerText);
            }).filter(ary => ary.length !== 0);
        });
    }

    private async getMembers(page: Page){
        const links = await page.evaluate(() => {
            return Array.from(
                document.querySelectorAll('#DataTables_Table_0 a[href]'),
                a => a.getAttribute('href')
            )
        });

        let memberInfos = []

        for (const link of links) {
            const url = `${DFPROFILER.BASE}${link}`
            await page.goto(url)
            const user_info = await this.getBasicInfo(page)
            const loot_info = await this.getMemberWeeklyLoot(page)

            const combinedInfo = Object.assign({}, user_info, loot_info)
            memberInfos.push(combinedInfo)
        }

        const sortedInfo = memberInfos.sort((a, b) => Number(b.loot_weekly) - Number(a.loot_weekly))

        return sortedInfo
    }
}

export default Scraper
import { EmbedBuilder, type Client } from "discord.js";
import ky from 'ky'
import { table } from 'table'

import { isBlank, tryCatch } from "./utils/common.util";
import { API } from "./utils/api.util";
import Scraper from "./scraper";
import type { ProfileInfo } from "./types/profile-info.type";
import { convertToTableArray } from "./utils/profiler.util";

class Profiler {
    private readonly client: Client
    private readonly scraper: Scraper

    constructor(client: Client){
        this.client = client
        this.scraper = new Scraper()
    }

    async fetchProfile(int: any, text: any){
        const searchParams = new URLSearchParams()
        searchParams.append("dataType", "json")
        searchParams.append("query", text)

        const postData = {
            body: searchParams,
            headers: {
                "X-Requested-With": "XMLHttpRequest"
            }
        }

        const { data, error }: any = await tryCatch(ky.post(`${API.SEARCH_PROFILE}/${text}`, postData).json())

        if (error){
            int.reply("There is an issue fetching from DFprofiler, please try again later.")
            return
        }
        if (!data || !data?.length){
            int.reply("No profile with this name found.")
            return
        }

        await int.deferReply()

        const profileInfo: ProfileInfo = await this.scraper.getProfile(data[0].player_id)

        const embed = new EmbedBuilder()
            .setTitle("Profile")
            .setDescription(`[DFProfiler Link](https://www.dfprofiler.com/profile/view/${data[0].player_id})\n**Name:** ${profileInfo.name}\n**Profession & Level:** ${profileInfo.profession_level}\n**Clan & Rank:** ${isBlank(profileInfo.clan) ? "None" : profileInfo.clan}\n\n**__Loot Records__**`)
            .addFields(
                  {
                    name: "Weekly Loots",
                    value: profileInfo.loot_weekly,
                    inline: true
                  },
                  {
                    name: "All Time loots",
                    value: profileInfo.loot_alltime,
                    inline: true
                  },
                  {
                    name: "",
                    value: "",
                    inline: false
                  },
                  {
                    name: "Clan Weekly Loots",
                    value: profileInfo.clan_weekly,
                    inline: true
                  },
                  {
                    name: "All Time Clan Loots",
                    value: profileInfo.clan_alltime,
                    inline: true
                  },
            )
            .setColor("#00b0f4")
            .setTimestamp();

        return await int.editReply({ embeds: [embed] })
    }

    async fetchWeekly(int: any){
        await int.deferReply()

        const { data, error }: any = await tryCatch(this.scraper.getClanWeekly())

        if (error){
            int.reply("There is an issue fetching from DFprofiler, please try again later.")
            return
        }
        if (!data || !data?.length){
            int.reply("No profile with this name found.")
            return
        }

        const tableData = new Array(["No.", "Clan", "Record"]).concat(data)
        const textTable = table(tableData, { singleLine: true })
        const extraEmbed = "```" + textTable + "```"

        const embed = new EmbedBuilder()
            .setTitle("Weekly Clan Top Looter")
            .setDescription(extraEmbed)
            .setColor("#00b0f4")
            .setTimestamp();

        return await int.editReply({ embeds: [embed] })
    }

    async fetchClanLoot(int: any){
      await int.deferReply()

      const { data, error }: any = await tryCatch(this.scraper.getClanMemberWeeklyLoot())

      if (error){
        int.editReply("There is an issue fetching from DFprofiler, please try again later.")
        return
      }
      if (!data || !data?.length){
          int.editReply("No profile with this name found.")
          return
      }

      const additionalData = convertToTableArray(data)
      const tableData = new Array(["Name", "Rank", "Weekly Loot"]).concat(additionalData)
      const textTable = table(tableData, { singleLine: true })
      const extraEmbed = "```" + textTable + "```"

      const embed = new EmbedBuilder()
          .setTitle("Weekly Clan Top Looter")
          .setDescription(extraEmbed)
          .setColor("#00b0f4")
          .setTimestamp();

      return await int.editReply({ embeds: [embed] })
    }
}

export default Profiler
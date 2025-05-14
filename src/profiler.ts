import { EmbedBuilder, type Client } from "discord.js";
import ky from 'ky'
import { table } from 'table'

import { getDateTime, isBlank, tryCatch } from "./utils/common.util";
import { API } from "./utils/api.util";
import Scraper from "./scraper";
import type { ProfileInfo } from "./types/profile-info.type.ts";
import { convertToTableArray, getDfProfilerIdByUrl, isDigits, isValidDfProfilerUrl, isValidProfileInput } from "./utils/profiler.util";
import { DFPROFILER } from "./utils/scraper.util";

const Datastore = require('@seald-io/nedb')
const db = new Datastore({ filename: 'db/users.db', autoload: true })

class Profiler {
    private readonly client: Client
    private readonly scraper: Scraper

    constructor(client: Client){
        this.client = client
        this.scraper = new Scraper()
    }

    async fetchProfile(int: any, text: any){
        const searchParams = new URLSearchParams()
        const profileName = text.trim().replace(/ /g,"_")
        searchParams.append("dataType", "json")
        searchParams.append("query", text)

        const postData = {
            body: searchParams,
            headers: {
                "X-Requested-With": "XMLHttpRequest"
            }
        }

        const { data, error }: any = await tryCatch(ky.post(`${API.SEARCH_PROFILE}/${profileName}`, postData).json())

        if (error){
            int.reply("There is an issue fetching from DFprofiler, please try again later.")
            return
        }
        if (!data || !data?.length){
            int.reply("No profile with this name found.")
            return
        }

        const formattedDate = getDateTime()

        await int.deferReply()

        const profileInfo: ProfileInfo | null = await this.scraper.getProfile(data[0].player_id)

        if (!profileInfo){
          int.editReply("There is an issue fetching from DFprofiler, please try again later.")
          return
        }

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
            .setFooter({ text: `${formattedDate}` })

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
            int.reply("Can't get top clan weekly loot.")
            return
        }

        console.log("check weekly data", data)

        const formattedDate = getDateTime()

        const tableData = new Array(["No.", "Clan", "Record"]).concat(data)
        const textTable = table(tableData, { drawHorizontalLine: (lineIndex, rowCount) => {
          return lineIndex === 0 || lineIndex === 1 || lineIndex === rowCount;
        } })
        const extraEmbed = "```" + textTable + "```"

        const embed = new EmbedBuilder()
            .setTitle("Weekly Clan Top Looter")
            .setDescription(extraEmbed)
            .setColor("#00b0f4")
            .setFooter({ text: `${formattedDate}` })

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
          int.editReply("Can't get any clan loot data")
          return
      }

      const formattedDate = getDateTime()

      const additionalData = convertToTableArray(data)
      const tableData = new Array(["Name", "Rank", "Weekly Loot"]).concat(additionalData)
      const textTable = table(tableData, { drawHorizontalLine: (lineIndex, rowCount) => {
        return lineIndex === 0 || lineIndex === 1 || lineIndex === rowCount;
      } })
      const extraEmbed = "```" + textTable + "```"

      const embed = new EmbedBuilder()
          .setTitle("Weekly Clan Top Looter")
          .setDescription(extraEmbed)
          .setColor("#00b0f4")
          .setFooter({ text: `${formattedDate}` })

      return await int.editReply({ embeds: [embed] })
    }

    async fetchClanWeeklyLoot(int: any){
      await int.deferReply()

      const { data, error }: any = await tryCatch(this.scraper.getCompetingClanMemberWeeklyLoot())

      if (error){
        int.editReply("There is an issue fetching from DFprofiler, please try again later.")
        return
      }
      if (!data || !data?.length){
        int.editReply("Can't get any clan loot data")
        return
      }

      const formattedDate = getDateTime()

      const additionalData = convertToTableArray(data)
      const tableData = new Array(["Name", "Rank", "Clan Weekly Loot"]).concat(additionalData)
      const textTable = table(tableData, { drawHorizontalLine: (lineIndex, rowCount) => {
        return lineIndex === 0 || lineIndex === 1 || lineIndex === rowCount;
      } })
      const extraEmbed = "```" + textTable + "```"

      const embed = new EmbedBuilder()
          .setTitle("Weekly Clan Top Looter")
          .setDescription(extraEmbed)
          .setColor("#00b0f4")
          .setFooter({ text: `${formattedDate}` })

      return await int.editReply({ embeds: [embed] })
    }

    async setProfile(int: any, text: string){
      // const nickName = int.member.nickname;
      // const userName = int.user.username;
      if (!isValidProfileInput(text)){
        return await int.reply("It has to be either dfprofiler url or an id in digits.")
      }

      if (isValidDfProfilerUrl(text)){
        return await this.setByUrl(int, text)
      }
      if (isDigits(text)){
        return await this.setById(int, text)
      }

      return await int.reply("You somehow bypassed all the checks. Need developer to check.")
    }

    async setByUrl(int: any, text: string){
      const userId = int.user.id;
      const { data, error } = await tryCatch(ky.get(text).text())

      if (error){
        await int.reply("This DFProfiler URL is not valid. Try again.")
        return
      }

      const id = getDfProfilerIdByUrl(text)

      const doc = { user_id: userId, profiler_id: id }
      
      const insertResponse = await tryCatch(db.updateAsync(doc, { upsert: true }))
      if (insertResponse.error){
        console.log("There's a problem inserting into DB")
        return
      }

      await int.reply(`Created profile for <@${userId}>`);
    }

    async setById(int: any, text: string){
      const userId = int.user.id;
      const { data, error } = await tryCatch(ky.get(`${DFPROFILER.PROFILE_VIEW}/${text}`).text())

      if (error){
        await int.reply("This DFProfiler ID is not valid. Try again.")
        return
      }

      const doc = { user_id: userId, profiler_id: text }
      
      const insertResponse = await tryCatch(db.updateAsync(doc, { upsert: true }))
      if (insertResponse.error){
        console.log("There's a problem inserting into DB")
        return
      }

      await int.reply(`Created profile for <@${userId}>`);
    }

    async getSelfProfile(int: any){
      const userId = int.user.id;

      const user = await db.findOneAsync({ user_id: userId })

      if (!user){
        await int.reply("No profile set. Use /set <dfprofilerid> to use this command.")
        return
      }

      const formattedDate = getDateTime()

      await int.deferReply()

      const profileInfo: ProfileInfo | null = await this.scraper.getProfile(user.profiler_id)

      if (!profileInfo){
        int.editReply("There is an issue fetching from DFprofiler, please try again later.")
        return
      }

      const embed = new EmbedBuilder()
          .setTitle("Profile")
          .setDescription(`[DFProfiler Link](https://www.dfprofiler.com/profile/view/${user.profiler_id})\n**Name:** ${profileInfo.name}\n**Profession & Level:** ${profileInfo.profession_level}\n**Clan & Rank:** ${isBlank(profileInfo.clan) ? "None" : profileInfo.clan}\n\n**__Loot Records__**`)
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
          .setFooter({ text: `${formattedDate}` })

      return await int.editReply({ embeds: [embed] })
    }

    async getPlayerProfile(int: any, user: any){
      const selectedId = user.id

      const selectedUser = await db.findOneAsync({ user_id: selectedId })

      if (!selectedUser){
        await int.reply("No profile set for this user.")
        return
      }

      const formattedDate = getDateTime()

      await int.deferReply()

      const profileInfo: ProfileInfo | null = await this.scraper.getProfile(selectedUser.profiler_id)

      if (!profileInfo){
        int.editReply("There is an issue fetching from DFprofiler, please try again later.")
        return
      }

      const embed = new EmbedBuilder()
          .setTitle("Profile")
          .setDescription(`[DFProfiler Link](https://www.dfprofiler.com/profile/view/${selectedUser.profiler_id})\n**Name:** ${profileInfo.name}\n**Profession & Level:** ${profileInfo.profession_level}\n**Clan & Rank:** ${isBlank(profileInfo.clan) ? "None" : profileInfo.clan}\n\n**__Loot Records__**`)
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
          .setFooter({ text: `${formattedDate}` })

      return await int.editReply({ embeds: [embed] })
    }
}

export default Profiler
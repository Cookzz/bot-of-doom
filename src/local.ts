import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { getDateTime, isBlank, paginateArray, tryCatch } from "./utils/common.util";
import { isDigits } from "./utils/profiler.util";
import type { Challenge } from "./types/challenge.type";
import type { ChallengeArchive } from "./types/challenge-archive.type";
import { getChallengeStatus, getCompletedByLabel, parseChallenges } from "./utils/challenge.util";
import { getChallengeArchive, getChallenges, setChallengeClaim, setChallenges } from "./utils/db.util";

/*
  Used for anything that is to be processed locally
  (meaning that there is no dependency on external factors like dfprofiler or running a job)
*/
class Local {
    /*
      Parse & process the pasted clan challenge page text, save the compiled list and
      show it as an embed. A partial parse still saves what parsed and reports
      the leftover fragments instead of failing silently
    */
    async addChallenges(int: any, text: any) {
        await int.deferReply()

        if (isBlank(text)){
            int.editReply("No text provided. Paste the text copied from the clan challenge page.")
            return
        }

        const { challenges, unmatched } = parseChallenges(text)

        if (!challenges.length){
            const fragments = unmatched.join("\n")
            int.editReply(`Could not find any challenges in the pasted text. ⚠️\n\n\`\`\`${fragments.slice(0, 1000)}\`\`\``)
            return
        }

        const { saved, archived } = await setChallenges(challenges)
        if (!saved){
            int.editReply("Parsed the challenges but there is a problem saving to the database, please try again later.")
            return
        }

        const formattedDate = getDateTime()

        const challengeList = challenges.map(challenge => {
            return `• **${challenge.name}** — ${getChallengeStatus(challenge)} — ends ${challenge.ends}`
        }).join("\n")

        const embed = new EmbedBuilder()
            .setTitle(`Clan Challenges (${challenges.length} saved)`)
            .setDescription(challengeList)
            .setColor("#00b0f4")
            .setFooter({ text: `${formattedDate}` })

        if (archived){
            embed.addFields({
                name: "🗄️ Previous week archived",
                value: "The expired list was stored for tracking. Review it with /oldchallenge."
            })
        }

        if (unmatched.length){
            // embed field values cap at 1024 chars, stay under it
            embed.addFields({
                name: "⚠️ Skipped fragments",
                value: unmatched.join("\n").slice(0, 1000)
            })
        }

        return await int.editReply({ embeds: [embed] })
    }

    // Show full list of challenges uploaded by admin with /showchallenges
    async getChallengeList(int: any) {
        await int.deferReply()

        const { data, error }: any = await tryCatch(getChallenges())

        if (error){
            int.editReply("There is an issue fetching the challenges, please try again later.")
            return
        }
        if (!data || !data?.length){
            int.editReply("No challenges available for now.")
            return
        }

        const formattedDate = getDateTime()

        // we do one field for challenge, because ascii table just breaks everything
        const chunkSize = 25
        const chunks: Challenge[][] = []
        for (let i = 0; i < data.length; i += chunkSize){
            const chunk = data.slice(i, i + chunkSize)
            if (chunk){
                chunks.push(chunk)
            }
        }

        const embeds: EmbedBuilder[] = chunks.map((chunk, chunkIndex) => {
            const embed = new EmbedBuilder()
                .setColor("#00b0f4")

            if (chunkIndex === 0){
                embed.setTitle(`Clan Challenges (${data.length})`)
            }

            for (let i = 0; i < chunk.length; i++){
                const challenge = chunk[i]
                if (!challenge){
                    continue
                }

                const index = (chunkIndex * chunkSize) + i
                embed.addFields({
                    name: `${index + 1}. ${challenge.name}`,
                    value: `${getChallengeStatus(challenge)} • Ends: ${challenge.ends} • Completed by: ${getCompletedByLabel(challenge)}`
                })
            }

            if (chunkIndex === chunks.length - 1){
                embed.setFooter({ text: `${formattedDate}` })
            }

            return embed
        })

        return await int.editReply({ embeds: embeds })
    }

    /*
      When completing challenges with /completechallenge <no>, we allow user to complete it to
      an unassigned challenge & unassign themselves from challenges that they were originally part of.
      We only allow overrides to admins.
    */
    async completeChallenge(int: any, text: any) {
        const challenges = await getChallenges()

        if (!challenges || !challenges.length){
            int.reply("No challenges set. Use /addchallenge to compile them first.")
            return
        }

        if (!isDigits(text) || parseInt(text) === 0){
            int.reply("Provide a valid challenge number from /checkchallenge.")
            return
        }

        const challengeNumber = parseInt(text)
        if (challengeNumber > challenges.length){
            int.reply(`Invalid challenge number, the current list only has ${challenges.length} challenges.`)
            return
        }

        const index = challengeNumber - 1
        const target = challenges[index]
        if (!target){
            int.reply("Invalid challenge number from /checkchallenge.")
            return
        }
        const userId = int.user.id
        const isAdmin = int.member?.permissions?.has(PermissionFlagsBits.Administrator)

        // allow user to toggle complete/uncomplete their only challenges
        if (target.completed_by === userId){
            const unmarked = await setChallengeClaim(index, null)
            if (!unmarked){
                int.reply("There is a problem saving to the database, please try again later.")
                return
            }

            int.reply(`Removed your completion from challenge: **${target.name}**`)
            return
        }

        if (target.completed_by && !isAdmin){
            int.reply(`**${target.name}** was already marked as completed by <@${target.completed_by}>. Only an admin can change it.`)
            return
        }

        const marked = await setChallengeClaim(index, userId)
        if (!marked){
            int.reply("There is a problem saving to the database, please try again later.")
            return
        }

        if (target.completed_by && isAdmin){
            int.reply(`Overrode completion of **${target.name}**, now completed by <@${userId}>`)
            return
        }

        int.reply(`Marked **${target.name}** as complete ✅ (completed by <@${userId}>)`)
    }

    /* Let user review last 3 weeks of records per page. Limiting this to admin only for us to just go through who's done what */
    async getChallengeArchiveList(int: any, text: any) {
        await int.deferReply()

        const { data, error }: any = await tryCatch(getChallengeArchive())

        if (error){
            int.editReply("There is an issue fetching the challenge archive, please try again later.")
            return
        }
        if (!data || !data?.length){
            int.editReply("No challenges are archived yet. A week's list gets stored after it expires and a new one comes in via /addchallenge.")
            return
        }

        const pages = paginateArray(data, 3)
        const currentPage = isDigits(text) && parseInt(text) > 0 ? parseInt(text) : 1

        if (currentPage > pages.length){
            int.editReply(`Page number exceeded, there ${pages.length === 1 ? "is" : "are"} only ${pages.length} page(s) of archived challenges.`)
            return
        }

        const records = pages[currentPage - 1] ?? []

        const embeds = records.map((record: ChallengeArchive) => {
            const recordList = record.challenges.map((challenge: Challenge) => {
                return `• **${challenge.name}** — ${getChallengeStatus(challenge)} — ends ${challenge.ends} — completed by: ${getCompletedByLabel(challenge)}`
            }).join("\n")

            return new EmbedBuilder()
                .setTitle(`Week ${record.week}: ${record.from_date} - ${record.to_date}`)
                .setDescription(recordList)
                .setColor("#00b0f4")
                .setFooter({ text: `archived ${record.archived_at} - page ${currentPage}/${pages.length}` })
        })

        return await int.editReply({ embeds: embeds })
    }
}

export default Local

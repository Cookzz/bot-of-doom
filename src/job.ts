import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, TextChannel, User, type CacheType, type Client } from "discord.js";
import nodeCron from "node-cron";
import { ANNOUNCEMENT_CHANNEL_ID, REPORT_CHANNEL_ID, VOTE_ANNOUNCEMENT_WITH_DATE } from "./constant";
import { getUpcomingWeek, tryCatch } from "./utils/common.util";
import { createVoteCollector, getVoteCollection, removeVoteCollector } from "./utils/db.util";
import type { Vote } from "./types/vote-collection.type";

/* Used to automate and schedule messages */
class Job {
    private readonly client: Client

    constructor(client: Client){
        this.client = client
    }

    executeJob(){
        nodeCron.schedule('0 11 * * 4', () => {
            this.weeklyCtlVoting()
        }, { timezone: 'UTC' });

        nodeCron.schedule('*/5 * * * *', () => {
            this.checkVote()
        });

        this.weeklyReminder()

        // only uncomment this for testing purposes
        // this.weeklyCtlVoting()
    }

    /* Send announcement when weekly reset is here. Temporarily unused */
    weeklyReminder(){
        nodeCron.schedule('0 11 * * 1', async () => {
            const channel = await this.getChannel(ANNOUNCEMENT_CHANNEL_ID)
            if (!channel) return

            await channel.send("@everyone Weekly reset is here - 11am UTC, 7pm GMT+8")
        }, { timezone: 'UTC' });
    }

    /* Fetch channel from cache */
    private async getChannel(channelId: string): Promise<TextChannel | null> {
        const { data, error } = await tryCatch(this.client.channels.fetch(channelId))

        if (error || !data) {
            console.error(`Channel ${channelId} not found or not accessible. Did the ID change, or is the bot missing access?`, error)
            return null
        }

        if (!data.isTextBased() || !(data instanceof TextChannel)) {
            console.error(`Channel ${channelId} is not a text channel.`)
            return null
        }

        return data
    }

    async checkVote() {
      const votes = await getVoteCollection()

      // we will automatically assume its an invalid check
      if (!votes) {
         return
      }

      // check if theres an "expired"/finished
      const voteToProcess = votes.filter((vote: Vote) => new Date() > new Date(vote.expiry_date))
      if (!voteToProcess.length) {
        console.log("No vote has expired yet for collection.")
        return
      }

      for (const vote of voteToProcess) {
        const { error } = await tryCatch(this.processVotes(vote))
        if (error) console.error("Failed processing vote", vote.message_id, error)
      }
    }

    /* Send weekly votes before weekly resets. If the await async fails, just let it be until the next manual trigger */
    async weeklyCtlVoting(int?: ChatInputCommandInteraction<CacheType>){
        const channel = <TextChannel>this.client.channels.cache.get(ANNOUNCEMENT_CHANNEL_ID)
        const reportChannel = <TextChannel>this.client.channels.cache.get(REPORT_CHANNEL_ID)

        const { nextWeek, weekAfterNext } = getUpcomingWeek()

        const message = await channel.send(VOTE_ANNOUNCEMENT_WITH_DATE(nextWeek, weekAfterNext))
        await message.react('✅')
        await message.react('❌')

        const expiryDate = new Date(Date.now() + 259200000).toISOString()

        const { error } = await tryCatch(createVoteCollector(message.id, expiryDate))
        if (error) {
            await reportChannel.send(`Vote collection failed to trigger, please manually trigger again. Reason: ${error}`)
        }
        if (int) {
          await int.reply({ content: "Announcement sent. ", flags: MessageFlags.Ephemeral })
        }
    }

  async processVotes(vote: Vote){
      const channel = <TextChannel>this.client.channels.cache.get(ANNOUNCEMENT_CHANNEL_ID)
      const reportChannel = <TextChannel>this.client.channels.cache.get(REPORT_CHANNEL_ID)
      const message = await channel.messages.fetch(vote.message_id)

      const participantItems = message.reactions.resolve('✅') ?? null
      const participantUserManager = participantItems?.users

      const nonParticipantItems = message.reactions.resolve('❌') ?? null
      const nonParticipantUserManager = nonParticipantItems?.users

      let participants: string = ""
      let nonParticipants: string = ""

      if (participantUserManager){
          const userList: Map<string, User> = await participantUserManager.fetch()
          const users = userList.values().filter((user: User) => !user.bot)
          users.forEach((v)=>{
              participants += `${v.username}\n`
          })
      }
      if (nonParticipantUserManager){
          const userList: Map<string, User> = await nonParticipantUserManager.fetch()
          const users = userList.values().filter((user: User) => !user.bot)
          users.forEach((v)=>{
              nonParticipants += `${v.username}\n`
          })
      }

      if (!participants) {
        participants = "None"
      }
      if (nonParticipants) {
        nonParticipants = "None"
      }

      const { nextWeek, weekAfterNext } = getUpcomingWeek()

      const embed = new EmbedBuilder()
          .setTitle("CTL Participants")
          .setDescription(`For ${nextWeek} - ${weekAfterNext}`)
          .addFields(
                  {
                      name: "Participants",
                      value: participants
                  },
                  {
                      name: "Non-Participants",
                      value: nonParticipants
                  }
          )

    await reportChannel.send({ embeds: [embed] })

    // since the vote has been fully processed, we now wipe it out
    return await removeVoteCollector(vote.message_id)
  }
}

export default Job

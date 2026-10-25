import { EmbedBuilder, TextChannel, User, type Client } from "discord.js";
import nodeCron from "node-cron";
import { ANNOUNCEMENT_CHANNEL_ID, REPORT_CHANNEL_ID, VOTE_ANNOUNCEMENT_WITH_DATE } from "./constant";
import { getUpcomingWeek } from "./utils/common.util";
import { createVoteCollector, getVoteCollection, removeVoteCollector } from "./utils/db.util";
import type { Vote } from "./types/vote-collection.type";

/* Used to automate and schedule messages */
class Job {
    private readonly client: Client

    constructor(client: Client){
        this.client = client
    }

    executeJob(){
        nodeCron.schedule('0 18 * * 4', () => {
            this.weeklyCtlVoting()
        });

        nodeCron.schedule('*/5 * * * *', () => {
          this.checkVote()
        });

        this.weeklyReminder()

        // only uncomment this for testing purposes
        // this.weeklyCtlVoting()
    }

    /* Send announcement when weekly reset is here. Temporarily unused */
    weeklyReminder(){
      const channel = <TextChannel>this.client.channels.cache.get(ANNOUNCEMENT_CHANNEL_ID)

        nodeCron.schedule('0 19 * * 1', () => {
            channel.send("@everyone Weekly reset is here - 11am UTC, 7pm GMT+8")
        });
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

      voteToProcess.forEach(async(vote: Vote) => {
        await this.processVotes(vote)
      })
    }

    /* Send weekly votes before weekly resets */
    async weeklyCtlVoting(){
        const channel = <TextChannel>this.client.channels.cache.get(ANNOUNCEMENT_CHANNEL_ID)

        const { nextWeek, weekAfterNext } = getUpcomingWeek()

        const message = await channel.send(VOTE_ANNOUNCEMENT_WITH_DATE(nextWeek, weekAfterNext))

        message.react('✅').then(() => message.react('❌'));

        const expiryDate = new Date(Date.now() + 259200000).toISOString()

        createVoteCollector(message.id, expiryDate)
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

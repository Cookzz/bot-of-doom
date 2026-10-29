import type { ChallengeArchive } from "../types/challenge-archive.type";
import type { Challenge } from "../types/challenge.type";
import type { Vote } from "../types/vote-collection.type";
import { getDateTime, tryCatch } from "./common.util";
import { getLatestDeadline, getWeekStartDate } from "./challenge.util";

const Datastore = require('@seald-io/nedb')
const voteDb = new Datastore({ filename: 'db/votesMain.db', autoload: true })
const challengesDb = new Datastore({ filename: 'db/challenges.db', autoload: true })
const challengesArchiveDb = new Datastore({ filename: 'db/challengesArchive.db', autoload: true })

export const createVoteCollector = async(messageId: string, expiryDate: string): Promise<void> => {
  const doc: Vote = { message_id: messageId, expiry_date: expiryDate }

  const { error } = await tryCatch(voteDb.updateAsync({ message_id: messageId }, doc, { upsert: true }))
  if (error){
    console.log("There's a problem inserting into DB")
    return
  }

  //make sure no duplicate exists during updates
  await voteDb.compactDatafileAsync()
}

export const removeVoteCollector = async (messageId: string): Promise<void> => {
  const { error } = await tryCatch(voteDb.removeAsync({ message_id: messageId }, {}))
  if (error){
    console.log("There's a problem removing from DB")
    return
  }

  //make sure no duplicate exists during updates
  await voteDb.compactDatafileAsync()
}

export const getVoteCollection = async(): Promise<Vote[] | null> => {
  const { data, error }: any = await tryCatch(voteDb.findAsync({}))

  if (error){
    console.log("There's a problem fetching from DB")
    return null
  }
  if (!data) {
    console.log("No votes exist")
    return null
  }

  return data
}

/*
  By default, we add challenges from the provided text from user.
  We allow overrides if a new list is provided before the deadline.
  Archives are only done when we set new challenges AFTER the deadline.
  This way in case of mistakes (like adding incomplete list of challenges or copied wrong set), we have the chance to fix it
*/
export const setChallenges = async(challenges: Challenge[]): Promise<{ saved: boolean, archived: boolean }> => {
  const { data: previous, error: fetchError }: any = await tryCatch(challengesDb.findAsync({}).sort({ position: 1 }).execAsync())

  if (fetchError){
    console.log("There's a problem fetching the current challenges from DB")
    return { saved: false, archived: false }
  }

  let archived = false

  if (previous?.length){
    const latestDeadline = getLatestDeadline(previous)

    if (latestDeadline && latestDeadline.date.getTime() < Date.now()){
      // we get the latest archival data from newest to oldest
      const { data: latestArchive, error: archiveError }: any = await tryCatch(
        challengesArchiveDb.findAsync({}).sort({ week: -1 }).limit(1).execAsync()
      )

      if (archiveError){
        console.log("There's a problem fetching the challenge archive from DB")
        return { saved: false, archived: false }
      }

      const record: ChallengeArchive = {
        week: (latestArchive?.[0]?.week ?? 0) + 1,
        from_date: getDateTime(getWeekStartDate(latestDeadline.date), true), //based on the actual deadline, just get first day of the week
        to_date: getDateTime(latestDeadline.date, true), //then just format the actual deadline
        archived_at: getDateTime(),
        challenges: previous.map((doc: any) => ({
          name: doc.name,
          ends: doc.ends,
          complete: doc.complete,
          completed_by: doc.completed_by ?? null,
          completed_on: doc.completed_on ?? null
        }))
      }

      const { error: insertArchiveError } = await tryCatch(challengesArchiveDb.insertAsync(record))
      if (insertArchiveError){
        console.log("There's a problem archiving the expired challenges in DB")
        return { saved: false, archived: false }
      }

      //make sure no duplicate exists during updates
      await challengesArchiveDb.compactDatafileAsync()

      archived = true
    }
  }

  const { error: removeError } = await tryCatch(challengesDb.removeAsync({}, { multi: true }))
  if (removeError){
    console.log("There's a problem removing existing challenges from DB")
    return { saved: false, archived: archived }
  }

  /* position keeps the pasted order intact so the list reads back the same way */
  const docs = challenges.map((challenge, position) => ({ ...challenge, position }))

  const { error: insertError } = await tryCatch(challengesDb.insertAsync(docs))
  if (insertError){
    console.log("There's a problem inserting into DB")
    return { saved: false, archived: archived }
  }

  //make sure no duplicate exists during updates
  await challengesDb.compactDatafileAsync()

  return { saved: true, archived: archived }
}

// handles the challenge toggles and timestamping
export const setChallengeClaim = async(index: number, userId: string | null): Promise<boolean> => {
  const doc = userId !== null
    ? { completed_by: userId, completed_on: getDateTime() }
    : { completed_by: null, completed_on: null }

  const { error } = await tryCatch(challengesDb.updateAsync({ position: index }, { $set: doc }, {}))
  if (error){
    console.log("There's a problem claiming the challenge in DB")
    return false
  }

  return true
}

export const getChallenges = async(): Promise<Challenge[] | null> => {
  const { data, error }: any = await tryCatch(challengesDb.findAsync({}).sort({ position: 1 }).execAsync())

  if (error){
    console.log("There's a problem fetching from DB")
    return null
  }
  if (!data || !data?.length) {
    console.log("No challenges exist")
    return null
  }

  return data
}

// past weeks' challenges, newest week first
export const getChallengeArchive = async(): Promise<ChallengeArchive[] | null> => {
  const { data, error }: any = await tryCatch(challengesArchiveDb.findAsync({}).sort({ week: -1 }).execAsync())

  if (error){
    console.log("There's a problem fetching the challenge archive from DB")
    return null
  }
  if (!data || !data?.length) {
    console.log("No challenges are archived yet")
    return null
  }

  return data
}

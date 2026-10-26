import type { Vote, Voter } from "../types/vote-collection.type";
import { tryCatch } from "./common.util";

const Datastore = require('@seald-io/nedb')
const voteDb = new Datastore({ filename: 'db/votesMain.db', autoload: true })

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

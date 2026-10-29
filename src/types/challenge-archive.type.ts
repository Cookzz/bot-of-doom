import type { Challenge } from "./challenge.type";

export interface ChallengeArchive {
  week: number,
  from_date: string,
  to_date: string,
  archived_at: string,
  challenges: Challenge[]
}

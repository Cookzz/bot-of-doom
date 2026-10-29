export interface Challenge {
  name: string,
  ends: string,
  complete: boolean,
  completed_by?: string | null
}

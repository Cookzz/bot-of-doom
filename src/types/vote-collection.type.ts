export interface Vote {
  message_id: string,
  expiry_date: string
}

export interface Voter {
  message_id: string,
  user_id: string,
  username: string,
  participate: boolean
}

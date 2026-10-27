export type BossCell = {
  x: number
  y: number
}

export type BossLetter = {
  x: number
  y: number
  letter: string
  title: string
}

export type BossEvent = {
  event_id?: string
  game_id?: string
  isoa?: string
  locations: string[][]
  started?: string
  ended?: string
  reward_cash?: string
  reward_exp?: string
  need_briefing?: string
  title?: string
  briefing?: string
  special_enemy_type?: string
  special_enemy_amount?: string
  boss_num?: string
  event_type?: string
  start_time?: string
  end_time?: string
}

export type BossmapBundle = {
  bounds: { minX: number; maxX: number; minY: number; maxY: number }
  cells: BossCell[]
  letters: BossLetter[]
  terrains: Map<string, string>
  events: BossEvent[]
  servertime: number
  outpostsAttacked: boolean
}

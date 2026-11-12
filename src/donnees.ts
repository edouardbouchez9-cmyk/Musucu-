import { Depot } from './db/depot'
import { BaseMuscu } from './db/schema'

export const depot = new Depot(new BaseMuscu())

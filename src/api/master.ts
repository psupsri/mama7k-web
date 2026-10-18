import type { MasterData } from '../types/domain'
import { http } from './client'

/** Every master item, including inactive ones (needed to render old builds). */
export const getMasterData = () => http.get<MasterData>('/master')

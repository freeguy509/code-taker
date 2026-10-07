import type { Player } from '../types'
import type { PKStatus, Title } from '../types/royalty'
import { ROYALTY_LEVELS } from '../types/royalty'

export class PKSystem {
  initializePKStatus(player: Player, title: Title = 'Commoner'): PKStatus {
    return {
      isPK: true,
      pkKills: 0,
      pkDeaths: 0,
      bountyActive: false,
      bountyAmount: 0,
      bountyBy: '',
      bountyReason: '',
      isWanted: false,
      lastPKTime: 0,
      pardonedAt: null,
      title: title,
      faction: 'none',
    }
  }

  togglePK(player: Player): boolean {
    if (!player.pkStatus) {
      player.pkStatus = this.initializePKStatus(player)
    }
    player.pkStatus.isPK = !player.pkStatus.isPK
    return player.pkStatus.isPK
  }

  promoteToTitle(player: Player, title: Title): boolean {
    if (!player.pkStatus) {
      player.pkStatus = this.initializePKStatus(player, title)
      return true
    }
    player.pkStatus.title = title
    return true
  }

  getKDRatio(player: Player): string {
    if (!player.pkStatus) return '0/0'
    const kills = player.pkStatus.pkKills
    const deaths = player.pkStatus.pkDeaths || 1
    const ratio = (kills / deaths).toFixed(2)
    return `${kills}/${player.pkStatus.pkDeaths} (${ratio})`
  }

  getPKInfo(player: Player): string {
    if (!player.pkStatus) return 'PK Status: Inactive'

    const status = player.pkStatus.isPK ? 'ACTIVE' : 'INACTIVE'
    const title = player.pkStatus.title
    const kdr = this.getKDRatio(player)
    const wanted = player.pkStatus.isWanted ? ' [WANTED]' : ''

    return `PK: ${status} | Title: ${title} | KDR: ${kdr}${wanted}`
  }

  canKill(attacker: Player, defender: Player): { allowed: boolean; reason: string } {
    if (!attacker.pkStatus?.isPK) return { allowed: false, reason: 'PK mode is off.' }
    if (attacker.id === defender.id) return { allowed: false, reason: 'Cannot PK yourself.' }
    if (defender.pkStatus?.pardonedAt && Date.now() - defender.pkStatus.pardonedAt < 24 * 60 * 60 * 1000) {
      return { allowed: false, reason: 'This player was recently pardoned and has immunity.' }
    }
    return { allowed: true, reason: 'Combat allowed.' }
  }

  shouldBecomeWanted(player: Player): boolean {
    if (!player.pkStatus) return false
    if (player.pkStatus.title === 'King' || player.pkStatus.title === 'Enforcer') return false

    const level = ROYALTY_LEVELS[player.pkStatus.title]
    if (!level) return false

    const maxKills = level.maxPKKills
    return player.pkStatus.pkKills > maxKills
  }

  getReputationLevel(player: Player): string {
    if (!player.pkStatus) return 'Unknown'

    const kills = player.pkStatus.pkKills
    if (kills === 0) return 'Innocent'
    if (kills < 5) return 'Suspicious'
    if (kills < 10) return 'Dangerous'
    if (kills < 20) return 'Notorious'
    if (kills < 50) return 'Infamous'
    return 'Legend'
  }
}

// UI Components for PK and Royalty System
// Add to src/screens/GameScreen.ts or create new HUD module

export class PKHud {
  static renderPlayerStatus(player: any, container: HTMLElement): void {
    const pkInfo = player.pkStatus
    if (!pkInfo) return

    const status = pkInfo.isPK ? '🔴 PK ON' : '🟢 PK OFF'
    const title = pkInfo.title || 'Commoner'
    const kdr = `${pkInfo.pkKills}/${pkInfo.pkDeaths || 0}`
    const wanted = pkInfo.isWanted ? ' [WANTED]' : ''
    const bounty = pkInfo.bountyActive ? `⚠️ ${pkInfo.bountyAmount}G BOUNTY` : ''

    container.innerHTML = `
      <div class="pk-status">
        <div class="pk-toggle">${status}</div>
        <div class="title">Title: ${title}</div>
        <div class="kdr">Kills/Deaths: ${kdr}</div>
        ${wanted ? `<div class="wanted">${wanted}</div>` : ''}
        ${bounty ? `<div class="bounty">${bounty}</div>` : ''}
      </div>
    `
  }

  static renderNPCList(npcs: any[], container: HTMLElement): void {
    const html = npcs
      .map(
        (npc) =>
          `<div class="npc-card">
        <div class="npc-name">${npc.name}</div>
        <div class="npc-role">${npc.role} (${npc.title})</div>
        <div class="npc-region">${npc.region}</div>
        ${npc.bounties > 0 ? `<div class="npc-bounties">🎯 ${npc.bounties} bounties</div>` : ''}
      </div>`
      )
      .join('')

    container.innerHTML = `<div class="npc-list">${html}</div>`
  }

  static renderBountyBoard(bounties: any[], container: HTMLElement): void {
    const html = bounties
      .map(
        (b) =>
          `<div class="bounty-item">
        <div class="bounty-target">${b.targetId} - ${b.amount}G</div>
        <div class="bounty-reason">${b.reason}</div>
        <div class="bounty-info">By: ${b.by} | Expires: ${b.expiresIn}</div>
      </div>`
      )
      .join('')

    container.innerHTML = `<div class="bounty-board">${html}</div>`
  }
}

// CSS to add to styles.css
const ROYALTY_CSS = `
.pk-status {
  background: rgba(255, 100, 100, 0.1);
  border: 1px solid rgba(255, 100, 100, 0.5);
  border-radius: 8px;
  padding: 12px;
  margin: 10px 0;
  font-size: 12px;
}

.pk-toggle {
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 6px;
}

.title, .kdr {
  color: #bfd0ff;
  margin: 2px 0;
}

.wanted {
  color: #ff6b6b;
  font-weight: bold;
  animation: pulse 1s infinite;
}

.bounty {
  color: #ffd166;
  font-weight: bold;
}

.npc-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  margin: 10px 0;
}

.npc-card {
  background: rgba(100, 150, 255, 0.1);
  border: 1px solid rgba(100, 150, 255, 0.3);
  border-radius: 8px;
  padding: 10px;
  font-size: 11px;
}

.npc-name {
  font-weight: bold;
  color: #7bb7ff;
  margin-bottom: 4px;
}

.npc-role {
  color: #d2a5ff;
}

.npc-region {
  color: #bfd0ff;
  font-size: 10px;
}

.npc-bounties {
  color: #ff9b54;
  margin-top: 4px;
}

.bounty-board {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 215, 100, 0.3);
  border-radius: 8px;
  padding: 12px;
  margin: 10px 0;
}

.bounty-item {
  background: rgba(0, 0, 0, 0.2);
  padding: 10px;
  margin: 8px 0;
  border-left: 3px solid #ff6b6b;
  border-radius: 4px;
}

.bounty-target {
  font-weight: bold;
  color: #ff6b6b;
  margin-bottom: 4px;
}

.bounty-reason {
  color: #bfd0ff;
  font-size: 12px;
  margin-bottom: 4px;
}

.bounty-info {
  color: #717182;
  font-size: 10px;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
`

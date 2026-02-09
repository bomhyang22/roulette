import { RenderParameters } from './rouletteRenderer';
import { MouseEventArgs, UIObject } from './UIObject';
import { bound } from './utils/bound.decorator';
import { Rect } from './types/rect.type';
import { Marble } from './marble';

interface TeamData {
  name: string;
  members: string[];
  scores: { [member: string]: number };
}

export class RankRenderer implements UIObject {
  private _currentY = 0;
  private _targetY = 0;
  private fontHeight = 16;
  private _userMoved = 0;
  private _currentWinner = -1;
  private maxY = 0;
  private winners: Marble[] = [];
  private marbles: Marble[] = [];
  private winnerRank: number = -1;
  private messageHandler?: (msg: string) => void;
  private teams: TeamData[] = [];

  constructor() {
  }

  setTeams(teams: TeamData[]) {
    this.teams = teams;
  }

  @bound
  onWheel(e: WheelEvent) {
    this._targetY += e.deltaY;
    if (this._targetY > this.maxY) {
      this._targetY = this.maxY;
    }
    this._userMoved = 2000;
  }

  @bound
  onDblClick(e?: MouseEventArgs) {
    if (e) {
      if (navigator.clipboard) {
        const tsv: string[] = [];
        let rank = 0;
        tsv.push(...[...this.winners, ...this.marbles].map((m) => {
          rank++;
          return [rank.toString(), m.name, rank - 1 === this.winnerRank ? '☆' : ''].join('\t');
        }));

        tsv.unshift(['Rank', 'Name', 'Winner'].join('\t'));

        navigator.clipboard.writeText(tsv.join('\n')).then(() => {
          if (this.messageHandler) {
            this.messageHandler('The result has been copied');
          }
        });
      }
    }
  }

  onMessage(func: (msg: string) => void) {
    this.messageHandler = func;
  }

  render(
    ctx: CanvasRenderingContext2D,
    { winners, marbles, winnerRank, theme }: RenderParameters,
    width: number,
    height: number,
  ) {
    const startX = width - 5;
    const startY = Math.max(-this.fontHeight, this._currentY - height / 2);
    this.maxY = Math.max(
      0,
      (marbles.length + winners.length) * this.fontHeight + this.fontHeight,
    );
    this._currentWinner = winners.length;

    this.winners = winners;
    this.marbles = marbles;
    this.winnerRank = winnerRank;

    ctx.save();
    ctx.textAlign = 'right';
    ctx.font = '10pt sans-serif';
    ctx.fillStyle = '#666';
    ctx.fillText(`${winners.length} / ${winners.length + marbles.length}`, width - 5, this.fontHeight);

    ctx.beginPath();
    ctx.rect(width - 150, this.fontHeight + 2, width, this.maxY);
    ctx.clip();

    ctx.translate(0, -startY);
    ctx.font = 'bold 11pt sans-serif';
    if (theme.rankStroke) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = theme.rankStroke;
    }
    winners.forEach((marble: { hue: number, name: string }, rank: number) => {
      const y = rank * this.fontHeight;
      if (y >= startY && y <= startY + ctx.canvas.height) {
        ctx.fillStyle = `hsl(${marble.hue} 100% ${theme.marbleLightness}`;
        ctx.strokeText(
          `${rank === winnerRank ? '☆' : '\u2714'} ${marble.name} #${rank + 1}`,
          startX,
          20 + y,
        );
        ctx.fillText(
          `${rank === winnerRank ? '☆' : '\u2714'} ${marble.name} #${rank + 1}`,
          startX,
          20 + y,
        );
      }
    });
    ctx.font = '10pt sans-serif';
    marbles.forEach((marble: { hue: number; name: string }, rank: number) => {
      const y = (rank + winners.length) * this.fontHeight;
      if (y >= startY && y <= startY + ctx.canvas.height) {
        ctx.fillStyle = `hsl(${marble.hue} 100% ${theme.marbleLightness}`;
        ctx.strokeText(
          `${marble.name} #${rank + 1 + winners.length}`,
          startX,
          20 + y,
        );
        ctx.fillText(
          `${marble.name} #${rank + 1 + winners.length}`,
          startX,
          20 + y,
        );
      }
    });
    ctx.restore();

    // 팀 순위 표시 (개인 순위표 아래에)
    this.renderTeamStats(ctx, width, height);
  }

  private renderTeamStats(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ) {
    if (this.teams.length === 0) return;

    const startX = width - 5;
    const lineHeight = 18;
    const boxWidth = 155;
    const boxX = width - boxWidth - 5;
    
    // 팀별 평균 점수 계산
    const teamStats = this.teams.filter(t => t.members.length > 0).map(team => {
      const memberScores = team.members.map(m => team.scores[m] || 0);
      const totalScore = memberScores.reduce((a, b) => a + b, 0);
      const avgScore = team.members.length > 0 ? totalScore / team.members.length : 0;
      return { name: team.name, avgScore };
    });
    teamStats.sort((a, b) => b.avgScore - a.avgScore);

    // MVP 계산
    const allScores: { name: string; score: number; team: string }[] = [];
    this.teams.forEach(team => {
      team.members.forEach(member => {
        allScores.push({
          name: member,
          score: team.scores[member] || 0,
          team: team.name
        });
      });
    });
    allScores.sort((a, b) => b.score - a.score);
    const topMVP = allScores.slice(0, 3);

    const totalHeight = (teamStats.length + topMVP.length + 3) * lineHeight + 20;
    const boxY = height - totalHeight - 10;

    ctx.save();
    
    // 배경 박스
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(boxX, boxY, boxWidth, totalHeight);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX, boxY, boxWidth, totalHeight);

    let currentY = boxY + 20;

    // 타이틀: 팀 순위
    ctx.font = 'bold 12pt sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center';
    ctx.fillText('🏆 팀 순위', width - boxWidth / 2 - 2, currentY);
    currentY += lineHeight + 5;

    // 팀 순위 표시
    ctx.textAlign = 'right';
    teamStats.forEach((stat, index) => {
      const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      const text = `${rankEmoji} ${stat.name}`;
      
      ctx.font = 'bold 10pt sans-serif';
      ctx.fillStyle = index === 0 ? '#ff6b6b' : index === 1 ? '#4ecdc4' : index === 2 ? '#45b7d1' : '#fff';
      ctx.fillText(text, startX - 30, currentY);
      
      // 점수
      ctx.font = '9pt sans-serif';
      ctx.fillStyle = '#ffd700';
      ctx.fillText(`${stat.avgScore.toFixed(2)}`, startX - 5, currentY);
      
      currentY += lineHeight;
    });

    currentY += 8;

    // 타이틀: MVP
    ctx.font = 'bold 11pt sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center';
    ctx.fillText('⭐ MVP TOP 3', width - boxWidth / 2 - 2, currentY);
    currentY += lineHeight;

    // MVP 표시
    ctx.textAlign = 'right';
    topMVP.forEach((player, index) => {
      const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
      const text = `${rankEmoji} ${player.name}`;
      
      ctx.font = '9pt sans-serif';
      ctx.fillStyle = index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : '#cd7f32';
      ctx.fillText(text, startX - 30, currentY);
      
      // 점수
      ctx.fillStyle = '#fff';
      ctx.font = '8pt sans-serif';
      ctx.fillText(`${player.score}점`, startX - 5, currentY);
      ctx.font = '9pt sans-serif';
      
      currentY += lineHeight - 2;
    });

    ctx.restore();
  }

  update(deltaTime: number) {
    if (this._currentWinner === -1) {
      return;
    }
    if (this._userMoved > 0) {
      this._userMoved -= deltaTime;
    } else {
      this._targetY = this._currentWinner * this.fontHeight + this.fontHeight;
    }
    if (this._currentY !== this._targetY) {
      this._currentY += (this._targetY - this._currentY) * (deltaTime / 250);
    }
    if (Math.abs(this._currentY - this._targetY) < 1) {
      this._currentY = this._targetY;
    }
  }

  getBoundingBox(): Rect | null {
    return null;
  }
}

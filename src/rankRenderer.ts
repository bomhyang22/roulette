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
        // 팀 순위 복사
        const tsv: string[] = [];
        
        // 팀별 평균 점수 계산
        const teamStats = this.teams.filter(t => t.members.length > 0).map(team => {
          const memberScores = team.members.map(m => team.scores[m] || 0);
          const totalScore = memberScores.reduce((a, b) => a + b, 0);
          const avgScore = team.members.length > 0 ? totalScore / team.members.length : 0;
          return { name: team.name, avgScore: avgScore.toFixed(2) };
        });
        teamStats.sort((a, b) => parseFloat(b.avgScore) - parseFloat(a.avgScore));
        
        tsv.push(['Rank', 'Team', 'Avg Score'].join('\t'));
        teamStats.forEach((stat, idx) => {
          tsv.push([(idx + 1).toString(), stat.name, stat.avgScore].join('\t'));
        });

        navigator.clipboard.writeText(tsv.join('\n')).then(() => {
          if (this.messageHandler) {
            this.messageHandler('팀 순위가 복사되었습니다');
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
    const lineHeight = 18;
    
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

    this.maxY = Math.max(0, (teamStats.length + topMVP.length + 2) * lineHeight);
    this._currentWinner = winners.length;

    this.winners = winners;
    this.marbles = marbles;
    this.winnerRank = winnerRank;

    ctx.save();
    ctx.textAlign = 'right';
    
    // 배경
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(width - 160, 0, 160, height);
    
    // 클리핑 영역
    ctx.beginPath();
    ctx.rect(width - 160, 0, 160, height);
    ctx.clip();

    let currentY = 20;

    // 타이틀: 팀 순위
    ctx.font = 'bold 12pt sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText('🏆 팀 순위', startX, currentY);
    ctx.fillText('🏆 팀 순위', startX, currentY);
    currentY += lineHeight + 5;

    // 팀 순위 표시
    ctx.font = 'bold 11pt sans-serif';
    teamStats.forEach((stat, index) => {
      const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      const text = `${rankEmoji} ${stat.name}`;
      const scoreText = `${stat.avgScore.toFixed(2)}`;
      
      ctx.fillStyle = index === 0 ? '#ff6b6b' : index === 1 ? '#4ecdc4' : index === 2 ? '#45b7d1' : '#fff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(text, startX, currentY);
      ctx.fillText(text, startX, currentY);
      
      // 점수
      ctx.font = '10pt sans-serif';
      ctx.fillStyle = '#ffd700';
      ctx.strokeText(scoreText, startX, currentY + 14);
      ctx.fillText(scoreText, startX, currentY + 14);
      ctx.font = 'bold 11pt sans-serif';
      
      currentY += lineHeight + 12;
    });

    currentY += 10;

    // 타이틀: MVP
    ctx.font = 'bold 12pt sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText('⭐ MVP TOP 3', startX, currentY);
    ctx.fillText('⭐ MVP TOP 3', startX, currentY);
    currentY += lineHeight + 5;

    // MVP 표시
    ctx.font = '10pt sans-serif';
    topMVP.forEach((player, index) => {
      const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
      const text = `${rankEmoji} ${player.name}`;
      const scoreText = `${player.score}점`;
      
      ctx.fillStyle = index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : '#cd7f32';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(text, startX, currentY);
      ctx.fillText(text, startX, currentY);
      
      // 점수
      ctx.fillStyle = '#fff';
      ctx.font = '9pt sans-serif';
      ctx.strokeText(scoreText, startX, currentY + 12);
      ctx.fillText(scoreText, startX, currentY + 12);
      ctx.font = '10pt sans-serif';
      
      currentY += lineHeight + 8;
    });

    ctx.restore();
  }

  update(deltaTime: number) {
    if (this._currentWinner === -1) {
      return;
    }
    if (this._userMoved > 0) {
      this._userMoved -= deltaTime;
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

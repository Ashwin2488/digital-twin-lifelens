export type GameEffects = {
  cash?: number;
  debt?: number;
  monthly?: number;
  stress?: number;
  happy?: number;
  protection?: number;
};

export type GameChoice = {
  label: string;
  detail: string;
  effects: GameEffects;
  reaction: string;
  tag: string;
};

export type GameRound = {
  month: number;
  icon: string;
  kind: string;
  title: string;
  story: string;
  choices: GameChoice[];
};

export type GameCatalog = {
  start: GameState;
  rounds: GameRound[];
  benchmarks: { monthlySpend: number; monthlyIncome: number };
  coinBonuses: { base: number; lowStress: number; positiveCash: number; stressThreshold: number };
  resourceAnswers: {
    twin: { thinCash: string; highStress: string; default: string; thinCashBelow: number; highStressAbove: number };
    guide: {
      earlyMonths: string;
      protectionMonth: string;
      surpriseMonth: string;
      default: string;
      earlyThroughMonth: number;
      protectionMonthNum: number;
      surpriseMonthNum: number;
    };
    rm: string;
  };
  resources: { id: "twin" | "guide" | "rm"; icon: string; title: string; copy: string; limited?: boolean }[];
};

export type GameState = {
  round: number;
  cash: number;
  debt: number;
  happy: number;
  stress: number;
  protection: number;
  monthly: number;
  choices: { round: number; choiceIndex: number; label: string; tag: string; reaction: string }[];
  history: number[];
  complete: boolean;
  consults: number;
  earnedCoins: number;
  resourceOpen: "twin" | "guide" | "rm" | null;
  rewindMode: boolean;
};

export function newGame(start: GameState): GameState {
  return structuredClone(start);
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function applyGameChoice(catalog: GameCatalog, game: GameState, choiceIndex: number): { game: GameState; coinsEarned: number } {
  const rounds = catalog.rounds;
  const round = rounds[game.round];
  const choice: GameChoice = round.choices[choiceIndex];
  const e = choice.effects;
  const monthsElapsed = Math.max(1, round.month - (rounds[game.round - 1]?.month || 0));
  const next: GameState = {
    ...game,
    cash: game.cash + (e.cash || 0) + game.monthly * monthsElapsed,
    debt: Math.max(0, game.debt + (e.debt || 0)),
    happy: clamp(game.happy + (e.happy || 0)),
    stress: clamp(game.stress + (e.stress || 0)),
    protection: clamp(game.protection + (e.protection || 0)),
    monthly: game.monthly + (e.monthly || 0),
    choices: [...game.choices, { round: game.round, choiceIndex, label: choice.label, tag: choice.tag, reaction: choice.reaction }],
    resourceOpen: null,
    history: [...game.history, 0],
  };
  next.history[next.history.length - 1] = next.cash;
  const bonus = catalog.coinBonuses;
  const coinsEarned = bonus.base + (next.stress < bonus.stressThreshold ? bonus.lowStress : 0) + (next.cash > 0 ? bonus.positiveCash : 0);
  next.earnedCoins += coinsEarned;
  next.round += 1;
  next.complete = next.round >= rounds.length;
  next.rewindMode = false;
  return { game: next, coinsEarned };
}

export function rewindTo(catalog: GameCatalog, game: GameState, choicePosition: number) {
  const previous = game.choices.slice(0, choicePosition);
  let next = newGame(catalog.start);
  let earned = 0;
  for (const saved of previous) {
    const result = applyGameChoice(catalog, next, saved.choiceIndex);
    next = result.game;
    earned += result.coinsEarned;
  }
  return { game: next, coinsEarned: earned };
}

export function gameScore(game: GameState) {
  const cashScore = Math.max(0, Math.min(30, 15 + game.cash / 500));
  const debtPenalty = Math.min(20, game.debt / 250);
  return Math.max(0, Math.min(100, Math.round(cashScore + game.happy * 0.22 + (100 - game.stress) * 0.18 + game.protection * 0.25 - debtPenalty)));
}

export function gameAchievements(catalog: GameCatalog, game: GameState) {
  const spend = catalog.benchmarks.monthlySpend;
  const snapshot = {
    emergencyFundMonths: spend ? game.cash / spend : 0,
    minBalance: Math.min(...(game.history || [game.cash])),
    onTrack: game.cash >= 0,
    monthlyNet: catalog.benchmarks.monthlyIncome - spend + (game.monthly || 0),
  };
  const items: [string, string, string][] = [];
  if (snapshot.emergencyFundMonths >= 6) items.push(["☂", "6-month buffer", `${snapshot.emergencyFundMonths.toFixed(1)} months of spend in cash — same threshold as Goal Plan`]);
  if (snapshot.minBalance >= 0) items.push(["◇", "Stayed liquid", "Never went negative"]);
  if (snapshot.onTrack) items.push(["⬡", "Goal in reach", "Ended the year with a positive buffer"]);
  if (snapshot.monthlyNet > 0) items.push(["☼", "Paying yourself first", "Modeled monthly net stayed positive"]);
  return items.slice(0, 4);
}

export function resourceAnswer(catalog: GameCatalog, id: string, round: GameRound, g: GameState) {
  const answers = catalog.resourceAnswers;
  if (id === "twin") {
    if (g.cash < answers.twin.thinCashBelow) return answers.twin.thinCash;
    if (g.stress > answers.twin.highStressAbove) return answers.twin.highStress;
    return answers.twin.default;
  }
  if (id === "guide") {
    if (round.month <= answers.guide.earlyThroughMonth) return answers.guide.earlyMonths;
    if (round.month === answers.guide.protectionMonthNum) return answers.guide.protectionMonth;
    if (round.month === answers.guide.surpriseMonthNum) return answers.guide.surpriseMonth;
    return answers.guide.default;
  }
  return answers.rm;
}

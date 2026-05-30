import type {
  Card,
  ClaimAction,
  ClaimedEvent,
  GameState,
  GameVariant,
  Player,
  PlayerId,
  SetDef,
  Team,
} from '@literature/shared';

export type ClaimErrorCode =
  | 'GAME_NOT_PLAYING'
  | 'UNKNOWN_PLAYER'
  | 'UNKNOWN_SET'
  | 'ALREADY_CLAIMED'
  | 'INCOMPLETE_ASSIGNMENTS'
  | 'EXTRA_ASSIGNMENTS'
  | 'INVALID_ASSIGNEE_TEAM'
  | 'UNKNOWN_ASSIGNEE';

export type ClaimResult =
  | { ok: true; state: GameState; event: ClaimedEvent }
  | { ok: false; code: ClaimErrorCode; message: string };

const fail = (code: ClaimErrorCode, message: string): ClaimResult => ({
  ok: false,
  code,
  message,
});

function findSet(variant: GameVariant, setId: string): SetDef | undefined {
  return variant.sets.find((s) => s.setId === setId);
}

function findPlayer(state: GameState, id: string): Player | undefined {
  return state.players.find((p) => p.id === id);
}

function findCardHolder(
  hands: Record<PlayerId, Card[]>,
  cardId: string,
): PlayerId | undefined {
  for (const [pid, hand] of Object.entries(hands)) {
    if (hand.some((c) => c.id === cardId)) return pid;
  }
  return undefined;
}

function opposingTeam(team: Team): Team {
  return team === 'A' ? 'B' : 'A';
}

export function resolveClaim(
  state: GameState,
  variant: GameVariant,
  action: ClaimAction,
): ClaimResult {
  if (state.phase !== 'playing') {
    return fail('GAME_NOT_PLAYING', `game phase is ${state.phase}, expected playing`);
  }

  const claimant = findPlayer(state, action.claimantId);
  if (!claimant) return fail('UNKNOWN_PLAYER', `unknown claimant: ${action.claimantId}`);

  const set = findSet(variant, action.setId);
  if (!set) return fail('UNKNOWN_SET', `unknown set: ${action.setId}`);

  if (state.claimedSets.some((c) => c.setId === action.setId)) {
    return fail('ALREADY_CLAIMED', `set ${action.setId} already claimed`);
  }

  const setCardIds = set.cards.map((c) => c.id);
  const assignedIds = Object.keys(action.assignments);
  for (const cardId of setCardIds) {
    if (!(cardId in action.assignments)) {
      return fail('INCOMPLETE_ASSIGNMENTS', `missing assignment for ${cardId}`);
    }
  }
  for (const cardId of assignedIds) {
    if (!setCardIds.includes(cardId)) {
      return fail('EXTRA_ASSIGNMENTS', `assignment for non-set card ${cardId}`);
    }
  }

  for (const [, assigneeId] of Object.entries(action.assignments)) {
    const assignee = findPlayer(state, assigneeId);
    if (!assignee) return fail('UNKNOWN_ASSIGNEE', `unknown assignee: ${assigneeId}`);
    if (assignee.team !== claimant.team) {
      return fail(
        'INVALID_ASSIGNEE_TEAM',
        `assignee ${assigneeId} is not on claimant's team`,
      );
    }
  }

  const trueDistribution: Record<string, PlayerId> = {};
  let allCorrect = true;
  for (const cardId of setCardIds) {
    const claimedHolder = action.assignments[cardId];
    const actualHolder = findCardHolder(state.hands, cardId);
    if (!actualHolder) {
      return fail('UNKNOWN_SET', `card ${cardId} is not in play`);
    }
    trueDistribution[cardId] = actualHolder;
    if (claimedHolder !== actualHolder) {
      allCorrect = false;
    }
  }

  const scoringTeam: Team = allCorrect ? claimant.team : opposingTeam(claimant.team);

  const nextHands: Record<PlayerId, Card[]> = Object.fromEntries(
    Object.entries(state.hands).map(([pid, hand]) => [
      pid,
      hand.filter((c) => !setCardIds.includes(c.id)),
    ]),
  );

  const nextScore = {
    ...state.score,
    [scoringTeam]: state.score[scoringTeam] + 1,
  };

  const nextClaimedSets = [...state.claimedSets, { setId: set.setId, winningTeam: scoringTeam }];

  const nextPhase: GameState['phase'] =
    nextClaimedSets.length === variant.totalSets ? 'ended' : 'playing';

  const nextState: GameState = {
    ...state,
    hands: nextHands,
    score: nextScore,
    claimedSets: nextClaimedSets,
    phase: nextPhase,
  };

  const event: ClaimedEvent = {
    type: 'claimed',
    claimantId: claimant.id,
    setId: set.setId,
    success: allCorrect,
    scoringTeam,
    trueDistribution,
  };

  return { ok: true, state: nextState, event };
}

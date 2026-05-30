export type PlayerId = string;

export type Team = 'A' | 'B';

export type Player = {
  id: PlayerId;
  name: string;
  team: Team;
  seatIndex: number;
};

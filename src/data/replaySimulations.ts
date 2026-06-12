export type ReplayCamera = 'broadcast' | 'tactical' | 'top';

export type ReplayActor = {
  id: string;
  label: string;
  team: 'attack' | 'defense';
  x: number;
  y: number;
};

export type ReplayFrame = {
  time: string;
  phase: string;
  ball: {x: number; y: number};
  actors: ReplayActor[];
};

export type ReplaySimulation = {
  title: string;
  description: string;
  frames: ReplayFrame[];
};

/*
  Replace this sample with analyzed goal data when a real video is ready.

  Coordinates use pitch percentages:
  - x: 0 left touchline, 100 right touchline
  - y: 0 top touchline, 100 bottom touchline
*/
export const sampleReplay: ReplaySimulation = {
  title: 'Morocco Corner Goal vs Madagascar',
  description: 'A reconstructed 3D pitch simulation from the X video: Morocco deliver a left-side corner into the six-yard crowd and force the opener at the near side of goal.',
  frames: [
    {
      time: '00:00',
      phase: 'Morocco set up a left-side corner with runners packed around the six-yard box',
      ball: {x: 7, y: 18},
      actors: [
        {id: 'a1', label: 'CK', team: 'attack', x: 7, y: 18},
        {id: 'a2', label: 'A9', team: 'attack', x: 78, y: 46},
        {id: 'a3', label: 'A17', team: 'attack', x: 74, y: 54},
        {id: 'a4', label: 'A25', team: 'attack', x: 82, y: 40},
        {id: 'a5', label: 'EDGE', team: 'attack', x: 58, y: 64},
        {id: 'd1', label: 'D12', team: 'defense', x: 76, y: 49},
        {id: 'd2', label: 'D21', team: 'defense', x: 80, y: 52},
        {id: 'd3', label: 'D15', team: 'defense', x: 84, y: 44},
        {id: 'd4', label: 'D13', team: 'defense', x: 88, y: 54},
        {id: 'd5', label: 'GK', team: 'defense', x: 92, y: 50},
      ],
    },
    {
      time: '00:02',
      phase: 'Corner is whipped toward the penalty spot and near-post crowd',
      ball: {x: 46, y: 35},
      actors: [
        {id: 'a1', label: 'CK', team: 'attack', x: 9, y: 19},
        {id: 'a2', label: 'A9', team: 'attack', x: 79, y: 45},
        {id: 'a3', label: 'A17', team: 'attack', x: 75, y: 52},
        {id: 'a4', label: 'A25', team: 'attack', x: 83, y: 39},
        {id: 'a5', label: 'EDGE', team: 'attack', x: 61, y: 63},
        {id: 'd1', label: 'D12', team: 'defense', x: 77, y: 48},
        {id: 'd2', label: 'D21', team: 'defense', x: 81, y: 52},
        {id: 'd3', label: 'D15', team: 'defense', x: 85, y: 44},
        {id: 'd4', label: 'D13', team: 'defense', x: 88, y: 54},
        {id: 'd5', label: 'GK', team: 'defense', x: 92, y: 50},
      ],
    },
    {
      time: '00:04',
      phase: 'Attackers attack the drop zone as Madagascar hold a tight goalmouth line',
      ball: {x: 73, y: 45},
      actors: [
        {id: 'a1', label: 'CK', team: 'attack', x: 13, y: 20},
        {id: 'a2', label: 'A9', team: 'attack', x: 80, y: 44},
        {id: 'a3', label: 'A17', team: 'attack', x: 78, y: 51},
        {id: 'a4', label: 'A25', team: 'attack', x: 85, y: 41},
        {id: 'a5', label: 'EDGE', team: 'attack', x: 64, y: 61},
        {id: 'd1', label: 'D12', team: 'defense', x: 79, y: 48},
        {id: 'd2', label: 'D21', team: 'defense', x: 82, y: 52},
        {id: 'd3', label: 'D15', team: 'defense', x: 86, y: 45},
        {id: 'd4', label: 'D13', team: 'defense', x: 89, y: 54},
        {id: 'd5', label: 'GK', team: 'defense', x: 92, y: 49},
      ],
    },
    {
      time: '00:06',
      phase: 'First contact redirects the ball across the six-yard area',
      ball: {x: 84, y: 48},
      actors: [
        {id: 'a1', label: 'CK', team: 'attack', x: 16, y: 21},
        {id: 'a2', label: 'A9', team: 'attack', x: 82, y: 45},
        {id: 'a3', label: 'A17', team: 'attack', x: 82, y: 52},
        {id: 'a4', label: 'A25', team: 'attack', x: 87, y: 44},
        {id: 'a5', label: 'EDGE', team: 'attack', x: 66, y: 60},
        {id: 'd1', label: 'D12', team: 'defense', x: 81, y: 48},
        {id: 'd2', label: 'D21', team: 'defense', x: 84, y: 52},
        {id: 'd3', label: 'D15', team: 'defense', x: 88, y: 46},
        {id: 'd4', label: 'D13', team: 'defense', x: 90, y: 54},
        {id: 'd5', label: 'GK', team: 'defense', x: 92, y: 48},
      ],
    },
    {
      time: '00:08',
      phase: 'Goalkeeper is beaten as the ball crosses the line at the near side',
      ball: {x: 94, y: 47},
      actors: [
        {id: 'a1', label: 'CK', team: 'attack', x: 18, y: 22},
        {id: 'a2', label: 'A9', team: 'attack', x: 84, y: 46},
        {id: 'a3', label: 'A17', team: 'attack', x: 84, y: 53},
        {id: 'a4', label: 'A25', team: 'attack', x: 89, y: 45},
        {id: 'a5', label: 'EDGE', team: 'attack', x: 69, y: 58},
        {id: 'd1', label: 'D12', team: 'defense', x: 83, y: 48},
        {id: 'd2', label: 'D21', team: 'defense', x: 86, y: 52},
        {id: 'd3', label: 'D15', team: 'defense', x: 89, y: 47},
        {id: 'd4', label: 'D13', team: 'defense', x: 91, y: 55},
        {id: 'd5', label: 'GK', team: 'defense', x: 91, y: 50},
      ],
    },
    {
      time: '00:10',
      phase: 'Morocco runners peel away as the ball settles in the net',
      ball: {x: 96, y: 47},
      actors: [
        {id: 'a1', label: 'CK', team: 'attack', x: 21, y: 23},
        {id: 'a2', label: 'A9', team: 'attack', x: 86, y: 45},
        {id: 'a3', label: 'A17', team: 'attack', x: 87, y: 54},
        {id: 'a4', label: 'A25', team: 'attack', x: 91, y: 45},
        {id: 'a5', label: 'EDGE', team: 'attack', x: 72, y: 57},
        {id: 'd1', label: 'D12', team: 'defense', x: 84, y: 49},
        {id: 'd2', label: 'D21', team: 'defense', x: 87, y: 52},
        {id: 'd3', label: 'D15', team: 'defense', x: 90, y: 47},
        {id: 'd4', label: 'D13', team: 'defense', x: 92, y: 55},
        {id: 'd5', label: 'GK', team: 'defense', x: 91, y: 53},
      ],
    },
  ],
};

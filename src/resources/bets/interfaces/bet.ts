export interface IBet {
  creatorId: string;
  opponentId?: string;
  opponentEmail: string;
  winnerId?: string;
  title: string;
  description: string;
  creatorStake: number;
  opponentStake?: number;
  totalStake?: number;
  deadline: Date;
  status: 'pending' | 'accepted' | 'active' | 'verified' | 'settled' | 'canceled' | 'disputed' | 'reversed' | 'refunded' | 'closed';
  predictions: {
    creatorPrediction: string;
    opponentPrediction?: string;
  };
  betType: 'with-witnesses' | 'without-witnesses';
}
export interface IBet {
  id: string;
  creatorId: string;
  opponentId?: string | null;
  opponentEmail?: string | null;
  winnerId?: string | null;
  title: string;
  description?: string | null;
  creatorStake: number;
  opponentStake?: number | null;
  totalStake?: number | null;
  deadline?: Date | null;
  status: 
    | 'PENDING'
    | 'ACCEPTED'
    | 'ACTIVE'
    | 'VERIFIED'
    | 'SETTLED'
    | 'CANCELED'
    | 'DISPUTED'
    | 'REVERSED'
    | 'REFUNDED'
    | 'CLOSED';
  predictions?: {
    creatorPrediction: string;
    opponentPrediction?: string | null;
  } | null;
  betType: 'WITH-WITNESSES' | 'WITHOUT-WITNESSES';
  createdAt: Date;
  updatedAt: Date;
}

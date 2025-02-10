import { Container } from 'inversify';
import { BetService } from './resources/bets/bet.service';
import { RejectBetInvitationProvider } from './resources/bets/providers/reject-bet-invitation.provider';

const container = new Container();

// Bind providers
container.bind<RejectBetInvitationProvider>(RejectBetInvitationProvider).toSelf();

// Bind services
container.bind<BetService>(BetService).toSelf();

export { container };
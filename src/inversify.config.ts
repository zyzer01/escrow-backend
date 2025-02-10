import { Container } from 'inversify';
import { BetService } from './resources/bets/bet.service';
import { RejectBetInvitationProvider } from './resources/bets/providers/reject-bet-invitation.provider';
import { CreateBetProvider } from './resources/bets/providers/create-bet.provider';

const container = new Container();

// Bind providers
container.bind<RejectBetInvitationProvider>(RejectBetInvitationProvider).toSelf();
container.bind<CreateBetProvider>(CreateBetProvider).toSelf();

// Bind services
container.bind<BetService>(BetService).toSelf();

export { container };
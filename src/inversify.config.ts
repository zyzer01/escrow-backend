import { Container } from 'inversify';
import { BetService } from './resources/bets/bet.service';
import { RejectBetInvitationProvider } from './resources/bets/providers/reject-bet-invitation.provider';
import { CreateBetProvider } from './resources/bets/providers/create-bet.provider';
import { AcceptBetInvitationProvider } from './resources/bets/providers/accept-bet-invitation.provider';
import { EscrowService } from './resources/escrow/escrow.service';
import { SettleBetProvider } from './resources/bets/providers/settle-bet.provider';
import { WalletService } from './resources/wallet/wallet.service';

const container = new Container();

// Bind providers
container.bind<AcceptBetInvitationProvider>(AcceptBetInvitationProvider).toSelf();
container.bind<RejectBetInvitationProvider>(RejectBetInvitationProvider).toSelf();
container.bind<CreateBetProvider>(CreateBetProvider).toSelf();
container.bind<SettleBetProvider>(SettleBetProvider).toSelf();

// Bind services
container.bind<BetService>(BetService).toSelf();
container.bind<EscrowService>(EscrowService).toSelf();
container.bind<WalletService>(WalletService).toSelf();

export { container };
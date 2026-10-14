import { User } from './entities/user.entity';

/** What AuthGuard('jwt') puts on req.user. */
export type AuthenticatedUser = User & { readonly sessionId: string };

/**
 * Non-enumerable so the serializer skips it when an endpoint returns
 * req.user. Do not replace with `{ ...user, sessionId }`: the spread drops
 * the User prototype and with it @Exclude on the password hash.
 */
export function withSessionId(
  user: User,
  sessionId: string,
): AuthenticatedUser {
  Object.defineProperty(user, 'sessionId', {
    value: sessionId,
    enumerable: false,
  });
  return user as AuthenticatedUser;
}

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface FirebaseUser {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
}

/** Inject the decoded Firebase user attached by FirebaseAuthGuard. */
export const CurrentFirebaseUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): FirebaseUser => {
    const req = ctx.switchToHttp().getRequest();
    return req.firebaseUser;
  },
);

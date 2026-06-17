import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private app: admin.app.App | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    if (admin.apps.length) {
      this.app = admin.app();
      return;
    }

    const saPath = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_PATH');
    const resolved = saPath ? path.resolve(process.cwd(), saPath) : '';

    if (resolved && fs.existsSync(resolved)) {
      const serviceAccount = JSON.parse(fs.readFileSync(resolved, 'utf8'));
      this.app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      this.logger.log('Firebase Admin initialized with service account.');
    } else {
      this.logger.warn(
        `Firebase service account not found at "${resolved}". ` +
          'Auth will fail until you add firebase-service-account.json. ' +
          'Download it from Firebase Console > Project Settings > Service Accounts.',
      );
    }
  }

  /** Verify a Firebase ID token and return its decoded payload. */
  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    if (!this.app) {
      throw new Error('Firebase Admin not initialized (missing service account).');
    }
    return admin.auth().verifyIdToken(idToken);
  }

  /**
   * Send a notification to a list of FCM device tokens.
   * Returns the tokens that are no longer valid (so callers can prune them).
   */
  async sendPush(
    tokens: string[],
    notification: { title: string; body: string },
    data?: Record<string, string>,
  ): Promise<{ successCount: number; staleTokens: string[] }> {
    if (!this.app) {
      throw new Error('Firebase Admin not initialized (missing service account).');
    }
    if (!tokens.length) return { successCount: 0, staleTokens: [] };

    const res = await admin.messaging().sendEachForMulticast({
      tokens,
      notification,
      data,
      android: { priority: 'high' },
    });

    const staleTokens: string[] = [];
    res.responses.forEach((r, i) => {
      const code = r.error?.code;
      if (
        code === 'messaging/registration-token-not-registered' ||
        code === 'messaging/invalid-registration-token' ||
        code === 'messaging/invalid-argument'
      ) {
        staleTokens.push(tokens[i]);
      }
    });
    if (res.failureCount) {
      this.logger.warn(
        `Push: ${res.successCount} sent, ${res.failureCount} failed ` +
          `(${staleTokens.length} stale tokens).`,
      );
    }
    return { successCount: res.successCount, staleTokens };
  }
}

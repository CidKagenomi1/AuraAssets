import { jwtVerify } from 'jose';
import { z } from 'zod';
import { env } from '../../config/env.js';

const uuidSchema = z.string().uuid();

export class AuthService {
  constructor({ supabase = null, jwtSecret = env.SUPABASE_JWT_SECRET, allowDevHeader = env.ALLOW_DEV_HEADER_AUTH } = {}) {
    this.supabase = supabase;
    this.jwtSecret = jwtSecret ? new TextEncoder().encode(jwtSecret) : null;
    this.allowDevHeader = allowDevHeader && env.NODE_ENV !== 'production';
  }

  /**
   * Verify a JWT token from Supabase Auth and return the authenticated player identity.
   * Never trusts client-provided playerId in body/query.
   */
  async verifyToken(token) {
    if (!token || typeof token !== 'string') {
      const err = new Error('Missing authentication token');
      err.statusCode = 401;
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
    if (!cleanToken) {
      const err = new Error('Malformed authentication token');
      err.statusCode = 401;
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    // 1. Verify using SUPABASE_JWT_SECRET (stateless & fast)
    if (this.jwtSecret) {
      try {
        const { payload } = await jwtVerify(cleanToken, this.jwtSecret, {
          algorithms: ['HS256']
        });

        const playerId = payload.sub;
        if (!playerId || !uuidSchema.safeParse(playerId).success) {
          throw new Error('Invalid subject claim in JWT');
        }

        const username =
          payload.user_metadata?.username ||
          payload.user_metadata?.name ||
          (payload.email ? payload.email.split('@')[0] : 'Player');

        return {
          id: playerId,
          email: payload.email || null,
          username,
          role: payload.role || 'authenticated'
        };
      } catch (jwtErr) {
        const err = new Error(`Invalid or expired JWT: ${jwtErr.message}`);
        err.statusCode = 401;
        err.code = 'INVALID_TOKEN';
        throw err;
      }
    }

    // 2. Fallback to Supabase Auth API verification if configured
    if (this.supabase) {
      const { data, error } = await this.supabase.auth.getUser(cleanToken);
      if (error || !data?.user) {
        const err = new Error(error?.message || 'Supabase token verification failed');
        err.statusCode = 401;
        err.code = 'INVALID_TOKEN';
        throw err;
      }

      const user = data.user;
      const username =
        user.user_metadata?.username ||
        user.user_metadata?.name ||
        (user.email ? user.email.split('@')[0] : 'Player');

      return {
        id: user.id,
        email: user.email || null,
        username,
        role: user.role || 'authenticated'
      };
    }

    const err = new Error('Authentication provider is not configured on server');
    err.statusCode = 500;
    err.code = 'AUTH_MISCONFIGURED';
    throw err;
  }

  /**
   * Resolve player identity from HTTP request headers.
   */
  async authenticateRequest(request) {
    const authHeader = request.headers.authorization;
    if (authHeader) {
      return this.verifyToken(authHeader);
    }

    if (this.allowDevHeader && request.headers['x-dev-player-id']) {
      const devId = String(request.headers['x-dev-player-id']).trim();
      if (!uuidSchema.safeParse(devId).success) {
        const err = new Error('x-dev-player-id must be a valid UUID');
        err.statusCode = 401;
        err.code = 'INVALID_DEV_PLAYER_ID';
        throw err;
      }
      const devUsername = String(request.headers['x-dev-username'] || 'DevPlayer').trim();
      return {
        id: devId,
        email: `${devUsername.toLowerCase()}@dev.local`,
        username: devUsername,
        role: 'authenticated'
      };
    }

    const err = new Error('Authorization header is required');
    err.statusCode = 401;
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  /**
   * Resolve player identity from Socket.IO handshake.
   */
  async authenticateSocket(socket) {
    const token =
      socket.handshake?.auth?.token ||
      socket.handshake?.headers?.authorization;

    if (token) {
      return this.verifyToken(token);
    }

    const devId =
      socket.handshake?.auth?.devPlayerId ||
      socket.handshake?.headers?.['x-dev-player-id'];

    if (this.allowDevHeader && devId) {
      const cleanId = String(devId).trim();
      if (!uuidSchema.safeParse(cleanId).success) {
        const err = new Error('Invalid devPlayerId UUID');
        err.statusCode = 401;
        err.code = 'INVALID_DEV_PLAYER_ID';
        throw err;
      }
      const devUsername = String(
        socket.handshake?.auth?.devUsername ||
        socket.handshake?.headers?.['x-dev-username'] ||
        'DevPlayer'
      ).trim();

      return {
        id: cleanId,
        email: `${devUsername.toLowerCase()}@dev.local`,
        username: devUsername,
        role: 'authenticated'
      };
    }

    const err = new Error('Authentication token required for WebSocket connection');
    err.statusCode = 401;
    err.code = 'UNAUTHORIZED';
    throw err;
  }
}

export default AuthService;


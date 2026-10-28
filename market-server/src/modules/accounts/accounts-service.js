import { env } from '../../config/env.js';

export class AccountsService {
  constructor(db, defaultStartingBalance = env.DEFAULT_STARTING_BALANCE) {
    this.db = db;
    this.defaultStartingBalance = defaultStartingBalance;
  }

  async ensureAccount(playerId, username = 'Player', initialBalance = this.defaultStartingBalance) {
    if (!this.db) return null;
    const { rows } = await this.db.query(
      'SELECT fn_ensure_account($1::uuid, $2::text, $3::bigint) AS result',
      [playerId, username, initialBalance]
    );
    return rows[0]?.result || null;
  }

  async getAccount(playerId) {
    const { rows } = await this.db.query(
      `SELECT player_id, username, available_balance, locked_balance, version, created_at, updated_at
       FROM accounts
       WHERE player_id = $1`,
      [playerId]
    );

    if (rows.length === 0) {
      return this.ensureAccount(playerId);
    }

    const acc = rows[0];
    return {
      player_id: acc.player_id,
      username: acc.username,
      available_balance: Number(acc.available_balance),
      locked_balance: Number(acc.locked_balance),
      total_balance: Number(acc.available_balance) + Number(acc.locked_balance),
      version: Number(acc.version),
      updated_at: acc.updated_at
    };
  }

  async grantShares(playerId, symbol, quantity, price = null) {
    const { rows } = await this.db.query(
      'SELECT fn_grant_shares($1::uuid, $2::text, $3::bigint, $4::bigint) AS result',
      [playerId, symbol.toUpperCase(), quantity, price]
    );
    return rows[0]?.result;
  }

  async getLedgerHistory(playerId, limit = 50) {
    const { rows } = await this.db.query(
      `SELECT id, player_id, asset_type, entry_type, delta_available, delta_locked,
              balance_available_after, balance_locked_after, reference_type, reference_id,
              metadata, created_at
       FROM ledger_entries
       WHERE player_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [playerId, Math.min(200, Math.max(1, limit))]
    );
    return rows;
  }
}

export default AccountsService;


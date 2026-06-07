import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMatchesCache1717718400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      -- Create matches cache table
      CREATE TABLE IF NOT EXISTS matches_cache (
        id SERIAL PRIMARY KEY,
        api_match_id VARCHAR(100) UNIQUE NOT NULL,
        match_data JSONB NOT NULL,
        status VARCHAR(20) NOT NULL,
        league VARCHAR(100),
        kickoff_time TIMESTAMP,
        home_team VARCHAR(100),
        away_team VARCHAR(100),
        home_score INTEGER,
        away_score INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Indexes for fast queries
      CREATE INDEX IF NOT EXISTS idx_match_status ON matches_cache(status);
      CREATE INDEX IF NOT EXISTS idx_match_kickoff ON matches_cache(kickoff_time);
      CREATE INDEX IF NOT EXISTS idx_match_league ON matches_cache(league);
      CREATE INDEX IF NOT EXISTS idx_match_updated ON matches_cache(updated_at);

      -- Track API usage
      CREATE TABLE IF NOT EXISTS api_call_log (
        id SERIAL PRIMARY KEY,
        endpoint VARCHAR(200),
        call_time TIMESTAMP DEFAULT NOW(),
        success BOOLEAN DEFAULT true,
        matches_fetched INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_api_call_time ON api_call_log(call_time);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS api_call_log;
      DROP TABLE IF EXISTS matches_cache;
    `);
  }
}

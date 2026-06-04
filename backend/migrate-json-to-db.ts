import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { User } from './src/users/user.entity';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface JsonUser {
  address: string;
  twitterHandle?: string;
  twitterId?: string;
  twitterAvatar?: string;
  verifiedAt?: number;
}

async function migrateData() {
  console.log('=========================================');
  console.log('  Migrating JSON Data to PostgreSQL');
  console.log('=========================================\n');

  // Create database connection
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME || 'truecall',
    entities: [User],
    synchronize: true,
  });

  try {
    console.log('📡 Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Connected to database\n');

    const userRepository = dataSource.getRepository(User);

    // Read JSON file
    const jsonPath = path.join(__dirname, 'data', 'users.json');

    if (!fs.existsSync(jsonPath)) {
      console.log('⚠️  No users.json file found');
      console.log('   Skipping migration (no data to migrate)');
      console.log('\n✅ Migration complete!\n');
      await dataSource.destroy();
      return;
    }

    const jsonData = fs.readFileSync(jsonPath, 'utf-8');
    const users: JsonUser[] = JSON.parse(jsonData);

    console.log(`📦 Found ${users.length} users in JSON file\n`);

    let migrated = 0;
    let skipped = 0;

    for (const jsonUser of users) {
      try {
        // Check if user already exists
        const existing = await userRepository.findOne({
          where: { address: jsonUser.address.toLowerCase() },
        });

        if (existing) {
          console.log(`⏭️  Skipped: ${jsonUser.address} (already exists)`);
          skipped++;
          continue;
        }

        // Create new user
        const user = userRepository.create({
          address: jsonUser.address.toLowerCase(),
          twitterHandle: jsonUser.twitterHandle || null,
          twitterId: jsonUser.twitterId || null,
          twitterAvatar: jsonUser.twitterAvatar || null,
          verifiedAt: jsonUser.verifiedAt || null,
        });

        await userRepository.save(user);

        console.log(
          `✅ Migrated: ${jsonUser.address} ${
            jsonUser.twitterHandle ? `(@${jsonUser.twitterHandle})` : ''
          }`,
        );
        migrated++;
      } catch (error) {
        console.error(
          `❌ Error migrating ${jsonUser.address}: ${error.message}`,
        );
      }
    }

    console.log('\n=========================================');
    console.log('  Migration Summary');
    console.log('=========================================');
    console.log(`Total users in JSON: ${users.length}`);
    console.log(`✅ Migrated:         ${migrated}`);
    console.log(`⏭️  Skipped:          ${skipped}`);
    console.log('=========================================\n');

    // Create backup of JSON file
    const backupPath = path.join(
      __dirname,
      'data',
      `users.json.backup.${Date.now()}`,
    );
    fs.copyFileSync(jsonPath, backupPath);
    console.log(`💾 Backup created: ${backupPath}\n`);

    console.log('✅ Migration complete!\n');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

migrateData();

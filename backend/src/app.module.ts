import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainModule } from './blockchain/blockchain.module';
import { MatchesModule } from './matches/matches.module';
import { CreatorEventsModule } from './creator-events/creator-events.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DATABASE_HOST', 'localhost'),
        port: config.get('DATABASE_PORT', 5432),
        username: config.get('DATABASE_USERNAME', 'postgres'),
        password: config.get('DATABASE_PASSWORD'),
        database: config.get('DATABASE_NAME', 'truecall'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true, // Auto-create tables (disable in production!)
        logging: false,
      }),
    }),
    BlockchainModule,
    MatchesModule,
    CreatorEventsModule,
    UsersModule,
  ],
})
export class AppModule {}

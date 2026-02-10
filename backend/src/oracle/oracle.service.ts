import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  stringAsciiCV,
  uintCV,
  principalCV,
  bufferCV,
} from '@stacks/transactions';
import { StacksTestnet, StacksMainnet, StacksNetwork } from '@stacks/network';
import { Event, EventStatus, Match } from '../database/entities';
import * as crypto from 'crypto';

@Injectable()
export class OracleService {
  private readonly logger = new Logger(OracleService.name);
  private readonly network: StacksNetwork;
  private readonly contractAddress: string;
  private readonly contractName: string;
  private readonly oraclePrivateKey: string;
  private readonly oracleAddress: string;

  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
    private configService: ConfigService,
  ) {
    const networkType =
      this.configService.get<string>('STACKS_NETWORK') || 'testnet';
    this.network =
      networkType === 'mainnet' ? new StacksMainnet() : new StacksTestnet();

    this.contractAddress =
      this.configService.get<string>('CONTRACT_ADDRESS') || '';
    this.contractName = this.configService.get<string>('CONTRACT_NAME') || '';
    this.oraclePrivateKey =
      this.configService.get<string>('ORACLE_PRIVATE_KEY') || '';
    this.oracleAddress = this.configService.get<string>('ORACLE_ADDRESS') || '';

    this.logger.log(`Oracle initialized for ${networkType} network`);
  }

  /**
   * Create a new event in the smart contract
   */
  async createEvent(
    eventName: string,
    matchId: number,
    accessCode: string,
  ): Promise<{ eventId: number; transactionId: string }> {
    try {
      const match = await this.matchRepository.findOne({
        where: { id: matchId },
      });

      if (!match) {
        throw new Error(`Match with ID ${matchId} not found`);
      }

      this.logger.log(`Creating event "${eventName}" for match ${matchId}`);

      // Create event in contract
      const txOptions = {
        contractAddress: this.contractAddress,
        contractName: this.contractName,
        functionName: 'create-event',
        functionArgs: [
          stringAsciiCV(eventName),
          stringAsciiCV(accessCode),
          stringAsciiCV(match.homeTeam),
          stringAsciiCV(match.awayTeam),
          uintCV(match.matchTime),
          principalCV(this.oracleAddress),
        ],
        senderKey: this.oraclePrivateKey,
        validateWithAbi: false,
        network: this.network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
      };

      const transaction = await makeContractCall(txOptions);
      const broadcastResponse = await broadcastTransaction({
        transaction,
        network: this.network,
      });

      if (broadcastResponse.error) {
        throw new Error(`Transaction failed: ${broadcastResponse.error}`);
      }

      this.logger.log(
        `Event created with transaction: ${broadcastResponse.txid}`,
      );

      // Store event in database
      const event = this.eventRepository.create({
        eventName,
        matchId,
        accessCode,
        creator: this.oracleAddress,
        oracle: this.oracleAddress,
        status: EventStatus.OPEN,
        transactionId: broadcastResponse.txid,
      });

      await this.eventRepository.save(event);

      // Note: We'll need to update contractEventId after transaction confirms
      // For now, we'll return a placeholder
      return {
        eventId: event.id,
        transactionId: broadcastResponse.txid,
      };
    } catch (error) {
      this.logger.error(`Error creating event: ${error.message}`);
      throw error;
    }
  }

  /**
   * Submit match result to the smart contract
   */
  async submitResult(matchId: number): Promise<{ transactionId: string }> {
    try {
      const match = await this.matchRepository.findOne({
        where: { id: matchId },
      });

      if (!match) {
        throw new Error(`Match with ID ${matchId} not found`);
      }

      if (!match.result) {
        throw new Error(`Match ${matchId} has no result yet`);
      }

      if (!match.eventId) {
        throw new Error(`Match ${matchId} has no associated event`);
      }

      this.logger.log(
        `Submitting result for match ${matchId}: ${match.result}`,
      );

      // Submit result to contract
      const txOptions = {
        contractAddress: this.contractAddress,
        contractName: this.contractName,
        functionName: 'submit-result',
        functionArgs: [uintCV(match.eventId), uintCV(match.result)],
        senderKey: this.oraclePrivateKey,
        validateWithAbi: false,
        network: this.network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
      };

      const transaction = await makeContractCall(txOptions);
      const broadcastResponse = await broadcastTransaction({
        transaction,
        network: this.network,
      });

      if (broadcastResponse.error) {
        throw new Error(`Transaction failed: ${broadcastResponse.error}`);
      }

      this.logger.log(
        `Result submitted with transaction: ${broadcastResponse.txid}`,
      );

      // Update match as submitted
      match.submittedToContract = true;
      match.transactionId = broadcastResponse.txid;
      await this.matchRepository.save(match);

      // Update event status
      const event = await this.eventRepository.findOne({
        where: { contractEventId: match.eventId },
      });

      if (event) {
        event.status = EventStatus.SETTLED;
        await this.eventRepository.save(event);
      }

      return {
        transactionId: broadcastResponse.txid,
      };
    } catch (error) {
      this.logger.error(`Error submitting result: ${error.message}`);
      throw error;
    }
  }

  /**
   * Close an event (stop accepting predictions)
   */
  async closeEvent(eventId: number): Promise<{ transactionId: string }> {
    try {
      const event = await this.eventRepository.findOne({
        where: { id: eventId },
      });

      if (!event) {
        throw new Error(`Event with ID ${eventId} not found`);
      }

      if (!event.contractEventId) {
        throw new Error(`Event ${eventId} has no contract event ID`);
      }

      this.logger.log(`Closing event ${eventId}`);

      const txOptions = {
        contractAddress: this.contractAddress,
        contractName: this.contractName,
        functionName: 'close-event',
        functionArgs: [uintCV(event.contractEventId)],
        senderKey: this.oraclePrivateKey,
        validateWithAbi: false,
        network: this.network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
      };

      const transaction = await makeContractCall(txOptions);
      const broadcastResponse = await broadcastTransaction({
        transaction,
        network: this.network,
      });

      if (broadcastResponse.error) {
        throw new Error(`Transaction failed: ${broadcastResponse.error}`);
      }

      this.logger.log(
        `Event closed with transaction: ${broadcastResponse.txid}`,
      );

      event.status = EventStatus.CLOSED;
      await this.eventRepository.save(event);

      return {
        transactionId: broadcastResponse.txid,
      };
    } catch (error) {
      this.logger.error(`Error closing event: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all events
   */
  async getAllEvents(): Promise<Event[]> {
    return this.eventRepository.find({
      relations: ['match'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get event by ID
   */
  async getEventById(id: number): Promise<Event | null> {
    return this.eventRepository.findOne({
      where: { id },
      relations: ['match'],
    });
  }
}

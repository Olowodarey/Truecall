// API service for backend communication

import { Event, Match } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/**
 * Fetch all events from the backend
 */
export async function fetchEvents(): Promise<Event[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/oracle/events`);

    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching events:", error);
    throw error;
  }
}

/**
 * Fetch a single event by ID
 */
export async function fetchEventById(id: number): Promise<Event> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/oracle/events/${id}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch event: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching event ${id}:`, error);
    throw error;
  }
}

/**
 * Fetch upcoming matches from the backend
 */
export async function fetchUpcomingMatches(): Promise<Match[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/matches/upcoming`);

    if (!response.ok) {
      throw new Error(`Failed to fetch matches: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching matches:", error);
    throw error;
  }
}

/**
 * Create a new event
 */
export async function createEvent(
  eventName: string,
  matchId: number,
  accessCode: string,
): Promise<{ eventId: number; transactionId: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/oracle/create-event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventName,
        matchId,
        accessCode,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Failed to create event: ${response.statusText}`,
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error creating event:", error);
    throw error;
  }
}

/**
 * Sync matches from external API
 */
export async function syncMatches(): Promise<{ synced: number }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/matches/sync`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Failed to sync matches: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error syncing matches:", error);
    throw error;
  }
}

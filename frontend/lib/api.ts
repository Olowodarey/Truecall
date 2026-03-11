/**
 * api.ts — Thin shim over lib/stacks.ts
 * All data is fetched directly from the Stacks blockchain via Hiro API.
 * No backend server required.
 */

export {
  getAllEvents as fetchEvents,
  getEvent as fetchEventById,
  getQuestionsForEvent,
  getQuestion,
  getParticipant,
  getUserPoints as getPosition,
} from "./stacks";

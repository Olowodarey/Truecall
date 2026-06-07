# Share Predictions on Twitter/X Feature

## Overview

Users can now share their predictions on Twitter/X directly from the TrueCall platform. This feature helps promote events and builds social proof by allowing users to showcase their predictions publicly.

## Features Implemented

### 1. **Participant Counter**

- Shows "X/200" participant count on event cards and detail pages
- Visual indicators:
  - **FILLING UP** badge when 150+ participants
  - **FULL** badge when 200 participants reached
- Real-time count from blockchain

### 2. **Share Prediction Button**

Located on the event detail page after a user submits a prediction.

**Tweet Content Includes:**

- Match teams and predicted score
- Event name as hashtag
- Creator's Twitter handle (mentions them)
- Event link for others to join
- #TrueCall and #FootballPrediction hashtags

**Example Tweet:**

```
⚽️ My prediction for Arsenal vs Chelsea:

Arsenal 2 - 1 Chelsea

🎯 Event by @CreatorHandle

#TrueCall #FootballPrediction #UCLFinalNight

🔗 Join: https://truecall.xyz/creator-events/1
```

### 3. **Optional Tweet Reply Feature**

The component supports an optional `replyToTweetId` parameter. If a creator provides a tweet ID, users' predictions will be shared as replies to that tweet, creating a threaded conversation.

**How it works:**

- Creator makes a tweet about their event
- Gets the tweet ID from the URL (e.g., `https://twitter.com/user/status/1234567890`)
- Stores it with their event (future enhancement)
- Users' shares become replies to that tweet

## Files Modified

### Frontend Components

1. **`/frontend/components/SharePredictionButton.tsx`** (NEW)
   - Reusable share button component
   - Supports both standalone tweets and replies
   - Configurable styling (primary/secondary variants)

2. **`/frontend/app/creator-events/page.tsx`** (MODIFIED)
   - Added participant count fetching
   - Display participant badges on event cards

3. **`/frontend/app/creator-events/[id]/page.tsx`** (MODIFIED)
   - Added SharePredictionButton to prediction confirmation
   - Shows button after user submits prediction
   - Passes event details to share component

## Usage

### For Users

1. Join a creator event
2. Submit your prediction for a match
3. After submission, click "Share on X" button
4. Twitter opens with pre-filled tweet
5. Edit if needed and post

### For Creators (Future Enhancement)

Creators can optionally provide a tweet URL when creating an event:

1. Post a tweet announcing your event
2. Copy the tweet URL
3. Add it when creating the event
4. Users' predictions will appear as replies to your tweet

## Benefits

### User Benefits

- **Build Reputation**: Publicly showcase prediction skills
- **Social Proof**: Verifiable on-chain predictions
- **Easy Sharing**: One-click tweet generation

### Creator Benefits

- **Event Promotion**: Users share event links automatically
- **Twitter Engagement**: Get tagged in user tweets
- **Community Building**: Threaded conversations under original tweet

### Platform Benefits

- **Viral Growth**: Each prediction = free marketing
- **Trust Building**: Transparent, shareable predictions
- **Social Validation**: Real users with verified Twitter accounts

## Technical Details

### Share Button Props

```typescript
interface SharePredictionButtonProps {
  eventName: string; // Event name for hashtag
  homeTeam: string; // Home team name
  awayTeam: string; // Away team name
  homeScore: number; // Predicted home score
  awayScore: number; // Predicted away score
  creatorTwitter?: string; // Creator's Twitter handle
  eventId: number; // Event ID for link
  matchId: number; // Match ID
  variant?: "primary" | "secondary"; // Button style
  replyToTweetId?: string; // Optional: Tweet to reply to
}
```

### Twitter Intent URL Format

```
https://twitter.com/intent/tweet?text={encoded_text}&in_reply_to={tweet_id}
```

## Future Enhancements

### Phase 1 (Completed)

- ✅ Basic share functionality
- ✅ Creator mention
- ✅ Event link inclusion
- ✅ Participant counter

### Phase 2 (Optional)

- [ ] Store tweet URL in backend database
- [ ] Add tweet URL field to event creation form
- [ ] Display creator's original tweet on event page
- [ ] Show all user tweets/replies on event page
- [ ] Track social engagement metrics

### Phase 3 (Advanced)

- [ ] Auto-share on prediction submission (opt-in)
- [ ] Share results after match verification
- [ ] Share leaderboard position
- [ ] Twitter verification required to share
- [ ] OG image generation for better preview

## Notes

- Participant limit is hardcoded to 200 (from smart contract)
- Domain is set to `truecall.xyz` (update if different)
- Tweet length is automatically within Twitter's limit
- Share button only appears after prediction is submitted
- No Twitter API required - uses Twitter Web Intents

## Testing

To test the feature:

1. Create a test event
2. Join with a test wallet
3. Submit a prediction
4. Click "Share on X" button
5. Verify tweet content is correct
6. Post tweet (or cancel to avoid spam)

## Deployment Notes

Before production:

- [ ] Update domain in SharePredictionButton component
- [ ] Add analytics tracking to share button clicks
- [ ] Test on mobile devices
- [ ] Verify OG tags on website for link preview
- [ ] Consider rate limiting share actions

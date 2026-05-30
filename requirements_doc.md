# Product Requirements Document: Literature Online

## 1. Product Overview
**Objective:** Build a real-time, cross-platform multiplayer card game that replicates the strict rules, memory-tracking, and competitive nature of Literature for 6 players (3v3).

**Target Platform:** Web application (MVP) with architectural readiness for a mobile app deployment (e.g., React Native).

**Core Loop:** Players join a private lobby, are divided into two teams of 3, and take sequential turns asking for cards to deduce hands and claim half-suits until all sets are claimed.

## 2. Game Variants & Configuration
To support regional differences, the game engine utilizes a configuration-driven architecture, moving away from rigid, hardcoded rulesets. The following variants are supported:

| Variant Name | Total Cards | Total Sets | Cards per Player | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Classic** | 48 (No 8s) | 8 Sets | 8 | Standard rules. 4 suits, split into Minor (2-7) and Major (9-A). |
| **Extended (Jokers)** | 54 | 9 Sets | 9 | Includes Classic 48 plus a 9th set comprising the four 8s and two functionally identical, suitless Jokers. |

## 3. User Flow & Lobby System
* **Anonymous Play:** No account required to play. Guest names and avatars only to reduce friction.
* **Room Creation:** Host creates a private room, selects the Game Variant (Classic vs. Extended), and generates a 6-digit shareable code.
* **Team Selection:** Players manually slot into Team A or Team B, or the host hits "Randomize Teams".
* **Ready Check:** Host can only start the game when exactly 6 players are seated.
* **Reconnection:** Session-based token (JWT or cookie) to allow players to refresh or reconnect without dropping the game state.

## 4. Core Game Engine Requirements

### State Management
* **Dynamic Dealing:** The server generates the deck based on the variant config, shuffles, and deals dynamically (e.g., 54 / 6 = 9 cards).
* **Hand Privacy:** Client payloads must *only* contain that specific player's cards. The server must never emit the full game state to any client.

### Action Validation
When Player A asks Player B for a card, the backend API must enforce:
1. **Targeting:** Player B must be on the opposing team.
2. **Base Requirement:** Player A must possess at least one card in the requested half-suit (e.g., if asking for a Joker, Player A must hold an 8 or one Joker).
3. **Absence Requirement:** Player A cannot already hold the specific card they are asking for.
    * **The Joker Exception:** Since Jokers are functionally identical and asked for generically ("Joker"):
        * If Player A holds 0 Jokers (but holds an 8), they **can** ask for a Joker.
        * If Player A holds 1 Joker, they **can** ask for a Joker.
        * If Player A holds 2 Jokers, the server **blocks** the request.
4. **State Transfer (Joker):** If Player B holds one or both Jokers, the server deducts exactly *one* Joker from Player B's hand and transfers it to Player A.

### The Claiming System
* **Flexible Trigger:** Claiming is not restricted strictly to the active player's asking phase. Any player can initiate a "Claim":
    * Before anyone starts their turn.
    * At any point during their own turn.
    * At any point during a teammate's turn. 
* **Execution:** The player assigns all 6 cards of a set to teammates. If 100% correct, the team scores 1 point. If ≥1 assignment is wrong, the opposing team scores the point. All 6 cards are removed.

## 5. UI & UX Specifications
* **Table Layout:** Circular layout. Teammates and opponents must alternate (e.g., Team A, Team B, Team A, Team B).
* **Hand Sorting:** Auto-sort the player's hand by Suit, then by Half-Suit, then sequentially. The unique "8s and Jokers" set must be clustered distinctly. The UI must be responsive to handle 8 or 9 card starting hands cleanly.
* **The "Ask" Modal (Jokers):** When selecting a card to ask for in the 8s/Joker set, the UI simply presents "Joker" as a single option without any specifiers (e.g., Red/Black).
* **The "Ephemeral Action Feed":** To simulate the physical experience of hearing a transaction, the UI features an action feed for recent moves (e.g., "Turn 4: Player 1 asked Player 2 for a Joker. Player 2 had it."). However, to preserve the core memory challenge, each entry **automatically fades away and deletes itself after 15 seconds**. This prevents players from missing rapid-fire turns without providing a permanent historical log.
* **Communication:** Disable text/voice chat between opposing teams to prevent toxicity. Rely on external tools for voice.

## 6. Technical Architecture
Real-time bi-directional communication is mandatory.

```typescript
// Example Backend Configuration Interface (TypeScript)
interface GameVariant {
  name: string;
  totalCards: number;
  totalSets: number;
  cardsPerPlayer: number;
  sets: Array<{
    setId: string;
    displayName: string;
    cards: string[]; // e.g., ['8H', '8D', '8C', '8S', 'JOKER_1', 'JOKER_2']
  }>;
}
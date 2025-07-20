/**
 * A utility for creating and solving simple Proof-of-Work (PoW) challenges.
 * This is used as a mechanism to deter spam by requiring a small amount of
 * computational work from the sender.
 */

// Uses the browser's built-in crypto library for SHA-256 hashing.
async function sha256(str) {
    const textAsBuffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', textAsBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hash;
}

/**
 * Creates a new PoW challenge.
 * @param {number} difficulty - The number of leading zeros required in the hash.
 * @param {string} [prefix='bridgbox'] - A constant string to be part of the challenge.
 * @returns {object} An object containing the challenge text and the difficulty.
 */
export function createChallenge(difficulty = 3, prefix = 'bridgbox') {
    // In a real-world scenario, the random part could be a unique string
    // issued by a server to prevent replay attacks.
    const randomString = Math.random().toString(36).substring(2, 15);
    const text = `${prefix}:${randomString}`;
    
    return {
        text: text,
        difficulty: difficulty,
    };
}

/**
 * Solves a PoW challenge by finding a nonce that results in a hash with the required number of leading zeros.
 * @param {object} challenge - The challenge object from createChallenge.
 * @returns {Promise<object>} A promise that resolves with the solution, including the nonce and the final hash.
 */
export async function solveChallenge(challenge) {
    const { text, difficulty } = challenge;
    const requiredPrefix = '0'.repeat(difficulty);
    let nonce = 0;
    let hash = '';

    console.time('PoW-Solve'); // Start a timer to see how long it takes

    while (true) {
        const attemptText = `${text}:${nonce}`;
        hash = await sha256(attemptText);

        if (hash.startsWith(requiredPrefix)) {
            console.timeEnd('PoW-Solve'); // End the timer
            return {
                nonce: nonce,
                hash: hash,
            };
        }
        nonce++;
    }
}

/**
 * Verifies if a given nonce is the correct solution for a challenge.
 * @param {object} challenge - The challenge object.
 * @param {number} nonce - The nonce to be verified.
 * @returns {Promise<boolean>} A promise that resolves to true if the solution is correct, false otherwise.
 */
export async function verifySolution(challenge, nonce) {
    const { text, difficulty } = challenge;
    const requiredPrefix = '0'.repeat(difficulty);
    const attemptText = `${text}:${nonce}`;
    
    const hash = await sha256(attemptText);

    return hash.startsWith(requiredPrefix);
}
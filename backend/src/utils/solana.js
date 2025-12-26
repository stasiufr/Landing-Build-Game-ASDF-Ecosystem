/**
 * Solana Utility Functions
 * Wallet verification, token balance checking, transaction helpers, and payouts
 */

import {
    Connection,
    PublicKey,
    Keypair,
    Transaction,
    TransactionInstruction,
    sendAndConfirmTransaction
} from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import config from '../config/index.js';

// Create Solana connection
const connection = new Connection(config.solana.rpcUrl, 'confirmed');

// Token Program IDs
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

/**
 * Verify a wallet signature
 * Used to authenticate that a request comes from the actual wallet owner
 */
export async function verifyWalletSignature(walletAddress, message, signatureBase58) {
    try {
        const publicKey = new PublicKey(walletAddress);
        const signature = bs58.decode(signatureBase58);
        const messageBytes = new TextEncoder().encode(message);

        // Verify the signature using nacl
        const isValid = nacl.sign.detached.verify(
            messageBytes,
            signature,
            publicKey.toBytes()
        );

        return isValid;
    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
}

/**
 * Check if a wallet address is valid
 */
export function isValidWalletAddress(address) {
    try {
        new PublicKey(address);
        return true;
    } catch {
        return false;
    }
}

/**
 * Get token balance for a wallet
 */
export async function getTokenBalance(walletAddress) {
    try {
        const publicKey = new PublicKey(walletAddress);
        const tokenMint = new PublicKey(config.solana.tokenMint);

        // Get all token accounts for this wallet
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
            publicKey,
            { mint: tokenMint }
        );

        if (tokenAccounts.value.length === 0) {
            return { balance: 0, isHolder: false };
        }

        // Sum up balance from all token accounts (usually just one)
        let totalBalance = 0;
        for (const account of tokenAccounts.value) {
            const amount = account.account.data.parsed.info.tokenAmount.uiAmount || 0;
            totalBalance += amount;
        }

        return {
            balance: totalBalance,
            isHolder: totalBalance >= config.solana.minHolderBalance
        };
    } catch (error) {
        console.error('Error checking token balance:', error);
        return { balance: 0, isHolder: false, error: error.message };
    }
}

/**
 * Verify a transaction signature exists on-chain
 */
export async function verifyTransaction(signature) {
    try {
        const tx = await connection.getTransaction(signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
        });

        if (!tx) {
            return { valid: false, error: 'Transaction not found' };
        }

        if (tx.meta?.err) {
            return { valid: false, error: 'Transaction failed' };
        }

        return {
            valid: true,
            blockTime: tx.blockTime,
            slot: tx.slot
        };
    } catch (error) {
        console.error('Transaction verification error:', error);
        return { valid: false, error: error.message };
    }
}

/**
 * Verify a SOL payment transaction
 * @param {string} signature - Transaction signature
 * @param {string} fromWallet - Expected sender wallet
 * @param {string} toWallet - Expected recipient wallet
 * @param {number} expectedAmountSOL - Expected amount in SOL
 * @param {number} tolerancePercent - Allowed deviation (default 1%)
 */
export async function verifySOLPayment(signature, fromWallet, toWallet, expectedAmountSOL, tolerancePercent = 1) {
    try {
        const tx = await connection.getTransaction(signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
        });

        if (!tx) {
            return { valid: false, error: 'Transaction not found' };
        }

        if (tx.meta?.err) {
            return { valid: false, error: 'Transaction failed on chain' };
        }

        // Check transaction age (must be recent - within 10 minutes)
        const txAge = Date.now() / 1000 - tx.blockTime;
        if (txAge > 600) {
            return { valid: false, error: 'Transaction too old' };
        }

        // Parse account keys
        const accountKeys = tx.transaction.message.staticAccountKeys ||
                           tx.transaction.message.accountKeys;

        if (!accountKeys || accountKeys.length < 2) {
            return { valid: false, error: 'Invalid transaction structure' };
        }

        // Verify sender
        const sender = accountKeys[0].toBase58();
        if (sender !== fromWallet) {
            return { valid: false, error: 'Sender mismatch' };
        }

        // Check for transfer to expected destination
        const preBalances = tx.meta.preBalances;
        const postBalances = tx.meta.postBalances;

        let transferFound = false;
        let actualAmount = 0;

        for (let i = 1; i < accountKeys.length; i++) {
            const accountPubkey = accountKeys[i].toBase58();
            if (accountPubkey === toWallet) {
                const balanceChange = postBalances[i] - preBalances[i];
                if (balanceChange > 0) {
                    actualAmount = balanceChange / 1e9; // Convert lamports to SOL
                    transferFound = true;
                    break;
                }
            }
        }

        if (!transferFound) {
            return { valid: false, error: 'Payment to treasury not found' };
        }

        // Verify amount with tolerance
        const minAmount = expectedAmountSOL * (1 - tolerancePercent / 100);
        const maxAmount = expectedAmountSOL * (1 + tolerancePercent / 100);

        if (actualAmount < minAmount || actualAmount > maxAmount) {
            return {
                valid: false,
                error: `Amount mismatch: expected ${expectedAmountSOL} SOL, got ${actualAmount} SOL`
            };
        }

        return {
            valid: true,
            blockTime: tx.blockTime,
            slot: tx.slot,
            actualAmount,
            sender,
            recipient: toWallet
        };
    } catch (error) {
        console.error('SOL payment verification error:', error);
        return { valid: false, error: error.message };
    }
}

/**
 * Verify an SPL token payment transaction
 * @param {string} signature - Transaction signature
 * @param {string} fromWallet - Expected sender wallet
 * @param {string} toWallet - Expected recipient wallet (escrow)
 * @param {number} expectedAmount - Expected amount in token units
 * @param {number} tolerancePercent - Allowed deviation (default 1%)
 */
export async function verifyTokenPayment(signature, fromWallet, toWallet, expectedAmount, tolerancePercent = 1) {
    try {
        const tx = await connection.getParsedTransaction(signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
        });

        if (!tx) {
            return { valid: false, error: 'Transaction not found' };
        }

        if (tx.meta?.err) {
            return { valid: false, error: 'Transaction failed on chain' };
        }

        // Check transaction age
        const txAge = Date.now() / 1000 - tx.blockTime;
        if (txAge > 600) {
            return { valid: false, error: 'Transaction too old' };
        }

        // Find token transfer instruction
        const instructions = tx.transaction.message.instructions;
        let transferFound = false;
        let actualAmount = 0;
        let sender = null;

        // First, get the expected token mint for strict verification
        const expectedMint = config.solana.tokenMint;

        for (const ix of instructions) {
            if (ix.program === 'spl-token' && ix.parsed?.type === 'transfer') {
                const info = ix.parsed.info;

                // For 'transfer' instruction, mint is not directly available
                // We need to verify via preTokenBalances that this is our token
                const sourceAccountIndex = tx.transaction.message.accountKeys?.findIndex(
                    key => key.toString() === info.source
                );

                const sourceTokenInfo = tx.meta?.preTokenBalances?.find(
                    b => b.accountIndex === sourceAccountIndex
                );

                // STRICT: Only accept if we can verify the mint matches our expected token
                if (sourceTokenInfo && sourceTokenInfo.mint === expectedMint) {
                    actualAmount = parseFloat(info.amount) / Math.pow(10, config.solana.tokenDecimals || 6);
                    sender = info.authority || info.source;
                    transferFound = true;
                    break;
                }
            }

            // transferChecked instruction includes mint directly - preferred
            if (ix.program === 'spl-token' && ix.parsed?.type === 'transferChecked') {
                const info = ix.parsed.info;
                // STRICT: Only accept exact mint match
                if (info.mint === expectedMint) {
                    actualAmount = parseFloat(info.tokenAmount.uiAmount);
                    sender = info.authority;
                    transferFound = true;
                    break;
                }
            }
        }

        // Also check inner instructions with strict mint verification
        if (!transferFound && tx.meta?.innerInstructions) {
            for (const inner of tx.meta.innerInstructions) {
                for (const ix of inner.instructions) {
                    // Only accept transferChecked in inner instructions (has mint info)
                    if (ix.program === 'spl-token' && ix.parsed?.type === 'transferChecked') {
                        const info = ix.parsed.info;
                        // STRICT: Only accept exact mint match
                        if (info.mint === expectedMint) {
                            actualAmount = info.tokenAmount?.uiAmount ||
                                          parseFloat(info.amount) / Math.pow(10, config.solana.tokenDecimals || 6);
                            sender = info.authority;
                            transferFound = true;
                            break;
                        }
                    }
                }
                if (transferFound) break;
            }
        }

        if (!transferFound) {
            return { valid: false, error: 'Token transfer not found' };
        }

        // Verify amount with tolerance
        const minAmount = expectedAmount * (1 - tolerancePercent / 100);
        const maxAmount = expectedAmount * (1 + tolerancePercent / 100);

        if (actualAmount < minAmount || actualAmount > maxAmount) {
            return {
                valid: false,
                error: `Amount mismatch: expected ${expectedAmount}, got ${actualAmount}`
            };
        }

        return {
            valid: true,
            blockTime: tx.blockTime,
            slot: tx.slot,
            actualAmount,
            sender
        };
    } catch (error) {
        console.error('Token payment verification error:', error);
        return { valid: false, error: error.message };
    }
}

/**
 * Get current week and cycle number based on rotation epoch
 */
export function getCurrentPeriod() {
    const now = Date.now();
    const epochMs = config.game.rotationEpoch.getTime();
    const weekMs = 7 * 24 * 60 * 60 * 1000;

    const weeksSinceEpoch = Math.floor((now - epochMs) / weekMs);
    const cycleNumber = Math.floor(weeksSinceEpoch / config.game.cycleWeeks) + 1;
    const weekInCycle = (weeksSinceEpoch % config.game.cycleWeeks) + 1;
    const weekNumber = weeksSinceEpoch + 1;

    // Calculate next rotation
    const nextRotationMs = epochMs + (weeksSinceEpoch + 1) * weekMs;
    const timeUntilRotation = nextRotationMs - now;

    return {
        weekNumber,
        cycleNumber,
        weekInCycle,
        totalWeeks: weeksSinceEpoch,
        nextRotation: new Date(nextRotationMs),
        timeUntilRotation,
        currentGameIndex: weeksSinceEpoch % config.game.validGameIds.length
    };
}

/**
 * Generate a unique session token for game sessions
 */
export function generateSessionToken() {
    const bytes = nacl.randomBytes(32);
    return bs58.encode(bytes);
}

/**
 * Hash a game session for anti-cheat verification
 */
export function hashGameSession(sessionData) {
    const dataString = JSON.stringify(sessionData);
    const bytes = new TextEncoder().encode(dataString);
    const hash = nacl.hash(bytes);
    return bs58.encode(hash).substring(0, 64);
}

/**
 * Get Associated Token Address (ATA)
 */
async function getAssociatedTokenAddress(walletAddress, mintAddress) {
    const [address] = await PublicKey.findProgramAddress(
        [
            walletAddress.toBuffer(),
            TOKEN_PROGRAM_ID.toBuffer(),
            mintAddress.toBuffer()
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
    );
    return address;
}

/**
 * Create Associated Token Account instruction
 */
function createAssociatedTokenAccountInstruction(payer, associatedToken, owner, mint) {
    const keys = [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: associatedToken, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: false, isWritable: false },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: new PublicKey('11111111111111111111111111111111'), isSigner: false, isWritable: false }, // System Program
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];

    return new TransactionInstruction({
        keys,
        programId: ASSOCIATED_TOKEN_PROGRAM_ID,
        data: Buffer.alloc(0)
    });
}

/**
 * Create SPL Token transfer instruction
 */
function createTransferInstruction(source, destination, owner, amount) {
    const keys = [
        { pubkey: source, isSigner: false, isWritable: true },
        { pubkey: destination, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: false }
    ];

    // Transfer instruction data: 3 (transfer instruction) + amount as u64
    const data = Buffer.alloc(9);
    data.writeUInt8(3, 0); // Transfer instruction
    data.writeBigUInt64LE(amount, 1);

    return new TransactionInstruction({
        keys,
        programId: TOKEN_PROGRAM_ID,
        data
    });
}

/**
 * Send tokens from escrow wallet to winner
 * @param {string} recipientWallet - Winner's wallet address
 * @param {number} amount - Amount in token units (not raw)
 * @returns {Promise<{success: boolean, signature?: string, error?: string}>}
 */
export async function sendPayoutFromEscrow(recipientWallet, amount) {
    // Validate escrow private key is configured
    if (!config.solana.escrowPrivateKey || config.solana.escrowPrivateKey === 'YOUR_ESCROW_PRIVATE_KEY_HERE') {
        console.error('Escrow private key not configured');
        return {
            success: false,
            error: 'Payout system not configured. Please contact support.',
            pendingPayout: true
        };
    }

    // Validate token mint is configured
    if (!config.solana.tokenMint || config.solana.tokenMint === 'YOUR_TOKEN_MINT_ADDRESS_HERE') {
        console.error('Token mint not configured');
        return {
            success: false,
            error: 'Token not configured. Please contact support.',
            pendingPayout: true
        };
    }

    try {
        // Decode escrow private key
        const escrowSecretKey = bs58.decode(config.solana.escrowPrivateKey);
        const escrowKeypair = Keypair.fromSecretKey(escrowSecretKey);

        // Verify escrow public key matches config
        const expectedEscrow = new PublicKey(config.solana.escrowWallet);
        if (!escrowKeypair.publicKey.equals(expectedEscrow)) {
            console.error('Escrow keypair mismatch!');
            return {
                success: false,
                error: 'Escrow configuration error',
                pendingPayout: true
            };
        }

        const recipientPubkey = new PublicKey(recipientWallet);
        const mintPubkey = new PublicKey(config.solana.tokenMint);

        // Convert to raw amount with decimals
        const rawAmount = BigInt(Math.round(amount * Math.pow(10, config.solana.tokenDecimals)));

        // Get token accounts
        const escrowTokenAccount = await getAssociatedTokenAddress(escrowKeypair.publicKey, mintPubkey);
        const recipientTokenAccount = await getAssociatedTokenAddress(recipientPubkey, mintPubkey);

        // Check escrow balance
        try {
            const escrowBalance = await connection.getTokenAccountBalance(escrowTokenAccount);
            const escrowAmount = BigInt(escrowBalance.value.amount);
            if (escrowAmount < rawAmount) {
                console.error(`Insufficient escrow balance: ${escrowAmount} < ${rawAmount}`);
                return {
                    success: false,
                    error: 'Insufficient escrow funds. Payout will be processed manually.',
                    pendingPayout: true
                };
            }
        } catch (balanceError) {
            console.error('Failed to check escrow balance:', balanceError);
            return {
                success: false,
                error: 'Failed to verify escrow balance',
                pendingPayout: true
            };
        }

        // Get recent blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');

        // Create transaction
        const transaction = new Transaction({
            recentBlockhash: blockhash,
            feePayer: escrowKeypair.publicKey
        });

        // Check if recipient token account exists, if not create it
        const recipientAccountInfo = await connection.getAccountInfo(recipientTokenAccount);
        if (!recipientAccountInfo) {
            console.log('Creating recipient token account...');
            transaction.add(
                createAssociatedTokenAccountInstruction(
                    escrowKeypair.publicKey,  // payer
                    recipientTokenAccount,
                    recipientPubkey,          // owner
                    mintPubkey
                )
            );
        }

        // Add transfer instruction
        transaction.add(
            createTransferInstruction(
                escrowTokenAccount,
                recipientTokenAccount,
                escrowKeypair.publicKey,
                rawAmount
            )
        );

        // Sign and send transaction
        console.log(`Sending payout of ${amount} tokens to ${recipientWallet}...`);
        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [escrowKeypair],
            { commitment: 'confirmed' }
        );

        console.log(`Payout successful! Signature: ${signature}`);

        return {
            success: true,
            signature,
            amount,
            recipient: recipientWallet
        };

    } catch (error) {
        console.error('Payout error:', error);

        // Determine if this is a temporary or permanent error
        const isTemporary = error.message.includes('blockhash') ||
                           error.message.includes('timeout') ||
                           error.message.includes('rate limit');

        return {
            success: false,
            error: error.message,
            pendingPayout: true,
            retryable: isTemporary
        };
    }
}

/**
 * Check escrow wallet balance
 * @returns {Promise<{balance: number, sufficient: boolean}>}
 */
export async function getEscrowBalance() {
    if (!config.solana.tokenMint || config.solana.tokenMint === 'YOUR_TOKEN_MINT_ADDRESS_HERE') {
        return { balance: 0, sufficient: false };
    }

    try {
        const escrowPubkey = new PublicKey(config.solana.escrowWallet);
        const mintPubkey = new PublicKey(config.solana.tokenMint);
        const tokenAccount = await getAssociatedTokenAddress(escrowPubkey, mintPubkey);

        const accountInfo = await connection.getTokenAccountBalance(tokenAccount);
        const balance = parseFloat(accountInfo.value.uiAmount || 0);

        return {
            balance,
            sufficient: balance > 0
        };
    } catch (error) {
        console.error('Failed to get escrow balance:', error);
        return { balance: 0, sufficient: false };
    }
}

export default {
    verifyWalletSignature,
    isValidWalletAddress,
    getTokenBalance,
    verifyTransaction,
    verifySOLPayment,
    verifyTokenPayment,
    getCurrentPeriod,
    generateSessionToken,
    hashGameSession,
    sendPayoutFromEscrow,
    getEscrowBalance,
    connection
};

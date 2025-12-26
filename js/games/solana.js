/**
 * ASDF Games - Solana Payment System
 */

'use strict';

const SolanaPayment = {
    connection: null,

    /**
     * Initialize Solana connection
     */
    getConnection() {
        if (!this.connection) {
            if (typeof solanaWeb3 === 'undefined') {
                console.error('Solana Web3.js not loaded');
                return null;
            }
            this.connection = new solanaWeb3.Connection(CONFIG.SOLANA_RPC, 'confirmed');
        }
        return this.connection;
    },

    /**
     * Get Phantom provider
     */
    getProvider() {
        if (typeof window.phantom?.solana !== 'undefined') {
            return window.phantom.solana;
        }
        if (typeof window.solana !== 'undefined' && window.solana.isPhantom) {
            return window.solana;
        }
        return null;
    },

    /**
     * Transfer SOL to treasury (for ticket purchases)
     */
    async transferSOL(amountSOL) {
        const provider = this.getProvider();
        if (!provider || !provider.publicKey) {
            throw new Error('Wallet not connected');
        }

        const connection = this.getConnection();
        if (!connection) {
            throw new Error('Solana connection failed');
        }

        if (!CONFIG.TREASURY_WALLET || CONFIG.TREASURY_WALLET === 'YOUR_TREASURY_WALLET_ADDRESS_HERE') {
            throw new Error('Treasury wallet not configured');
        }

        try {
            const fromPubkey = provider.publicKey;
            const toPubkey = new solanaWeb3.PublicKey(CONFIG.TREASURY_WALLET);
            const lamports = Math.round(amountSOL * solanaWeb3.LAMPORTS_PER_SOL);

            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');

            const transaction = new solanaWeb3.Transaction({
                recentBlockhash: blockhash,
                feePayer: fromPubkey
            });

            transaction.add(
                solanaWeb3.SystemProgram.transfer({
                    fromPubkey: fromPubkey,
                    toPubkey: toPubkey,
                    lamports: lamports
                })
            );

            const { signature } = await provider.signAndSendTransaction(transaction);

            const confirmation = await connection.confirmTransaction({
                signature,
                blockhash,
                lastValidBlockHeight
            }, 'confirmed');

            if (confirmation.value.err) {
                throw new Error('Transaction failed: ' + JSON.stringify(confirmation.value.err));
            }

            console.log('SOL transfer confirmed:', signature);
            return signature;

        } catch (error) {
            console.error('SOL transfer error:', error);
            throw error;
        }
    },

    /**
     * Transfer SPL tokens (for betting)
     */
    async transferTokens(amount, destinationWallet = CONFIG.ESCROW_WALLET) {
        const provider = this.getProvider();
        if (!provider || !provider.publicKey) {
            throw new Error('Wallet not connected');
        }

        const connection = this.getConnection();
        if (!connection) {
            throw new Error('Solana connection failed');
        }

        if (!CONFIG.ASDF_TOKEN_MINT || CONFIG.ASDF_TOKEN_MINT === 'YOUR_TOKEN_MINT_ADDRESS_HERE') {
            throw new Error('Token mint not configured');
        }
        if (!destinationWallet || destinationWallet === 'YOUR_ESCROW_WALLET_ADDRESS_HERE') {
            throw new Error('Destination wallet not configured');
        }

        try {
            const fromPubkey = provider.publicKey;
            const mintPubkey = new solanaWeb3.PublicKey(CONFIG.ASDF_TOKEN_MINT);
            const toPubkey = new solanaWeb3.PublicKey(destinationWallet);
            const rawAmount = BigInt(Math.round(amount * Math.pow(10, CONFIG.TOKEN_DECIMALS)));

            const fromTokenAccount = await this.getAssociatedTokenAddress(fromPubkey, mintPubkey);
            const toTokenAccount = await this.getAssociatedTokenAddress(toPubkey, mintPubkey);

            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');

            const transaction = new solanaWeb3.Transaction({
                recentBlockhash: blockhash,
                feePayer: fromPubkey
            });

            const toAccountInfo = await connection.getAccountInfo(toTokenAccount);
            if (!toAccountInfo) {
                transaction.add(
                    this.createAssociatedTokenAccountInstruction(
                        fromPubkey,
                        toTokenAccount,
                        toPubkey,
                        mintPubkey
                    )
                );
            }

            transaction.add(
                this.createTransferInstruction(
                    fromTokenAccount,
                    toTokenAccount,
                    fromPubkey,
                    rawAmount
                )
            );

            const { signature } = await provider.signAndSendTransaction(transaction);

            const confirmation = await connection.confirmTransaction({
                signature,
                blockhash,
                lastValidBlockHeight
            }, 'confirmed');

            if (confirmation.value.err) {
                throw new Error('Transaction failed: ' + JSON.stringify(confirmation.value.err));
            }

            console.log('Token transfer confirmed:', signature);
            return signature;

        } catch (error) {
            console.error('Token transfer error:', error);
            throw error;
        }
    },

    /**
     * Get Associated Token Address (ATA)
     */
    async getAssociatedTokenAddress(walletAddress, mintAddress) {
        const TOKEN_PROGRAM_ID = new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
        const ASSOCIATED_TOKEN_PROGRAM_ID = new solanaWeb3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

        const [address] = await solanaWeb3.PublicKey.findProgramAddress(
            [
                walletAddress.toBuffer(),
                TOKEN_PROGRAM_ID.toBuffer(),
                mintAddress.toBuffer()
            ],
            ASSOCIATED_TOKEN_PROGRAM_ID
        );
        return address;
    },

    /**
     * Create Associated Token Account instruction
     */
    createAssociatedTokenAccountInstruction(payer, associatedToken, owner, mint) {
        const TOKEN_PROGRAM_ID = new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
        const ASSOCIATED_TOKEN_PROGRAM_ID = new solanaWeb3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

        const keys = [
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: associatedToken, isSigner: false, isWritable: true },
            { pubkey: owner, isSigner: false, isWritable: false },
            { pubkey: mint, isSigner: false, isWritable: false },
            { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ];

        return new solanaWeb3.TransactionInstruction({
            keys,
            programId: ASSOCIATED_TOKEN_PROGRAM_ID,
            data: Buffer.alloc(0)
        });
    },

    /**
     * Create SPL Token transfer instruction
     */
    createTransferInstruction(source, destination, owner, amount) {
        const TOKEN_PROGRAM_ID = new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

        const keys = [
            { pubkey: source, isSigner: false, isWritable: true },
            { pubkey: destination, isSigner: false, isWritable: true },
            { pubkey: owner, isSigner: true, isWritable: false }
        ];

        const data = Buffer.alloc(9);
        data.writeUInt8(3, 0);
        data.writeBigUInt64LE(amount, 1);

        return new solanaWeb3.TransactionInstruction({
            keys,
            programId: TOKEN_PROGRAM_ID,
            data
        });
    },

    /**
     * Get SOL balance
     */
    async getSOLBalance(walletAddress) {
        const connection = this.getConnection();
        if (!connection) return 0;

        try {
            const pubkey = new solanaWeb3.PublicKey(walletAddress);
            const balance = await connection.getBalance(pubkey);
            return balance / solanaWeb3.LAMPORTS_PER_SOL;
        } catch (error) {
            console.error('Failed to get SOL balance:', error);
            return 0;
        }
    },

    /**
     * Get token balance
     */
    async getTokenBalance(walletAddress) {
        const connection = this.getConnection();
        if (!connection) return 0;

        if (!CONFIG.ASDF_TOKEN_MINT || CONFIG.ASDF_TOKEN_MINT === 'YOUR_TOKEN_MINT_ADDRESS_HERE') {
            return 0;
        }

        try {
            const pubkey = new solanaWeb3.PublicKey(walletAddress);
            const mintPubkey = new solanaWeb3.PublicKey(CONFIG.ASDF_TOKEN_MINT);
            const tokenAccount = await this.getAssociatedTokenAddress(pubkey, mintPubkey);

            const accountInfo = await connection.getTokenAccountBalance(tokenAccount);
            return parseFloat(accountInfo.value.uiAmount || 0);
        } catch (error) {
            console.error('Failed to get token balance:', error);
            return 0;
        }
    },

    /**
     * Verify a transaction exists and is confirmed
     */
    async verifyTransaction(signature, expectedAmount = null, expectedType = 'sol') {
        const connection = this.getConnection();
        if (!connection) {
            return { verified: false, error: 'Connection failed' };
        }

        try {
            const tx = await connection.getTransaction(signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0
            });

            if (!tx) {
                return { verified: false, error: 'Transaction not found' };
            }

            if (tx.meta?.err) {
                return { verified: false, error: 'Transaction failed on chain' };
            }

            return {
                verified: true,
                slot: tx.slot,
                blockTime: tx.blockTime,
                fee: tx.meta?.fee
            };
        } catch (error) {
            return { verified: false, error: error.message };
        }
    }
};

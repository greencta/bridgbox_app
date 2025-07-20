// src/App.jsx
import React, { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { ethers } from 'ethers';
// Import signInWithCustomToken instead of signInAnonymously
import { getAuth, signInWithCustomToken, signOut } from "firebase/auth";
import { getDoc, setDoc, doc } from "firebase/firestore";
import { db, auth } from './firebase';
import toast, { Toaster } from 'react-hot-toast';
import { useAppContext } from './context/AppContext.jsx';
import ConnectPage from './pages/ConnectPage';
import './App.css';

const MailPage = lazy(() => import('./pages/MailPage'));

// --- IMPORTANT: PASTE YOUR FUNCTION URLS HERE ---
const GET_NONCE_URL = "https://us-central1-irysmail-c41e8.cloudfunctions.net/getNonceToSign";
const VERIFY_SIGNATURE_URL = "https://us-central1-irysmail-c41e8.cloudfunctions.net/verifySignatureAndGetCustomToken";

const IRYS_NETWORK_CONFIG = {
    rpcUrl: "https://testnet-rpc.irys.xyz/v1/execution-rpc",
    chainId: 1270,
    chainName: "Irys Testnet",
    nativeCurrency: { name: "Irys", symbol: "IRYS", decimals: 18 },
    blockExplorerUrls: ["https://testnet-explorer.irys.xyz"],
};

export default function App() {
    const { session, setSession, isLoading, setIsLoading, error, setError } = useAppContext();
    const [isWalletReady, setIsWalletReady] = useState(false);

    const handleDisconnect = useCallback(async () => {
        if (auth.currentUser) await signOut(auth);
        setSession(null);
        localStorage.removeItem('walletAddress');
        toast.success("Disconnected");
    }, [setSession]);
    
    const handleAccountsChanged = useCallback(async (accounts) => {
        if (accounts.length === 0) {
            toast.error("Wallet disconnected. Please connect again.");
            await handleDisconnect();
        } else if (session && accounts[0].toLowerCase() !== session.wallet.address) {
            toast("Account changed. Please reconnect with the new account.");
            await handleDisconnect();
        }
    }, [handleDisconnect, session]);

    const handleChainChanged = useCallback(() => {
        toast.success("Network changed. Reloading app...");
        window.location.reload();
    }, []);

    useEffect(() => {
        if (window.ethereum && session) {
            const provider = window.ethereum;
            provider.on('accountsChanged', handleAccountsChanged);
            provider.on('chainChanged', handleChainChanged);

            return () => {
                provider.removeListener('accountsChanged', handleAccountsChanged);
                provider.removeListener('chainChanged', handleChainChanged);
            };
        }
    }, [session, handleAccountsChanged, handleChainChanged]);

    const addIrysNetwork = async (provider) => {
        try {
            await provider.send("wallet_addEthereumChain", [{
                chainId: `0x${IRYS_NETWORK_CONFIG.chainId.toString(16)}`,
                chainName: IRYS_NETWORK_CONFIG.chainName,
                rpcUrls: [IRYS_NETWORK_CONFIG.rpcUrl],
                nativeCurrency: IRYS_NETWORK_CONFIG.nativeCurrency,
                blockExplorerUrls: IRYS_NETWORK_CONFIG.blockExplorerUrls,
            }]);
        } catch (addError) {
            console.error("Failed to add Irys network:", addError);
            toast.error("Failed to add the Irys network to your wallet.");
        }
    };

    const connectWallet = useCallback(async () => {
        setError(null);
        setIsLoading(true);
        try {
            if (!window.ethereum) throw new Error("Wallet not found. Please install MetaMask.");

            const provider = new ethers.BrowserProvider(window.ethereum);
            await addIrysNetwork(provider);
            const signer = await provider.getSigner();
            const walletAddress = (await signer.getAddress()).toLowerCase();

            // Step 1: Get the nonce from your backend
            const nonceRes = await fetch(`${GET_NONCE_URL}?address=${walletAddress}`);
            if (!nonceRes.ok) throw new Error("Could not get nonce from server.");
            const { nonce } = await nonceRes.json();
            
            // Step 2: Sign the nonce
            const signature = await signer.signMessage(`I am signing my one-time nonce: ${nonce}`);

            // Step 3: Send signature to backend to get custom token
            const customTokenRes = await fetch(VERIFY_SIGNATURE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: walletAddress, signature: signature }),
            });
            if (!customTokenRes.ok) throw new Error("Signature verification failed.");
            const { token } = await customTokenRes.json();
            
            // Step 4: Sign in with the custom token
            await signInWithCustomToken(auth, token);

            const userDocRef = doc(db, 'users', walletAddress);
            let userDocSnap = await getDoc(userDocRef);
            let userData = userDocSnap.data();

            if (!userDocSnap.exists()) {
                toast.loading('Creating your Bridgbox profile...');
                userData = {
                    walletAddress: walletAddress, // The authUid field is no longer needed
                    username: '',
                    rejectedThreads: [],
                };
                await setDoc(userDocRef, userData);
            }

            const newSession = {
                wallet: { address: walletAddress },
                profile: userData,
            };
            setSession(newSession);
            localStorage.setItem('walletAddress', walletAddress);
            toast.success("Wallet Connected!");

        } catch (e) {
            console.error("Connection failed:", e);
            toast.error(e.message || "A critical error occurred.");
            await handleDisconnect();
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setError, setSession, handleDisconnect]);
    
     useEffect(() => {
        const reestablishSession = async (user) => {
            const savedAddress = localStorage.getItem('walletAddress');
            if (user && user.uid === savedAddress) {
                setIsLoading(true);
                try {
                    const userDocRef = doc(db, 'users', savedAddress);
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists()) {
                        const restoredSession = {
                            wallet: { address: savedAddress },
                            profile: userDocSnap.data(),
                        };
                        setSession(restoredSession);
                    } else {
                        localStorage.removeItem('walletAddress');
                    }
                } catch (e) {
                    console.error("Failed to re-establish session:", e);
                } finally {
                    setIsLoading(false);
                }
            } else {
                 setIsLoading(false);
            }
        };
        
        const unsubscribe = auth.onAuthStateChanged(user => {
            if (user) {
                reestablishSession(user);
            } else {
                setSession(null);
                setIsLoading(false);
            }
        });
        
        return () => unsubscribe();

    }, [setSession, setIsLoading]);

    useEffect(() => {
        if (window.ethereum) setIsWalletReady(true);
    }, []);

    if (isLoading) {
        return <div className="app-container">Loading...</div>;
    }

    if (session) {
        return (
            <Suspense fallback={<div className="app-container">Loading App...</div>}>
                <Toaster position="bottom-center" />
                <MailPage key={session.wallet.address} handleDisconnect={handleDisconnect} />
            </Suspense>
        );
    }

    return (
        <>
            <Toaster position="bottom-center" />
            <ConnectPage connectWallet={connectWallet} isLoading={isLoading} error={error} isWalletReady={isWalletReady} />
        </>
    );
}
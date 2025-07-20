// src/context/AppContext.jsx

import React, { createContext, useState, useContext, useEffect } from 'react';
import { getDatabase, ref, onValue, set, onDisconnect, serverTimestamp } from "firebase/database";
import { doc, setDoc } from 'firebase/firestore'; // Removed updateDoc
import { db, rtdb } from '../firebase';
import { ethers } from 'ethers';
// KeyManager, sodium, and toast are no longer needed here

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [session, setSession] = useState(null); 
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [onlineStatus, setOnlineStatus] = useState({});
  const [balance, setBalance] = useState(null);
  const [profilesCache, setProfilesCache] = useState({});
  // Removed isKeyMissing and enableE2EE

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        if (!window.ethereum) return;
        const provider = new ethers.BrowserProvider(window.ethereum);
        
        const eoaBalanceWei = await provider.getBalance(session.wallet.address);
        setBalance(parseFloat(ethers.formatEther(eoaBalanceWei)).toFixed(4));
      } catch (e) {
        console.error("Failed to fetch balance:", e);
        setBalance(null);
      }
    };
    
    if (session?.wallet?.address) {
      fetchBalance();
      const interval = setInterval(fetchBalance, 20000);
      return () => clearInterval(interval);
    } else {
      setBalance(null);
    }
  }, [session]);


  useEffect(() => {
    if (!session?.wallet?.address) return;

    const myAddress = session.wallet.address;
    const userStatusDatabaseRef = ref(rtdb, '/status/' + myAddress);
    const userStatusFirestoreRef = doc(db, 'users', myAddress);

    const isOfflineForDatabase = { state: 'offline', last_changed: serverTimestamp() };
    const isOnlineForDatabase = { state: 'online', last_changed: serverTimestamp() };
    const connectedRef = ref(rtdb, '.info/connected');

    const unsubscribe = onValue(connectedRef, (snapshot) => {
        if (snapshot.val() === false) {
            setDoc(userStatusFirestoreRef, { isOnline: false, lastSeen: serverTimestamp() }, { merge: true });
            return;
        }
        onDisconnect(userStatusDatabaseRef).set(isOfflineForDatabase).then(() => {
            set(userStatusDatabaseRef, isOnlineForDatabase);
            setDoc(userStatusFirestoreRef, { isOnline: true }, { merge: true });
        });
    });
    
    const statusRef = ref(rtdb, '/status');
    const onStatusChange = onValue(statusRef, (snapshot) => {
        const statuses = snapshot.val() || {};
        const onlineUsers = {};
        for (const address in statuses) {
            onlineUsers[address.toLowerCase()] = statuses[address].state === 'online';
        }
        setOnlineStatus(onlineUsers);
    });

    return () => {
        unsubscribe();
        onStatusChange();
    };
  }, [session]);


  const value = {
    session,
    setSession,
    isLoading,
    setIsLoading,
    error,
    setError,
    onlineStatus,
    balance,
    profilesCache,
    setProfilesCache,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};
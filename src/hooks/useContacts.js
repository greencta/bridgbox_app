import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export function useContacts(walletAddress) {
    const [contacts, setContacts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!walletAddress) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const contactsColRef = collection(db, 'users', walletAddress, 'contacts');
        
        const unsubscribe = onSnapshot(contactsColRef, (snap) => {
            const fetchedContacts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setContacts(fetchedContacts);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching contacts:", error);
            setIsLoading(false);
        });

        // Cleanup the listener when the component unmounts or walletAddress changes
        return () => unsubscribe();
    }, [walletAddress]);

    return { contacts, isLoading };
}
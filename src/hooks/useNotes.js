import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

export function useNotes(walletAddress) {
    const [notes, setNotes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!walletAddress) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const notesColRef = collection(db, 'users', walletAddress, 'notes');
        const q = query(notesColRef, orderBy('timestamp', 'desc'));
        
        const unsubscribe = onSnapshot(q, (snap) => {
            const fetchedNotes = snap.docs.map(doc => {
                const data = doc.data();
                return { 
                    id: doc.id, 
                    ...data,
                    // Convert Firestore timestamp to JS Date object
                    timestamp: data.timestamp?.toDate() 
                };
            });
            setNotes(fetchedNotes);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching notes:", error);
            setIsLoading(false);
        });

        // Cleanup the listener
        return () => unsubscribe();
    }, [walletAddress]);

    return { notes, isLoading };
}
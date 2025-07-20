import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, onSnapshot, getDoc, doc, limit, startAfter } from 'firebase/firestore';
import { db } from '../firebase';

const shortenAddress = (address) => address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : '';

export function useDriveFiles(walletAddress) {
    const [myUploads, setMyUploads] = useState([]);
    const [sharedFiles, setSharedFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // State for My Uploads pagination
    const [lastUploadDoc, setLastUploadDoc] = useState(null);
    const [hasMoreUploads, setHasMoreUploads] = useState(true);

    const fetchMyUploads = useCallback((loadMore = false) => {
        if (!walletAddress || (!hasMoreUploads && loadMore)) return;
        
        setIsLoading(true);

        let q = query(
            collection(db, 'driveFiles'),
            where('owner', '==', walletAddress.toLowerCase()),
            orderBy('timestamp', 'desc'),
            limit(15)
        );

        if (loadMore && lastUploadDoc) {
            q = query(q, startAfter(lastUploadDoc));
        }

        const unsubscribe = onSnapshot(q, (snap) => {
            const files = snap.docs.map(fileDoc => ({ 
                ...fileDoc.data(), 
                id: fileDoc.id,
                source: 'drive'
            }));
            
            setLastUploadDoc(snap.docs[snap.docs.length - 1]);
            setMyUploads(prev => loadMore ? [...prev, ...files] : files);
            if (snap.docs.length < 15) {
                setHasMoreUploads(false);
            }
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching drive files:", error);
            setIsLoading(false);
        });
        
        return unsubscribe;

    }, [walletAddress, lastUploadDoc, hasMoreUploads]);
    
    // --- THIS IS THE FIX ---
    // This useEffect now runs only when the walletAddress changes, breaking the loop.
    useEffect(() => {
        if (walletAddress) {
            const unsubscribe = fetchMyUploads();
            return () => unsubscribe();
        }
    }, [walletAddress]);


    // Fetch shared files (remains the same)
    useEffect(() => {
        if (!walletAddress) return;
        
        const q = query(
            collection(db, 'driveFiles'),
            where('sharedWith', 'array-contains', walletAddress.toLowerCase())
        );

        const unsubscribe = onSnapshot(q, async (snap) => {
            const files = await Promise.all(snap.docs.map(async (fileDoc) => {
                const fileData = fileDoc.data();
                const ownerProfileSnap = await getDoc(doc(db, 'users', fileData.owner));
                const ownerProfile = ownerProfileSnap.data();
                return {
                    ...fileData,
                    id: fileDoc.id,
                    source: 'shared',
                    sharedByShort: ownerProfile?.username || shortenAddress(fileData.owner),
                };
            }));
            setSharedFiles(files);
            setIsLoading(false); 
        }, (error) => {
            console.error("Error fetching shared files:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [walletAddress]);


    return { myUploads, sharedFiles, isLoading, fetchMyUploads, hasMoreUploads };
}
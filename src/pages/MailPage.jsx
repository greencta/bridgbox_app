import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, getDoc, doc, updateDoc, serverTimestamp, writeBatch, arrayUnion, deleteDoc, addDoc, arrayRemove } from 'firebase/firestore';
import { db, rtdb } from '../firebase';
import { ref, onChildAdded, off, remove, set } from "firebase/database";
import { useAppContext } from '../context/AppContext.jsx';
import toast from 'react-hot-toast';
import { useDriveFiles } from '../hooks/useDriveFiles.js';
import { useContacts } from '../hooks/useContacts.js';
import { useNotes } from '../hooks/useNotes.js'; // Import the notes hook
import getIrys from '../utils/irys.js';
import { Buffer } from 'buffer';

// --- Component Imports ---
import LeftNav from '../components/LeftNav';
const EmailList = lazy(() => import('../components/EmailList'));
const ComposeView = lazy(() => import('../components/ComposeView'));
const ProfileView = lazy(() => import('../components/ProfileView'));
const ContactsView = lazy(() => import('../components/ContactsView'));
const DriveView = lazy(() => import('../components/DriveView.jsx'));
const DetailView = lazy(() => import('../components/DetailView'));
const DashboardView = lazy(() => import('../components/DashboardView'));
const ZapsView = lazy(() => import('../components/ZapsView'));
const NotesView = lazy(() => import('../components/NotesView')); // Import the new Notes view


const LoadingFallback = () => (
    <div className="h-full flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
    </div>
);

const shortenAddress = (address) => address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : '';


export default function MailPage({ handleDisconnect }) {
    const { session, setSession, profilesCache, setProfilesCache } = useAppContext();
    const { wallet, profile } = session;

    // --- State Management ---
    const [currentView, setCurrentView] = useState('dashboard');
    const [selectedItem, setSelectedItem] = useState(null);
    const [allEmails, setAllEmails] = useState([]);
    const [isLoadingEmails, setIsLoadingEmails] = useState(true);
    const [profileViewInitialTab, setProfileViewInitialTab] = useState('profile');
    const [replyData, setReplyData] = useState(null);
    const [forwardData, setForwardData] = useState(null);
    const [emailSearchQuery, setEmailSearchQuery] = useState('');
    const [selectedThreadIds, setSelectedThreadIds] = useState([]);
    const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

    // --- State for Zaps and Drive ---
    const [zaps, setZaps] = useState([]);
    const zapsRef = useRef(zaps);
    useEffect(() => { zapsRef.current = zaps; }, [zaps]);

    const [isLoadingZaps, setIsLoadingZaps] = useState(true);
    const { myUploads, sharedFiles, isLoading: isLoadingDrive, fetchMyUploads, hasMoreUploads } = useDriveFiles(wallet?.address);

    // --- Data Fetching Hooks ---
    const { contacts, isLoading: isLoadingContacts } = useContacts(wallet?.address);
    const { notes, isLoading: isLoadingNotes } = useNotes(wallet?.address);
    
    const executeEmailZaps = async (newEmail) => {
        const currentZaps = zapsRef.current;
        const triggeredZaps = [];

        for (const zap of currentZaps) {
            if (zap.trigger?.type !== 'EMAIL_RECEIVED') continue;
            
            let fromAddressFilter = zap.trigger.filter?.fromAddress?.toLowerCase();
            if (!fromAddressFilter) continue;

            let resolvedFilterAddress = fromAddressFilter;
            
            if (fromAddressFilter.includes('@')) {
                try {
                    const username = fromAddressFilter.split('@')[0];
                    const usernameSnap = await getDoc(doc(db, 'usernames', username));
                    if (usernameSnap.exists()) {
                        resolvedFilterAddress = usernameSnap.data().walletAddress.toLowerCase();
                    } else {
                        continue;
                    }
                } catch (error) {
                    console.error("Error resolving username in Zap:", error);
                    continue;
                }
            }

            if (newEmail.from.toLowerCase() === resolvedFilterAddress) {
                triggeredZaps.push(zap);
            }
        }

        if (triggeredZaps.length > 0) {
            toast.success(`Triggered ${triggeredZaps.length} Zap(s) from new email!`);

            for (const zap of triggeredZaps) {
                const executionToast = toast.loading(`Executing Zap: ${zap.action.type}...`);
                try {
                    switch (zap.action.type) {
                        case 'SHARE_FILE': {
                            const { fileId, fileName, shareWith } = zap.action.params;
                            if (!fileId || !shareWith) throw new Error("Zap is misconfigured.");

                            let shareAddress = shareWith;
                            if (shareAddress.includes('@')) {
                                const username = shareAddress.split('@')[0];
                                const usernameSnap = await getDoc(doc(db, 'usernames', username));
                                if (!usernameSnap.exists()) throw new Error(`Username ${username} not found.`);
                                shareAddress = usernameSnap.data().walletAddress;
                            }

                            const fileToUpdateRef = doc(db, 'driveFiles', fileId);
                            await updateDoc(fileToUpdateRef, {
                                sharedWith: arrayUnion(shareAddress.toLowerCase()),
                            });

                            toast.success(`Zap executed: Shared '${fileName}' with ${shareWith}`, { id: executionToast, duration: 4000 });
                            break;
                        }
                        case 'SEND_EMAIL': {
                            const { to, subject, body } = zap.action.params;
                            if (!to || !subject) throw new Error("Zap is misconfigured for sending email.");

                            let resolvedToAddress = to;
                             if (to.includes('@')) {
                                const username = to.split('@')[0];
                                const usernameSnap = await getDoc(doc(db, 'usernames', username));
                                if (!usernameSnap.exists()) throw new Error(`Recipient username '${username}' not found.`);
                                resolvedToAddress = usernameSnap.data().walletAddress;
                            }

                            const allParticipants = [wallet.address, resolvedToAddress.toLowerCase()];

                            const emailData = {
                                from: wallet.address,
                                recipients: { to: [resolvedToAddress], cc: [], bcc: [] },
                                allParticipants: allParticipants,
                                subject: subject,
                                body: body,
                                timestamp: new Date().toISOString(),
                                readBy: [wallet.address],
                                threadId: [...allParticipants].sort().join('-') + `-${Date.now()}`,
                                attachments: [],
                                payment: null,
                                trashedBy: [],
                            };
                            
                            const irys = await getIrys();
                            const tags = [
                                { name: "Content-Type", value: "application/json" },
                                { name: "App-Name", value: "Bridgbox-Email-Lit" },
                                { name: "Thread-ID", value: emailData.threadId },
                                { name: "Recipient", value: resolvedToAddress.toLowerCase() }
                            ];

                            const receipt = await irys.upload(Buffer.from(JSON.stringify(emailData)), { tags });
                            emailData.id = receipt.id;

                            const notificationRef = ref(rtdb, `notifications/${resolvedToAddress.toLowerCase()}/${receipt.id}`);
                            await set(notificationRef, emailData);
                            
                            toast.success(`Zap executed: Email sent to ${to}`, { id: executionToast, duration: 4000 });
                            break;
                        }
                        default:
                            throw new Error(`Unsupported action type for email trigger: ${zap.action.type}`);
                    }
                } catch (error) {
                    console.error("Failed to execute Zap:", zap, error);
                    toast.error(error.message || `Failed to execute Zap`, { id: executionToast });
                }
            }
        }
    };

    const handleSendComplete = async (newEmail) => {
        setAllEmails(prevEmails => [newEmail, ...prevEmails]);
        handleSetView('sent');

        const threadId = newEmail.threadId || newEmail.id;
        const deletedFromSent = profile?.deletedFromSent || [];

        if (threadId && deletedFromSent.includes(threadId)) {
            const userDocRef = doc(db, 'users', wallet.address);
            try {
                await updateDoc(userDocRef, {
                    deletedFromSent: arrayRemove(threadId)
                });

                setSession(prev => {
                    const updatedDeletedFromSent = (prev.profile.deletedFromSent || []).filter(id => id !== threadId);
                    return { ...prev, profile: { ...prev.profile, deletedFromSent: updatedDeletedFromSent }};
                });
            } catch (error) {
                console.error("Failed to undelete thread from Sent folder:", error);
            }
        }
    };

    const fetchEmailsFromIrys = useCallback(async () => {
        if (!wallet?.address) return;
        setIsLoadingEmails(true);
        try {
            const irys = await getIrys();
            const lowerCaseAddress = wallet.address.toLowerCase();
            
            const sentQuery = irys.search("irys:transactions").tags([{ name: "App-Name", values: ["Bridgbox-Email-Lit"] }]).from([lowerCaseAddress]).sort("DESC").limit(50);
            const receivedQuery = irys.search("irys:transactions").tags([{ name: "App-Name", values: ["Bridgbox-Email-Lit"] }, { name: "Recipient", values: [lowerCaseAddress] }]).sort("DESC").limit(50);

            const [sentResults, receivedResults] = await Promise.all([ sentQuery.all(), receivedQuery.all() ]);
            
            const allResults = [...sentResults, ...receivedResults];
            allResults.sort((a, b) => b.timestamp - a.timestamp);
            const uniqueResults = allResults.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);

            const emails = await Promise.all(uniqueResults.map(async tx => {
                try {
                    const response = await fetch(`https://gateway.irys.xyz/${tx.id}`);
                    if (!response.ok) return null;
                    const emailData = await response.json();
                    return { ...emailData, id: tx.id, timestamp: new Date(emailData.timestamp) };
                } catch (e) {
                    console.error(`Failed to process email tx ${tx.id}`, e);
                    return null;
                }
            }));
            
            setAllEmails(emails.filter(Boolean));

        } catch (error) {
            console.error("Failed to fetch emails from Irys:", error);
        } finally {
            setIsLoadingEmails(false);
            setIsInitialLoadComplete(true);
        }
    }, [wallet?.address]);

    useEffect(() => {
        if (!isInitialLoadComplete || !wallet?.address) return;
        
        const notificationsRef = ref(rtdb, `notifications/${wallet.address.toLowerCase()}`);
        
        const listener = onChildAdded(notificationsRef, (snapshot) => {
            const newEmail = snapshot.val();
            
            setAllEmails(prevEmails => {
                if (prevEmails.some(email => email.id === newEmail.id)) {
                    return prevEmails;
                }
                return [newEmail, ...prevEmails];
            });

            toast.success(`New email from ${shortenAddress(newEmail.from)}!`);
            
            executeEmailZaps(newEmail);

            remove(snapshot.ref);
        });

        return () => off(notificationsRef, 'child_added', listener);
    }, [wallet?.address, isInitialLoadComplete]);


    const fetchZaps = useCallback(async () => {
        if (!session?.wallet?.address) return;
        setIsLoadingZaps(true);
        try {
            const irys = await getIrys();
            const results = await irys.search("irys:transactions").from([session.wallet.address]);
            
            const itemTransactions = results.filter(tx => 
                tx.tags.some(tag => tag.name === "App-Name" && (tag.value === "Bridgbox-Zaps" || tag.value === "Bridgbox-Escrows"))
            );

            const deactivatedIds = new Set();
            results.forEach(tx => {
                if (tx.tags.some(tag => tag.name === "App-Name" && tag.value === "Bridgbox-Deactivation")) {
                    const deactivatesTag = tx.tags.find(tag => tag.name === "Deactivates");
                    if (deactivatesTag) {
                        deactivatedIds.add(deactivatesTag.value);
                    }
                }
            });

            const activeZapPromises = itemTransactions
                .filter(tx => !deactivatedIds.has(tx.id))
                .map(async (tx) => {
                    try {
                        const response = await fetch(`https://gateway.irys.xyz/${tx.id}`);
                        if (!response.ok) return null;
                        const zapData = await response.json();
                        if (zapData.isActive !== false) {
                            return { ...zapData, irysTxId: tx.id };
                        }
                    } catch (e) {
                        console.error(`Failed to process transaction ${tx.id}:`, e);
                    }
                    return null;
                });
            
            const fetchedZaps = (await Promise.all(activeZapPromises)).filter(Boolean);
            setZaps(fetchedZaps.reverse());

        } catch (error) {
            console.error("Failed to fetch Zaps/Escrows from Irys:", error);
            toast.error("Could not load your items.");
        } finally {
            setIsLoadingZaps(false);
        }
    }, [session.wallet.address]);

    useEffect(() => {
        fetchEmailsFromIrys(); 
        fetchZaps();
    }, [wallet?.address, fetchZaps, fetchEmailsFromIrys]);

    useEffect(() => {
        const allAddresses = new Set();
        allEmails.forEach(email => { (email.allParticipants || []).forEach(p => allAddresses.add(p.toLowerCase())); });
        contacts.forEach(contact => allAddresses.add(contact.address.toLowerCase()));
        [...myUploads, ...sharedFiles].forEach(file => { if(file.owner) allAddresses.add(file.owner.toLowerCase()); });

        const fetchProfiles = async () => {
            const newProfiles = {};
            for (const address of allAddresses) {
                if (profilesCache[address]) continue;
                try {
                    const userDoc = await getDoc(doc(db, 'users', address));
                    if (userDoc.exists()) newProfiles[address] = userDoc.data();
                } catch (e) { console.error(`Failed to fetch profile for ${address}`, e); }
            }
            if (Object.keys(newProfiles).length > 0) setProfilesCache(prev => ({...prev, ...newProfiles}));
        };
        if (allAddresses.size > 0) fetchProfiles();

    }, [allEmails, contacts, myUploads, sharedFiles, setProfilesCache]);

    const isSentByMe = (message, myAddress) => message.from.toLowerCase() === myAddress.toLowerCase();

    const threads = useMemo(() => {
        const toMillis = (ts) => {
            if (!ts) return 0;
            if (ts.toDate) return ts.toDate().getTime();
            if (ts instanceof Date) return ts.getTime();
            const date = new Date(ts);
            return isNaN(date) ? 0 : date.getTime();
        };

        const validEmails = allEmails.filter(email => (email.threadId || email.id));

        const grouped = validEmails.reduce((acc, email) => {
            const threadId = email.threadId || email.id;
            if (!acc[threadId]) {
                acc[threadId] = { id: threadId, subject: email.subject, messages: [] };
            }
            acc[threadId].messages.push(email);
            return acc;
        }, {});

        const threadsArray = Object.values(grouped).map(thread => {
            thread.messages.sort((a, b) => toMillis(b.timestamp) - toMillis(a.timestamp));
            const lastMessage = thread.messages[0];
            const lastReadTimestamp = toMillis(profile?.readTimestamps?.[thread.id]);
            const lastMessageTimestamp = toMillis(lastMessage?.timestamp);
            const isUnread = !isSentByMe(lastMessage, wallet.address) && lastMessageTimestamp > lastReadTimestamp;
            return { ...thread, isUnread, type: 'email' };
        });

        threadsArray.sort((a, b) => {
            const timeA = toMillis(a.messages[0]?.timestamp);
            const timeB = toMillis(b.messages[0]?.timestamp);
            return timeB - timeA;
        });

        return threadsArray;
    }, [allEmails, wallet.address, profile]);
    
    const unreadInboxCount = useMemo(() => {
        const deletedFromInboxIds = new Set(profile?.deletedFromInbox || []);
        return threads.filter(thread => 
            !isSentByMe(thread.messages[0], wallet.address) && 
            thread.isUnread &&
            !deletedFromInboxIds.has(thread.id)
        ).length;
    }, [threads, wallet.address, profile]);

    const filteredEmailThreads = useMemo(() => {
        const myAddress = wallet.address.toLowerCase();
        const deletedFromInboxIds = new Set(profile?.deletedFromInbox || []);
        const deletedFromSentIds = new Set(profile?.deletedFromSent || []);
        
        let sourceThreads = [];

        if (currentView === 'inbox') {
            sourceThreads = threads.filter(thread => 
                thread.messages.some(m => m.recipients.to.some(r => r.toLowerCase() === myAddress)) &&
                !deletedFromInboxIds.has(thread.id)
            );
        } else if (currentView === 'sent') {
            sourceThreads = threads.filter(thread => 
                thread.messages.some(m => isSentByMe(m, myAddress)) &&
                !deletedFromSentIds.has(thread.id)
            );
        } else {
            return threads;
        }

        if (emailSearchQuery.trim() !== '') {
            const lowercasedQuery = emailSearchQuery.toLowerCase();
            return sourceThreads.filter(thread =>
                thread.subject.toLowerCase().includes(lowercasedQuery) ||
                (thread.messages[0]?.body && thread.messages[0].body.toLowerCase().includes(lowercasedQuery))
            );
        }
        return sourceThreads;
    }, [threads, currentView, wallet.address, emailSearchQuery, profile]);

    const inboxThreadCount = useMemo(() => {
        const myAddress = wallet.address.toLowerCase();
        const deletedFromInboxIds = new Set(profile?.deletedFromInbox || []);

        return threads.filter(thread =>
            thread.messages.some(m => m.recipients.to.some(r => r.toLowerCase() === myAddress)) &&
            !deletedFromInboxIds.has(thread.id)
        ).length;
    }, [threads, wallet.address, profile]);

    const handleSetView = (view, initialTab = 'profile') => {
        if (view === 'profile') setProfileViewInitialTab(initialTab);
        setSelectedItem(null);
        setCurrentView(view);
        setSelectedThreadIds([]);
    };

    const handleCompose = () => {
        setReplyData(null);
        setForwardData(null);
        handleSetView('compose');
    };

    const handleSelectItem = async (item) => {
        setSelectedItem(item);
        if (item.type === 'email' && item.isUnread) {
            const userDocRef = doc(db, 'users', wallet.address);
            try {
                await updateDoc(userDocRef, { [`readTimestamps.${item.id}`]: serverTimestamp() });
                setSession(prev => ({
                    ...prev,
                    profile: { ...prev.profile, readTimestamps: { ...prev.profile.readTimestamps, [item.id]: new Date() } }
                }));
            } catch (error) { console.error("Error marking email as read:", error); }
        }
    };

    const handleCloseDetail = () => {
        setSelectedItem(null);
    }

    const handleReply = async (threadToReplyTo) => {
        const lastMessage = threadToReplyTo.messages[0];
        setReplyData({ thread: threadToReplyTo, type: 'reply', decryptedBodyOfLastMessage: lastMessage.body });
        handleSetView('compose');
    };

    const handleToggleSelect = (threadId) => {
        setSelectedThreadIds(prev =>
            prev.includes(threadId)
                ? prev.filter(id => id !== threadId)
                : [...prev, threadId]
        );
    };
    
    const handleToggleSelectAll = () => {
        const allThreadIds = filteredEmailThreads.map(t => t.id);
        const areAllSelected = allThreadIds.length > 0 && selectedThreadIds.length === allThreadIds.length;
        if (areAllSelected) {
            setSelectedThreadIds([]);
        } else {
            setSelectedThreadIds(allThreadIds);
        }
    };

    const handleDelete = async () => {
        if (selectedThreadIds.length === 0) return;
        const loadingToast = toast.loading(`Deleting ${selectedThreadIds.length} conversation(s)...`);
        try {
            const userDocRef = doc(db, 'users', wallet.address);
            const deleteField = currentView === 'inbox' ? 'deletedFromInbox' : 'deletedFromSent';
            
            await updateDoc(userDocRef, {
                [deleteField]: arrayUnion(...selectedThreadIds)
            });
            
            setSession(prev => ({
                ...prev,
                profile: {
                    ...prev.profile,
                    [deleteField]: [...(prev.profile[deleteField] || []), ...selectedThreadIds]
                }
            }));
            
            setSelectedThreadIds([]);
            setSelectedItem(null);
            
            toast.success("Conversations moved to trash.", { id: loadingToast });
        } catch (error) {
            console.error("Error deleting conversations:", error);
            toast.error("Could not delete conversations.", { id: loadingToast });
        }
    };

    const handleDeleteFile = async (fileToDelete) => {
        if (!fileToDelete || !fileToDelete.id) return;

        if (fileToDelete.owner.toLowerCase() !== wallet.address.toLowerCase()) {
            return toast.error("You can only delete files that you own.");
        }

        const loadingToast = toast.loading('Deleting file...');
        try {
            const fileRef = doc(db, 'driveFiles', fileToDelete.id);
            await deleteDoc(fileRef);
            toast.success('File deleted successfully!', { id: loadingToast });
        } catch (error) {
            console.error('Error deleting file:', error);
            toast.error('Failed to delete file.', { id: loadingToast });
        }
    };

    const storageUsed = useMemo(() => {
        return myUploads.reduce((total, file) => total + (file.size || 0), 0);
    }, [myUploads]);

    const storageTotal = 5 * 1024 * 1024 * 1024; // 5 GB

    const renderMainContent = () => {
        const stats = {
            emailCount: inboxThreadCount,
            fileCount: myUploads.length + sharedFiles.length,
            contactCount: contacts.length
        };

        const isTraditionalEmailView = ['inbox', 'sent'].includes(currentView);

        if (selectedItem && isTraditionalEmailView) {
             return <DetailView selectedItem={selectedItem} onClose={handleCloseDetail} onReply={handleReply} onForward={() => {}} onProfileClick={() => handleSetView('profile', 'settings')} />;
        }

        switch (currentView) {
            case 'compose':
                return <ComposeView 
                            onCancel={() => handleSetView('dashboard')} 
                            onSendComplete={handleSendComplete} 
                            contacts={contacts} 
                            replyData={replyData} 
                            forwardData={forwardData}
                            driveFiles={[...myUploads, ...sharedFiles]}
                            isLoadingDrive={isLoadingDrive}
                        />;
            case 'profile':
                return <ProfileView />;
            case 'contacts':
                return <ContactsView contacts={contacts} isLoading={isLoadingContacts} />;
            case 'drive':
                 return (
                    <DriveView
                        myUploads={myUploads}
                        sharedFiles={sharedFiles}
                        isLoading={isLoadingDrive || isLoadingZaps}
                        contacts={contacts}
                        onDeleteFile={handleDeleteFile}
                        zaps={zaps}
                        fetchMyUploads={fetchMyUploads}
                        hasMoreUploads={hasMoreUploads}
                    />
                 );
            case 'inbox':
            case 'sent':
                 return (
                    <div className="flex h-full">
                        <div className="flex-1 overflow-y-auto">
                            <EmailList
                                threads={filteredEmailThreads}
                                onSelectThread={handleSelectItem}
                                isLoading={isLoadingEmails}
                                searchQuery={emailSearchQuery}
                                setSearchQuery={setEmailSearchQuery}
                                selectedThreadIds={selectedThreadIds}
                                onToggleSelect={handleToggleSelect}
                                onToggleSelectAll={handleToggleSelectAll}
                                onMarkAsRead={() => {}}
                                onDelete={handleDelete}
                                currentView={currentView}
                                contacts={contacts}
                            />
                        </div>
                        {selectedItem && (
                             <aside className="w-2/5 flex-shrink-0 border-l border-gray-200">
                                <DetailView
                                    selectedItem={selectedItem}
                                    onClose={handleCloseDetail}
                                    onReply={handleReply}
                                    onForward={() => {}}
                                    onProfileClick={() => handleSetView('profile', 'settings')}
                                    stats={stats}
                                    onCompose={handleCompose}
                                />
                            </aside>
                        )}
                    </div>
                );
            case 'zaps':
                return <ZapsView 
                           onZapsUpdated={fetchZaps}
                           driveFiles={myUploads}
                           isLoadingDrive={isLoadingDrive}
                       />;
            case 'notes':
                return <NotesView notes={notes} isLoading={isLoadingNotes} />;
            case 'dashboard':
            default:
                 return (
                    <DashboardView
                        stats={stats}
                        onCompose={handleCompose}
                        onSelectView={handleSetView}
                    />
                 );
        }
    };

    return (
        <div className="h-screen w-screen bg-white flex">
            <header className="w-64 border-r border-gray-200 flex-shrink-0">
                <LeftNav
                    currentView={currentView}
                    onSelectView={handleSetView}
                    onCompose={handleCompose}
                    onProfile={() => handleSetView('profile')}
                    onDisconnect={handleDisconnect}
                    unreadInboxCount={unreadInboxCount}
                    storageUsed={storageUsed}
                    storageTotal={storageTotal}
                />
            </header>

           <main className="flex-1 overflow-y-auto">
                 <Suspense fallback={<LoadingFallback />}>
                    {renderMainContent()}
                 </Suspense>
            </main>
        </div>
    );
}
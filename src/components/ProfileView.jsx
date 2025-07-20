import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, writeBatch, updateDoc } from "firebase/firestore";
import { db } from '../firebase';
import { useAppContext } from '../context/AppContext.jsx';
import toast from 'react-hot-toast';
import getIrys from '../utils/irys.js';
import { Buffer } from 'buffer';

const TabButton = ({ isActive, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
            isActive
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
        }`}
    >
        {children}
    </button>
);

export default function ProfileView() {
    const { session, setSession, setProfilesCache } = useAppContext();
    const { wallet, profile } = session;
    
    // State to manage the active tab
    const [activeTab, setActiveTab] = useState('profile');

    const [username, setUsername] = useState('');
    const [originalUsername, setOriginalUsername] = useState('');
    const [requirePoW, setRequirePoW] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isSavingPoW, setIsSavingPoW] = useState(false);
    const fileInputRef = useRef(null);
    
    useEffect(() => {
        if (profile) {
            setUsername(profile.username || '');
            setOriginalUsername(profile.username || '');
            setRequirePoW(profile.requirePoW || false);
        }
    }, [profile]);

    const handleAvatarClick = () => {
        fileInputRef.current.click();
    };

    const handleProfilePictureUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsUploading(true);
        const loadingToast = toast.loading('Uploading profile picture...');

        try {
            const irys = await getIrys();
            const data = await file.arrayBuffer();
            const buffer = Buffer.from(data);
            const tags = [{ name: "Content-Type", value: file.type || "application/octet-stream" }];
            const receipt = await irys.upload(buffer, { tags });

            const imageUrl = `https://gateway.irys.xyz/${receipt.id}`;
            const userDocRef = doc(db, 'users', wallet.address);
            await updateDoc(userDocRef, { profilePictureUrl: imageUrl });

            setSession(prev => ({
                ...prev,
                profile: { ...prev.profile, profilePictureUrl: imageUrl }
            }));
            
            setProfilesCache(prevCache => ({
                ...prevCache,
                [wallet.address.toLowerCase()]: {
                    ...(prevCache[wallet.address.toLowerCase()] || {}),
                    profilePictureUrl: imageUrl,
                }
            }));

            toast.success('Profile picture updated!', { id: loadingToast });
        } catch (error) {
            console.error("Error uploading profile picture:", error);
            toast.error("Failed to upload picture.", { id: loadingToast });
        } finally {
            setIsUploading(false);
        }
    };


    const handleSaveProfile = async () => {
        const newUsername = username.trim().toLowerCase();
        
        if (newUsername === originalUsername) {
            return toast.success('Your username is already set!');
        }
        
        if (newUsername.length < 3) {
            return toast.error('Username must be at least 3 characters long.');
        }
        if (!/^[a-z0-9_]+$/.test(newUsername)) {
            return toast.error('Username can only contain lowercase letters, numbers, and underscores.');
        }
        if (!wallet?.address) {
            return toast.error('Wallet is not connected.');
        }

        setIsLoading(true);
        const loadingToast = toast.loading('Checking username availability...');

        try {
            const usernameRef = doc(db, 'usernames', newUsername);
            const usernameSnap = await getDoc(usernameRef);

            if (usernameSnap.exists()) {
                throw new Error('This username is already taken.');
            }
            
            const batch = writeBatch(db);

            const userDocRef = doc(db, 'users', wallet.address);
            batch.update(userDocRef, { username: newUsername });

            batch.set(usernameRef, { walletAddress: wallet.address });

            if (originalUsername) {
                const oldUsernameRef = doc(db, 'usernames', originalUsername);
                batch.delete(oldUsernameRef);
            }
            
            await batch.commit();
            
            setProfilesCache(prevCache => ({
                ...prevCache,
                [wallet.address.toLowerCase()]: {
                    ...(prevCache[wallet.address.toLowerCase()] || {}),
                    username: newUsername,
                }
            }));

            setSession(prevSession => ({
                ...prevSession,
                profile: { ...prevSession.profile, username: newUsername }
            }));
            
            setOriginalUsername(newUsername);
            toast.success('Profile saved successfully!', { id: loadingToast });
        } catch (e) {
            toast.error(e.message || 'Error saving profile.', { id: loadingToast });
            console.error('Error saving profile ', e);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePoWToggle = async (event) => {
        const isEnabled = event.target.checked;
        setRequirePoW(isEnabled);
        setIsSavingPoW(true);
        const loadingToast = toast.loading('Saving spam filter setting...');

        try {
            const userDocRef = doc(db, 'users', wallet.address);
            await updateDoc(userDocRef, { requirePoW: isEnabled });

            setSession(prev => ({
                ...prev,
                profile: { ...prev.profile, requirePoW: isEnabled }
            }));

            toast.success('Spam filter setting updated!', { id: loadingToast });
        } catch (error) {
            console.error("Failed to update PoW setting:", error);
            toast.error("Could not save setting.", { id: loadingToast });
            setRequirePoW(!isEnabled);
        } finally {
            setIsSavingPoW(false);
        }
    };

    return (
        <div className="h-full p-6 flex flex-col bg-white text-gray-800">
            <div className="flex-shrink-0">
                <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
                
                {/* Tab Navigation */}
                <div className="mt-4 border-b border-gray-200">
                    <nav className="flex space-x-2" aria-label="Tabs">
                        <TabButton isActive={activeTab === 'profile'} onClick={() => setActiveTab('profile')}>
                            My Profile
                        </TabButton>
                        <TabButton isActive={activeTab === 'security'} onClick={() => setActiveTab('security')}>
                            Security
                        </TabButton>
                    </nav>
                </div>
            </div>
            
            <div className="flex-grow overflow-y-auto pt-6">
                {/* Conditional Rendering based on activeTab */}
                {activeTab === 'profile' && (
                    <div>
                        <div className="flex items-center space-x-6 mb-8">
                            <div className="relative">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleProfilePictureUpload}
                                    className="hidden"
                                    accept="image/*"
                                />
                                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer group" onClick={handleAvatarClick}>
                                    {isUploading ? (<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>)
                                        : profile?.profilePictureUrl ? (<img src={profile.profilePictureUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />)
                                        : (<span className="text-4xl font-bold text-gray-400">{profile?.username?.charAt(0).toUpperCase() || wallet?.address?.charAt(0).toUpperCase()}</span>)}
                                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">{profile?.username || 'Unnamed Profile'}</h2>
                                <p className="text-sm text-gray-500 font-mono mt-1">{wallet?.address}</p>
                            </div>
                        </div>

                        <div className="space-y-6 max-w-md">
                            <div>
                                <label htmlFor="username" className="block text-sm font-medium text-gray-700">Your Bridgbox Identity</label>
                                <div className="mt-1 flex rounded-md shadow-sm">
                                    <input type="text" name="username" id="username" placeholder="Choose your username" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md focus:ring-[#FF3142] focus:border-[#FF3142] sm:text-sm border-gray-300 bg-gray-50" />
                                    <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-100 text-gray-500 text-sm">@bridgbox.cloud</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">This is your unique, public-facing identity. Must be lowercase, no spaces.</p>
                            </div>
                            <div>
                                <button onClick={handleSaveProfile} disabled={isLoading || isUploading} className="w-full sm:w-auto px-6 py-2 bg-[#FF3142] text-white font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isLoading ? 'Saving...' : 'Save Profile'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                {activeTab === 'security' && (
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Spam & Phishing Protection</h2>
                        <p className="text-sm text-gray-600 mt-2 max-w-2xl">
                            Require unknown senders to perform a small computational task (Proof-of-Work) before their email can reach your inbox. This significantly reduces spam.
                        </p>
                        <div className="mt-4 flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200 max-w-md">
                            <span className="font-semibold text-gray-800">
                                Enable Proof-of-Work Filter
                            </span>
                            <label htmlFor="pow-toggle" className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    id="pow-toggle" 
                                    className="sr-only peer"
                                    checked={requirePoW}
                                    onChange={handlePoWToggle}
                                    disabled={isSavingPoW}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#FF3142]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF3142]"></div>
                            </label>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
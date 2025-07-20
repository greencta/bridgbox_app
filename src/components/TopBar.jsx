import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext.jsx';
import NotificationDropdown from './NotificationDropdown';
import Skeleton from './Skeleton.jsx';

const shortenAddress = (address) => address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : '';

const formatUserIdentifier = (profile, address) => {
    if (profile?.username) {
        return `${profile.username}@bridgbox.cloud`;
    }
    return shortenAddress(address);
};

export default function TopBar({ handleDisconnect, onProfile, notifications, onNotificationClick, onToggleMobileMenu }) {
    // --- THIS IS THE FIX ---
    // Get the new enableE2EE function from the context
    const { session, balance, isKeyMissing, profilesCache, enableE2EE } = useAppContext();
    const { wallet } = session || {};
    const profile = session?.profile || profilesCache[wallet?.address] || {};
    
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
    const profileDropdownRef = useRef(null);
    const notificationDropdownRef = useRef(null);
    
    const displayName = formatUserIdentifier(profile, wallet?.address);
    const unreadCount = notifications.length;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
                setIsProfileDropdownOpen(false);
            }
            if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target)) {
                setIsNotificationDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!wallet) {
        return <header className="h-[65px] flex-shrink-0"></header>;
    }

    return (
        <header className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-white sticky top-0 z-30">
            <div className="flex items-center justify-between">
                <button
                    onClick={onToggleMobileMenu}
                    className="p-2 rounded-full text-gray-500 hover:bg-gray-100"
                    aria-label="Open navigation menu"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                </button>

                <div className="flex-1 flex justify-end items-center space-x-4">
                    {/* --- THIS IS THE FIX --- */}
                    {/* This button will now appear if the user has a profile but no encryption key */}
                    {profile && !profile.encryptionPublicKey && (
                         <button
                            onClick={enableE2EE}
                            className="bg-yellow-400/20 text-yellow-800 font-bold px-4 py-1.5 rounded-lg hover:bg-yellow-400/40 transition-colors text-sm flex items-center space-x-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                            <span>Enable E2EE</span>
                        </button>
                    )}
                    
                    {profile?.encryptionPublicKey && isKeyMissing && (
                        <button
                            onClick={() => onProfile('settings')}
                            className="bg-red-500/10 text-red-700 font-bold px-4 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors text-sm flex items-center space-x-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <span>Restore/Regenerate Key</span>
                        </button>
                    )}
                    
                    <div className="relative" ref={notificationDropdownRef}>
                        <button
                            onClick={() => setIsNotificationDropdownOpen(prev => !prev)}
                            className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none relative"
                            aria-label="View notifications"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V5a1 1 0 00-2 0v.083A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 block h-3 w-3 rounded-full bg-red-500 ring-2 ring-white">
                                    <span className="sr-only">New notifications</span>
                                </span>
                            )}
                        </button>
                        {isNotificationDropdownOpen && (
                            <NotificationDropdown
                                notifications={notifications}
                                onNotificationClick={onNotificationClick}
                                onClose={() => setIsNotificationDropdownOpen(false)}
                            />
                        )}
                    </div>

                    <div className="relative" ref={profileDropdownRef}>
                        <button 
                            onClick={() => setIsProfileDropdownOpen(prev => !prev)} 
                            className="flex items-center space-x-3 focus:outline-none cursor-pointer"
                        >
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-900 font-bold overflow-hidden">
                                {profile?.profilePictureUrl ? (
                                    <img src={profile.profilePictureUrl} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-gray-700 text-sm">{displayName?.charAt(0).toUpperCase()}</span>
                                )}
                            </div>
                            <div className="hidden sm:flex flex-col items-start">
                                <span className="font-semibold text-gray-800 text-sm">{displayName}</span>
                                <span className="text-xs text-gray-500 font-mono">
                                    {balance !== null ? `${balance} IRYS` : <Skeleton className="h-3 w-16 mt-1" />}
                                </span>
                            </div>
                        </button>

                        {isProfileDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-50 border border-gray-200">
                                <div className="px-4 py-3 border-b border-gray-200">
                                    <p className="text-sm font-semibold text-gray-900">Signed in as</p>
                                    <p className="text-sm text-gray-500 truncate" title={displayName}>{displayName}</p>
                                </div>
                                <div className="px-4 py-3 border-b border-gray-200 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Wallet Balance:</span>
                                        <span className="text-sm font-mono text-gray-800">{balance !== null ? `${balance} IRYS` : '...'}</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => { onProfile(); setIsProfileDropdownOpen(false); }} 
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    Your Profile
                                </button>
                                <button 
                                    onClick={handleDisconnect} 
                                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                >
                                    Disconnect
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
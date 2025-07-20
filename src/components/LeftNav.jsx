import React from 'react';
import { useAppContext } from '../context/AppContext.jsx';
import bridgboxLogo from '../assets/logo.png';
import Skeleton from './Skeleton.jsx'; 
import StorageIndicator from './StorageIndicator.jsx';

const NavLink = ({ icon, text, isActive, onClick, count }) => (
    <a
        href="#"
        onClick={onClick}
        className={`flex items-center justify-between space-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
            isActive
            ? 'bg-gray-200 text-gray-900'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
    >
        <div className="flex items-center space-x-3">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon}></path></svg>
            <span>{text}</span>
        </div>
        {count > 0 && (
             <span className="px-2 py-0.5 text-xs font-bold bg-[#FF3142] text-white rounded-full">
                {count}
            </span>
        )}
    </a>
);

const SectionHeader = ({ title }) => (
    <h3 className="px-3 pt-4 pb-2 text-xs font-bold uppercase text-gray-400 tracking-wider">
        {title}
    </h3>
);

export default function LeftNav({ currentView, onSelectView, onCompose, onProfile, onDisconnect, unreadInboxCount, storageUsed, storageTotal }) {
    const { session, profilesCache, balance } = useAppContext();
    const profile = profilesCache[session.wallet.address.toLowerCase()] || {};
    const displayName = profile.username || `User ${session.wallet.address.substring(0,6)}`;

    return (
        <div className="h-full w-64 p-3 flex flex-col justify-between border-r border-gray-200 bg-gray-50">
            <div>
                <div className="p-3 mb-2">
                    <img src={bridgboxLogo} alt="Bridgbox Logo" className="h-8 w-auto" />
                </div>

                <div className="px-2 mb-4">
                    <button
                        onClick={onCompose}
                        className="w-full bg-[#FF3142] text-white font-bold py-3 px-4 rounded-full hover:opacity-90 transition-opacity shadow-lg"
                    >
                        Compose
                    </button>
                </div>

                <nav className="space-y-1">
                    <SectionHeader title="Views" />
                    <NavLink icon="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" text="Dashboard" isActive={currentView === 'dashboard'} onClick={() => onSelectView('dashboard')} />

                    <SectionHeader title="Mailbox" />
                    <NavLink icon="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0l-8 5-8-5" text="Inbox" isActive={currentView === 'inbox'} onClick={() => onSelectView('inbox')} count={unreadInboxCount} />
                    <NavLink icon="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" text="Sent" isActive={currentView === 'sent'} onClick={() => onSelectView('sent')} />
                    
                    <SectionHeader title="Tools" />
                    <NavLink icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" text="Contacts" isActive={currentView === 'contacts'} onClick={() => onSelectView('contacts')} />
                    {/* --- NEW LINK --- */}
                    <NavLink icon="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" text="My Notes" isActive={currentView === 'notes'} onClick={() => onSelectView('notes')} />
                    <NavLink icon="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" text="My Drive" isActive={currentView === 'drive'} onClick={() => onSelectView('drive')} />
                    <NavLink icon="M13 10V3L4 14h7v7l9-11h-7z" text="Zaps" isActive={currentView === 'zaps'} onClick={() => onSelectView('zaps')} />
                </nav>
            </div>
            
            <div>
                <div className="mb-2">
                    <StorageIndicator used={storageUsed} total={storageTotal} />
                </div>
                
                <div
                    onClick={onProfile}
                    className="flex items-center space-x-3 p-2 rounded-full hover:bg-gray-200 cursor-pointer"
                >
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {profile.profilePictureUrl ? (
                            <img src={profile.profilePictureUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <span className="font-bold text-gray-600 text-base">{displayName.charAt(0).toUpperCase()}</span>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">{displayName}</p>
                        {balance !== null ? (
                             <p className="text-xs text-gray-500 font-mono">{balance} $IRYS</p>
                        ) : (
                            <Skeleton className="h-3 w-16 mt-1" />
                        )}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onDisconnect(); }} className="text-xs text-red-500 hover:underline ml-auto">Disconnect</button>
                </div>
            </div>
        </div>
    );
}
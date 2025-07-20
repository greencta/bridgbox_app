import React, { useState, useEffect } from 'react';

// --- THIS IS THE FIX ---
// The text and background colors for the mobile links have been updated
// to match the light theme of the main sidebar.
const SidebarLink = ({ icon, text, count, isActive, onClick }) => (
    <a
        href="#"
        onClick={onClick}
        className={`flex justify-between items-center px-4 py-3 text-sm rounded-lg transition-colors ${
            isActive 
            ? 'bg-gray-200 text-gray-900 font-semibold' // Light mode active state
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900' // Light mode default state
        }`}
    >
        <div className="flex items-center space-x-3">
            {icon}
            <span>{text}</span>
        </div>
        {count > 0 && (
            <span className="px-2 py-0.5 text-xs font-bold bg-accent text-black rounded-full">
                {count}
            </span>
        )}
    </a>
);


export default function MobileMenu({ onCompose, onSelectView, currentView, onClose, chatCount, inboxCount }) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsMounted(true), 10);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose}>
            {/* --- THIS IS THE FIX --- */}
            {/* The background color of the mobile menu container has been changed from
              a dark '#181A20' to a light 'bg-gray-50' to match the rest of the app. */}
            <div 
                className={`fixed top-0 left-0 w-64 h-full bg-gray-50 p-4 flex flex-col space-y-4 shadow-lg transform transition-transform duration-300 ease-in-out ${
                    isMounted ? 'translate-x-0' : '-translate-x-full'
                }`}
                onClick={e => e.stopPropagation()}
            >
                <div className="px-4 pt-2">
                </div>

                <div className="px-4">
                    <button
                        onClick={() => { onCompose(); onClose(); }}
                        className="w-full bg-accent text-black font-bold py-2.5 px-4 rounded-lg hover:bg-accent/90 transition-colors shadow flex items-center justify-center space-x-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z"></path></svg>
                        <span>Create</span>
                    </button>
                </div>
                <nav className="flex-1 space-y-1 px-4">
                    <SidebarLink 
                        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0l-8 5-8-5"></path></svg>}
                        text="Inbox"
                        count={inboxCount}
                        isActive={currentView === 'inbox'} 
                        onClick={() => { onSelectView('inbox'); onClose(); }} 
                    />
                    <SidebarLink 
                        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>}
                        text="Sent" 
                        isActive={currentView === 'sent'} 
                        onClick={() => { onSelectView('sent'); onClose(); }} 
                    />
                    <SidebarLink
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>}
                        text="My Chat"
                        count={chatCount}
                        isActive={currentView === 'chat'}
                        onClick={() => { onSelectView('chat'); onClose(); }}
                    />
                    <SidebarLink
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>}
                        text="My Drive"
                        isActive={currentView === 'drive'}
                        onClick={() => { onSelectView('drive'); onClose(); }}
                    />
                    <SidebarLink
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>}
                        text="My Contacts"
                        isActive={currentView === 'contacts'}
                        onClick={() => { onSelectView('contacts'); onClose(); }}
                    />
                </nav>
            </div>
        </div>
    );
}
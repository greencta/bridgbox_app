import React from 'react';

const shortenAddress = (address) => address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : '';

export default function NotificationDropdown({ notifications, onNotificationClick, onClose }) {
    if (!notifications || notifications.length === 0) {
        return (
            // --- THIS IS THE FIX ---
            // The dark mode classes have been removed.
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                    No new notifications.
                </div>
            </div>
        );
    }

    return (
        // --- THIS IS THE FIX ---
        // The dark mode classes have been removed from the main container and its children.
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-50 border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200">
                <p className="text-sm font-semibold text-gray-900">Notifications</p>
            </div>
            <ul className="max-h-80 overflow-y-auto">
                {notifications.map(item => (
                    <li 
                        key={item.id} 
                        onClick={() => { 
                            onNotificationClick(item); 
                            onClose(); 
                        }} 
                        className="cursor-pointer hover:bg-gray-100"
                    >
                        {item.type === 'email' ? (
                            <div className="px-4 py-3 border-b border-gray-200 last:border-b-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                    New message from <span className="font-bold">{shortenAddress(item.from)}</span>
                                </p>
                                <p className="text-sm text-gray-600 truncate">{item.subject}</p>
                            </div>
                        ) : (
                            <div className="px-4 py-3 border-b border-gray-200 last:border-b-0 flex items-center space-x-3">
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                                <div>
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        New chat from <span className="font-bold">{item.senderName || shortenAddress(item.senderId)}</span>
                                    </p>
                                    <p className="text-sm text-gray-600 truncate">{item.body}</p>
                                </div>
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
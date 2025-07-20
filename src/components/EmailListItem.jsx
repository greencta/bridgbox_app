// src/components/EmailListItem.jsx
import React, { memo } from 'react';
import { useAppContext } from '../context/AppContext.jsx';

const shortenAddress = (address) => address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : '';

const Avatar = ({ name, profilePictureUrl }) => (
    <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
        {profilePictureUrl ? (
            <img src={profilePictureUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
            <span className="font-bold text-gray-600 text-sm">{name ? name.charAt(0).toUpperCase() : '?'}</span>
        )}
    </div>
);

const EmailListItem = ({ thread, isSelected, onSelect, onToggleSelect, contacts, currentView }) => {
    const { session, profilesCache } = useAppContext();
    const { wallet } = session;

    const lastMessage = thread.messages[0];
    const showUnreadIndicator = thread.isUnread && currentView !== 'sent';

    const isSentByMe = lastMessage.from.toLowerCase() === wallet.address.toLowerCase();
    const displayAddress = isSentByMe ? lastMessage.recipients?.to[0] : lastMessage.from;

    const displayProfile = displayAddress ? profilesCache[displayAddress.toLowerCase()] : null;
    const contact = contacts?.find(c => c.address.toLowerCase() === displayAddress?.toLowerCase());
    const displayName = displayProfile?.username || contact?.name || shortenAddress(displayAddress);
    const profilePictureUrl = displayProfile?.profilePictureUrl;

    let snippet = '';
    if (lastMessage.body) {
        const cleanBody = lastMessage.body.replace(/<(.|\n)*?>/g, '');
        if (cleanBody) {
             snippet = ` - ${cleanBody}`;
        }
    }

    const getDisplayDate = () => {
        if (!lastMessage.timestamp) return '';

        let date;
        if (typeof lastMessage.timestamp.toDate === 'function') {
            date = lastMessage.timestamp.toDate();
        } else {
            date = new Date(lastMessage.timestamp);
        }
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    return (
        <div onClick={onSelect} className={`flex items-center space-x-4 p-3 cursor-pointer group relative transition-colors duration-150 ${ isSelected ? 'bg-gray-200' : 'hover:bg-gray-100' } border-b border-gray-200`}>
            <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 text-[#FF3142] focus:ring-[#FF3142]"
                checked={isSelected}
                onClick={(e) => e.stopPropagation()}
                onChange={onToggleSelect}
            />
            <div className="w-2.5 flex-shrink-0">
                {showUnreadIndicator && (<div className="w-2.5 h-2.5 bg-[#FF3142] rounded-full"></div>)}
            </div>
            <Avatar name={displayName} profilePictureUrl={profilePictureUrl} />
            <div className="w-40 flex-shrink-0">
                <p className={`truncate ${showUnreadIndicator ? 'font-bold text-gray-900' : 'font-semibold text-gray-600'}`}>{displayName || 'Unknown'}</p>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm truncate">
                    <span className={showUnreadIndicator ? 'text-gray-900 font-bold' : 'text-gray-600'}>{thread.subject}</span>
                    <span className="text-gray-500 ml-2 font-normal">{snippet}</span>
                </p>
            </div>
            <div className={`w-24 text-right text-xs font-semibold ${showUnreadIndicator ? 'text-gray-800' : 'text-gray-500'} group-hover:hidden`}>
                {getDisplayDate()}
            </div>
        </div>
    );
};

export default memo(EmailListItem);
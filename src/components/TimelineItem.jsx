import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext.jsx';
import { formatRelativeTime } from '../utils/formatTimestamp.js';
import KeyManager from '../utils/KeyManager.js';

const Avatar = ({ address }) => {
    const { profilesCache } = useAppContext();
    const profile = profilesCache[address?.toLowerCase()] || {};
    const name = profile.username || address?.substring(0, 6) || '?';

    return (
        <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
            {profile.profilePictureUrl ? (
                <img src={profile.profilePictureUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
                <span className="font-bold text-gray-600 text-base">{name.charAt(0).toUpperCase()}</span>
            )}
        </div>
    );
};

const ChatContent = ({ item }) => {
    const { session } = useAppContext();
    const [decryptedSnippet, setDecryptedSnippet] = useState("Encrypted message...");

    useEffect(() => {
        const decryptSnippet = async () => {
            if (item.lastMessageEncrypted) {
                try {
                    // Create a temporary message object that KeyManager can understand
                    const tempMessage = {
                        senderPublicKey: item.lastMessageEncrypted.senderPublicKey,
                        encryptedBody: item.lastMessageEncrypted.encryptedBody
                    };
                    const body = await KeyManager.decrypt(session.wallet.address, tempMessage);
                    setDecryptedSnippet(body);
                } catch (e) {
                    console.error("Timeline snippet decryption failed:", e);
                    setDecryptedSnippet("Could not load preview.");
                }
            } else if (item.lastMessage) {
                // For older, unencrypted messages
                setDecryptedSnippet(item.lastMessage);
            }
        };
        decryptSnippet();
    }, [item, session.wallet.address]);

    return (
        <p className="text-sm text-gray-600 truncate italic">
            {decryptedSnippet}
        </p>
    );
};


export default function TimelineItem({ item, onSelectItem, onReply, onForward }) {
    const { profilesCache, session } = useAppContext();

    let icon, title, content, actorAddress, timestamp, isUnread = false;

    switch (item.type) {
        case 'email':
            const lastMessage = item.messages[0];
            const isSentByMe = lastMessage.from.toLowerCase() === session.wallet.address.toLowerCase();
            actorAddress = lastMessage.from;
            const otherUserAddress = isSentByMe ? lastMessage.recipients?.to[0] : lastMessage.from;
            const otherUser = profilesCache[otherUserAddress?.toLowerCase()] || {};
            const otherUserName = otherUser.username || otherUserAddress?.substring(0, 8);
            
            icon = 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z';
            title = isSentByMe ? `You emailed ${otherUserName}` : `New Email from ${otherUserName}`;
            
            const emailSnippet = lastMessage.body ? lastMessage.body.replace(/<(.|\n)*?>/g, '') : 'No text content';

            content = (
                <div>
                    <p className="font-bold text-gray-800">{item.subject}</p>
                    <p className="text-sm text-gray-500 truncate">{emailSnippet}</p>
                </div>
            );
            timestamp = item.timestamp;
            isUnread = item.isUnread;
            break;

        case 'chat':
            actorAddress = item.participants.find(p => p.toLowerCase() !== session.wallet.address.toLowerCase());
            const chatPartner = profilesCache[actorAddress?.toLowerCase()] || {};
            const chatPartnerName = chatPartner.username || actorAddress?.substring(0, 8);

            icon = 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z';
            title = `Chat with ${chatPartnerName}`;
            
            content = <ChatContent item={item} />;
            
            // This corrects the "Invalid Date" bug by using the correct timestamp field
            timestamp = item.lastMessageTimestamp?.toMillis ? item.lastMessageTimestamp.toMillis() : item.timestamp;
            isUnread = item.isUnread;
            break;
            
        case 'file':
            const isSharedWithMe = item.source === 'shared';
            actorAddress = item.owner;
            const owner = profilesCache[actorAddress?.toLowerCase()] || {};
            const ownerName = owner.username || item.sharedByShort;

            icon = 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
            title = isSharedWithMe ? `File shared by ${ownerName}` : `You uploaded a file`;
            content = (
                <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-100 flex items-center justify-center rounded-lg">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                    </div>
                    <div>
                        <p className="font-bold text-gray-800">{item.fileName}</p>
                        <p className="text-sm text-gray-500">{item.size ? `${(item.size / 1024).toFixed(2)} KB` : ''}</p>
                    </div>
                </div>
            );
            timestamp = item.timestamp;
            break;
            
        default:
            return null;
    }

    return (
        <div 
            onClick={() => onSelectItem(item)}
            className={`group bg-white p-4 rounded-lg border shadow-sm flex space-x-4 transition-colors relative cursor-pointer ${isUnread ? 'border-[#FF3142]' : 'border-gray-200'}`}
        >
            {isUnread && <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-[#FF3142] rounded-full"></div>}
            <Avatar address={actorAddress} />
            <div className="flex-1">
                <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
                    <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon}></path></svg>
                        <p>{title}</p>
                    </div>
                    <p className="text-xs">{formatRelativeTime(timestamp)}</p>
                </div>
                <div className="text-base">
                    {content}
                </div>
            </div>
            <div className="absolute bottom-2 right-2 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {item.type === 'email' && (
                    <>
                        <button onClick={(e) => {e.stopPropagation(); onReply(item)}} className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-1 px-2 rounded-md">Reply</button>
                        <button onClick={(e) => {e.stopPropagation(); onForward(item)}} className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-1 px-2 rounded-md">Forward</button>
                    </>
                )}
                {item.type === 'file' && (
                    <>
                        <button className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-1 px-2 rounded-md">Share</button>
                        <a href={`https://gateway.irys.xyz/${item.irysTxId}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-1 px-2 rounded-md">Download</a>
                    </>
                )}
            </div>
        </div>
    );
}
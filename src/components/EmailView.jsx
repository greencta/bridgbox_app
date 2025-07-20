import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext.jsx';
import Skeleton from './Skeleton.jsx';
import DOMPurify from 'dompurify';
import PaymentInfo from './PaymentInfo.jsx';
import toast from 'react-hot-toast';

const shortenAddress = (address) => address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : '';

const formatUserIdentifier = (profilesCache, address) => {
    if (!address) return 'Unknown';
    const profile = profilesCache[address.toLowerCase()];
    if (profile?.username) {
        return `${profile.username}@bridgbox.cloud`;
    }
    return shortenAddress(address);
};

const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const AttachmentPill = ({ attachment }) => {
    const [isDecrypting, setIsDecrypting] = useState(false); // Re-using state for loading indication

    const handleDownload = async () => {
        setIsDecrypting(true);
        const loadingToast = toast.loading('Downloading file...');

        try {
            const fileUrl = `https://gateway.irys.xyz/${attachment.irysTxId}`;
            
            const response = await fetch(fileUrl);
            if (!response.ok) throw new Error("Failed to fetch file from Irys gateway.");
            const blob = await response.blob();

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = attachment.fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Download complete!', { id: loadingToast });

        } catch (error) {
            console.error("Attachment download failed:", error);
            toast.error(error.message || "Could not download the file.", { id: loadingToast });
        } finally {
            setIsDecrypting(false);
        }
    };
    
    return (
        <button
            onClick={handleDownload}
            disabled={isDecrypting}
            className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 transition-colors p-2 rounded-lg max-w-xs disabled:opacity-50"
        >
            {isDecrypting ? (
                <div className="w-5 h-5 animate-spin rounded-full border-b-2 border-gray-800"></div>
            ) : (
                <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
            )}
            <div className="overflow-hidden text-left">
                <p className="text-sm font-medium text-gray-800 truncate">{attachment.fileName}</p>
                <p className="text-xs text-gray-500">{formatFileSize(attachment.size)}</p>
            </div>
        </button>
    );
};


const MessageCard = ({ message }) => {
    const { profilesCache } = useAppContext();
    const [decryptedBody, setDecryptedBody] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Since the body is no longer encrypted, we can set it directly.
        if (message && message.body) {
            setDecryptedBody(message.body);
        }
        setIsLoading(false);
    }, [message]);

    const sanitizedBody = DOMPurify.sanitize(decryptedBody || '');

    const senderDisplay = formatUserIdentifier(profilesCache, message.from);
    const toRecipients = message.recipients?.to?.map(address => formatUserIdentifier(profilesCache, address)).join(', ') || '';

    return (
        <div className="border-b border-gray-200 p-6 mb-4 bg-gray-50/50 mx-4 rounded-lg">
            <div className="mb-4 text-sm space-y-1">
                <div className="grid grid-cols-[auto,1fr] gap-x-4">
                    <span className="font-semibold text-gray-500">From:</span>
                    <span className="text-gray-800">{senderDisplay}</span>
                </div>
                <div className="grid grid-cols-[auto,1fr] gap-x-4">
                    <span className="font-semibold text-gray-500">To:</span>
                    <span className="text-gray-800">{toRecipients}</span>
                </div>
            </div>
            
            <PaymentInfo payment={message.payment} />

            <div className="border-t border-gray-200/80 pt-4">
                {isLoading ? (
                    <Skeleton className="h-20 w-full" />
                ) : error ? (
                    <div className="p-4 rounded-md bg-red-100 text-red-700 text-sm">{error}</div>
                ) : (
                    <div 
                        className="prose max-w-none text-gray-800 text-base leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: sanitizedBody }} 
                    />
                )}
            </div>

            {message.attachments && message.attachments.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200/80">
                    <h4 className="text-sm font-semibold text-gray-500 mb-3">Attachments ({message.attachments.length})</h4>
                    <div className="flex flex-wrap gap-3">
                        {message.attachments.map((att, index) => (
                            <AttachmentPill 
                                key={index} 
                                attachment={att}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};


export default function EmailView({ thread, onReply, onReplyAll, onClose, onForward }) {
    if (!thread) {
        return <div className="h-full flex items-center justify-center text-gray-400"><p>No conversation selected.</p></div>;
    }

    const lastMessage = thread.messages[0];
    const canReplyAll = (lastMessage.recipients?.to?.length + (lastMessage.recipients?.cc?.length || 0)) > 1;

    return (
        <div className="h-full flex flex-col bg-white">
            <div className="flex-shrink-0 p-6 border-b border-gray-200 flex items-start space-x-4">
                <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 md:hidden mt-1" title="Back to List">
                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                </button>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 truncate flex-1">{thread.subject}</h1>
            </div>
            
            <div className="flex-grow overflow-y-auto pt-4">
                {thread.messages.map(message => <MessageCard key={message.id} message={message} />)}
            </div>

            <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white/80 backdrop-blur-sm flex items-center space-x-2">
                <button
                    onClick={() => onReply(thread)}
                    className="flex-1 bg-gray-100 text-gray-800 font-bold py-2.5 px-4 rounded-lg hover:bg-gray-200 flex items-center justify-center space-x-2 transition-colors"
                >
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                     <span>Reply</span>
                </button>
                {canReplyAll && (
                    <button
                        onClick={() => onReplyAll(thread)}
                        className="flex-1 bg-gray-100 text-gray-800 font-bold py-2.5 px-4 rounded-lg hover:bg-gray-200 flex items-center justify-center space-x-2 transition-colors"
                    >
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6m9 12v-2a4 4 0 00-4-4H9"></path></svg>
                         <span>Reply All</span>
                    </button>
                )}
                <button
                    onClick={() => onForward(thread)}
                    className="flex-1 bg-gray-100 text-gray-800 font-bold py-2.5 px-4 rounded-lg hover:bg-gray-200 flex items-center justify-center space-x-2 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                    <span>Forward</span>
                </button>
            </div>
        </div>
    );
}
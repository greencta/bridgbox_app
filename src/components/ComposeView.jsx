// src/components/ComposeView.jsx

import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { doc, getDoc } from 'firebase/firestore';
import { db, rtdb } from '../firebase';
import { ref, set } from "firebase/database";
import { useAppContext } from '../context/AppContext.jsx';
import toast from 'react-hot-toast';
import getIrys from '../utils/irys';
import { Buffer } from 'buffer';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import AttachPaymentModal from './AttachPaymentModal';
import DrivePickerModal from './DrivePickerModal';

const isValidEthereumAddress = (addr) => { try { return ethers.isAddress(addr); } catch (e) { return false; } };
const shortenAddress = (address) => address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : '';
const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const AttachmentItem = ({ file, onRemove }) => (
    <div className="flex items-center justify-between bg-gray-100 p-2 rounded-md border border-gray-200">
        <div className="flex items-center space-x-2 overflow-hidden">
            <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            <span className="text-sm text-gray-700 truncate">{file.fileName || file.name}</span>
            <span className="text-xs text-gray-400 flex-shrink-0">{formatFileSize(file.size)}</span>
        </div>
        <button onClick={() => onRemove(file)} className="text-gray-500 hover:text-gray-800 flex-shrink-0">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
    </div>
);
const RecipientTag = ({ recipient, onRemove }) => (
    <div className="flex items-center bg-gray-200 text-gray-800 text-sm font-medium pl-3 pr-2 py-1 rounded-full">
        <span>{recipient.display}</span>
        <button onClick={() => onRemove(recipient.address)} className="ml-2 text-gray-500 hover:text-gray-900">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
    </div>
);

const PaymentPill = ({ payment, onRemove }) => (
    <div className="flex items-center justify-between bg-green-100 p-2 rounded-md border border-green-200">
        <div className="flex items-center space-x-2 overflow-hidden">
             <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            <span className="text-sm text-green-800 font-semibold">{payment.amount} {payment.token}</span>
        </div>
        <button onClick={onRemove} className="text-gray-500 hover:text-gray-800 flex-shrink-0">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
    </div>
);


export default function ComposeView({ onCancel, onSendComplete, replyData = null, forwardData = null, contacts = [], driveFiles = [], isLoadingDrive }) {
    const { session, profilesCache } = useAppContext();
    const { wallet } = session;

    const [recipients, setRecipients] = useState([]);
    const [currentInput, setCurrentInput] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [attachments, setAttachments] = useState([]);
    const fileInputRef = useRef(null);
    const recipientInputRef = useRef(null);
    const [suggestions, setSuggestions] = useState([]);
    const suggestionsRef = useRef(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [payment, setPayment] = useState(null);
    const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
    const attachMenuRef = useRef(null);
    const [isDrivePickerOpen, setIsDrivePickerOpen] = useState(false);

    useEffect(() => {
        function handleClickOutside(event) {
            if (attachMenuRef.current && !attachMenuRef.current.contains(event.target)) {
                setIsAttachMenuOpen(false);
            }
             if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
                setSuggestions([]);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [attachMenuRef, suggestionsRef]);


    useEffect(() => {
        if (currentInput.trim() === '') {
            setSuggestions([]);
            return;
        }
        const filteredSuggestions = contacts.filter(contact =>
            (contact.name.toLowerCase().includes(currentInput.toLowerCase()) ||
            contact.address.toLowerCase().includes(currentInput.toLowerCase())) &&
            !recipients.some(r => r.address === contact.address.toLowerCase())
        );
        setSuggestions(filteredSuggestions);
    }, [currentInput, contacts, recipients]);

    useEffect(() => {
        if (replyData) {
            const { thread, decryptedBodyOfLastMessage } = replyData;
            const lastMessage = thread.messages[0];
            setSubject(thread.subject.startsWith('Re: ') ? thread.subject : `Re: ${thread.subject}`);
            const date = lastMessage.timestamp?.toDate ? lastMessage.timestamp.toDate() : new Date(lastMessage.timestamp);
            const quotedBody = `<p><br></p><p>---</p><p>On ${date.toLocaleString()}, ${shortenAddress(lastMessage.from)} wrote:</p><blockquote>${decryptedBodyOfLastMessage || ''}</blockquote>`;
            setBody(quotedBody);

            const toAddresses = (lastMessage.recipients?.to || []).map(r => r.toLowerCase());
            const allParticipants = new Set([lastMessage.from.toLowerCase(), ...toAddresses]);
            allParticipants.delete(wallet.address.toLowerCase());

            const replyRecipients = [...allParticipants].map(address => ({
                address,
                display: profilesCache[address]?.username || shortenAddress(address)
            }));
            
            if (replyData.type === 'reply') {
                setRecipients([{ address: lastMessage.from.toLowerCase(), display: profilesCache[lastMessage.from.toLowerCase()]?.username || shortenAddress(lastMessage.from) }]);
            } else {
                setRecipients(replyRecipients);
            }

        } else if (forwardData) {
        }
    }, [replyData, forwardData, wallet.address, profilesCache]);
    
    const handleAttachFromDrive = (filesFromDrive) => {
        const driveAttachments = filesFromDrive.map(f => ({ ...f, source: 'drive' }));
        setAttachments(prev => [...prev, ...driveAttachments]);
    };

    const handleRemoveRecipient = (addressToRemove) => {
        setRecipients(recipients.filter(r => r.address !== addressToRemove));
    };

    const addRecipientFromSuggestion = (contact) => {
        if (!recipients.some(r => r.address === contact.address.toLowerCase())) {
            setRecipients([...recipients, {
                address: contact.address.toLowerCase(),
                display: contact.name
            }]);
        }
        setCurrentInput('');
        setSuggestions([]);
    };

    const processRecipientInput = async () => {
        let input = currentInput.trim();
        if (!input) return;

        if (recipients.some(r => r.display === input || r.address === input)) {
            toast.error("Recipient already added.");
            setCurrentInput('');
            return;
        }

        let resolvedAddress = '';
        let displayValue = input;

        if (input.endsWith('@bridgbox.cloud')) {
            const username = input.substring(0, input.lastIndexOf('@bridgbox.cloud'));
            const usernameRef = doc(db, 'usernames', username);
            const usernameSnap = await getDoc(usernameRef);
            if (usernameSnap.exists()) {
                resolvedAddress = usernameSnap.data().walletAddress;
            }
        } else if (isValidEthereumAddress(input)) {
            resolvedAddress = input;
            displayValue = shortenAddress(input);
        } else {
            toast.error(`Invalid recipient: ${input}`);
            return;
        }

        if (resolvedAddress) {
            if (!recipients.some(r => r.address === resolvedAddress.toLowerCase())) {
                setRecipients([...recipients, { address: resolvedAddress.toLowerCase(), display: displayValue }]);
            }
            setCurrentInput('');
        } else {
            toast.error(`Could not find user: ${input}`);
        }
    };

    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            processRecipientInput();
        } else if (e.key === 'Backspace' && currentInput === '' && recipients.length > 0) {
            e.preventDefault();
            handleRemoveRecipient(recipients[recipients.length - 1].address);
        }
    };

    const handleInputBlur = () => {
        processRecipientInput();
    };


    const handleFileSelect = (e) => {
        const newFiles = Array.from(e.target.files);
        setAttachments(prev => [...prev, ...newFiles]);
        e.target.value = null;
    };

    const handleRemoveAttachment = (fileToRemove) => {
        setAttachments(attachments.filter(f => f !== fileToRemove));
    };

    const handleSend = async (event) => {
        event.preventDefault();
        if (recipients.length === 0) return toast.error('Please add at least one recipient.');
        if (!subject.trim()) return toast.error('A subject is required.');

        setIsSending(true);
        let loadingToast = toast.loading('Preparing message...');

        try {
            const allAllowedAddresses = [wallet.address, ...recipients.map(r => r.address)];
            const paymentInfo = { ...payment }; 

            if (paymentInfo && paymentInfo.amount > 0) {
                toast.loading('Waiting for payment confirmation...', { id: loadingToast });
                if (!window.ethereum) throw new Error("Wallet not found.");

                const provider = new ethers.BrowserProvider(window.ethereum);
                const signer = await provider.getSigner();

                const tx = await signer.sendTransaction({
                    to: recipients[0].address,
                    value: ethers.parseEther(paymentInfo.amount.toString())
                });

                toast.loading('Waiting for transaction to be mined...', { id: loadingToast });
                const receipt = await tx.wait();
                
                paymentInfo.txHash = receipt.hash;
            }

            let processedAttachments = [];
            if (attachments.length > 0) {
                toast.loading(`Uploading ${attachments.length} attachment(s)...`, { id: loadingToast });
                const irys = await getIrys();
                
                for (const file of attachments) {
                    let fileData;
                    if (file instanceof File) {
                        fileData = await file.arrayBuffer();
                    } else {
                        const response = await fetch(`https://gateway.irys.xyz/${file.irysTxId}`);
                        if (!response.ok) throw new Error(`Failed to fetch attachment: ${file.fileName}`);
                        fileData = await response.arrayBuffer();
                    }

                    const buffer = Buffer.from(fileData);
                    const receipt = await irys.upload(buffer, {
                        tags: [{ name: "Content-Type", value: file.type || file.mimeType }]
                    });

                    processedAttachments.push({
                        fileName: file.name || file.fileName,
                        irysTxId: receipt.id,
                        size: file.size,
                        mimeType: file.type || file.mimeType,
                    });
                }
            }

            toast.loading('Uploading message to Irys...', { id: loadingToast });
            const emailData = {
                from: wallet.address,
                recipients: { to: recipients.map(r => r.address), cc: [], bcc: [] },
                allParticipants: allAllowedAddresses,
                subject: subject.trim(),
                body: body,
                timestamp: new Date().toISOString(),
                readBy: [wallet.address],
                threadId: replyData ? replyData.thread.id : [...allAllowedAddresses].sort().join('-') + `-${Date.now()}`,
                attachments: processedAttachments,
                payment: paymentInfo && paymentInfo.amount > 0 ? paymentInfo : null,
                trashedBy: [],
            };

            const irys = await getIrys();
            const tags = [
                { name: "Content-Type", value: "application/json" },
                { name: "App-Name", value: "Bridgbox-Email-Lit" },
                { name: "Thread-ID", value: emailData.threadId }
            ];
            recipients.forEach(r => tags.push({ name: "Recipient", value: r.address }));

            const dataToUpload = JSON.stringify(emailData);
            
            const receipt = await irys.upload(dataToUpload, { tags });

            emailData.id = receipt.id;

            for (const recipient of recipients) {
                const notificationRef = ref(rtdb, `notifications/${recipient.address.toLowerCase()}/${receipt.id}`);
                await set(notificationRef, emailData);
            }

            toast.success('Message sent successfully!', { id: loadingToast });
            onSendComplete(emailData);

        } catch (e) {
            console.error("Error sending message:", e);
            toast.error(e.reason || e.message || 'Failed to send message.', { id: loadingToast });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <form className="h-full p-6 flex flex-col bg-white text-gray-800" onSubmit={handleSend}>
            <h1 className="text-3xl font-bold border-b border-gray-200 pb-4 mb-6 text-gray-900">
                {replyData || forwardData ? subject : 'New Message'}
            </h1>
            <div className="flex-grow flex flex-col space-y-4 min-h-0">
                <div className="relative">
                    <div className="w-full p-2 bg-gray-50 border border-gray-300 rounded-md flex items-center flex-wrap gap-2 focus-within:ring-2 focus-within:ring-[#FF3142]" onClick={() => recipientInputRef.current?.focus()}>
                        <span className="text-gray-500 font-semibold ml-1">To:</span>
                        {recipients.map(recipient => <RecipientTag key={recipient.address} recipient={recipient} onRemove={handleRemoveRecipient} />)}
                        <input ref={recipientInputRef} type="text" value={currentInput} onChange={(e) => setCurrentInput(e.target.value)} onKeyDown={handleInputKeyDown} onBlur={handleInputBlur} className="flex-grow bg-transparent p-1 focus:outline-none min-w-[120px]" disabled={!!replyData && recipients.length > 0} />
                    </div>
                    {suggestions.length > 0 && (
                        <ul ref={suggestionsRef} className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {suggestions.map(contact => (
                                <li key={contact.id} onMouseDown={(e) => { e.preventDefault(); addRecipientFromSuggestion(contact); }} className="px-4 py-2 cursor-pointer hover:bg-gray-100">
                                    <p className="font-semibold text-gray-900">{contact.name}</p>
                                    <p className="text-xs text-gray-500 font-mono">{shortenAddress(contact.address)}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <input type="text" name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="w-full p-3 bg-gray-50 border border-gray-300 rounded-md focus:ring-[#FF3142] focus:border-[#FF3142]" />

                <div className="flex-grow min-h-0 bg-white text-gray-800 rounded-md">
                    <ReactQuill theme="snow" value={body} onChange={setBody} className="h-full flex flex-col" placeholder="Your message..." modules={{ toolbar: [[{ 'header': [1, 2, false] }], ['bold', 'italic', 'underline','strike', 'blockquote'], [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}], ['link', 'image'], ['clean']] }} />
                </div>

                <div className="space-y-2 max-h-32 overflow-y-auto p-2 border-t border-gray-200">
                    {payment && <PaymentPill payment={payment} onRemove={() => setPayment(null)} />}
                    {attachments.map((file, index) => <AttachmentItem key={index} file={file} onRemove={() => handleRemoveAttachment(file)} />)}
                </div>
            </div>

            <div className="pt-4 mt-4 border-t border-gray-200 flex justify-between items-center">
                <div className="relative">
                    <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                    {isAttachMenuOpen && (
                        <div ref={attachMenuRef} className="absolute bottom-full mb-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                            <ul>
                                <li><button type="button" onClick={() => { fileInputRef.current?.click(); setIsAttachMenuOpen(false); }} className="w-full flex items-center space-x-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg><span>Attach from Computer</span></button></li>
                                <li><button type="button" onClick={() => { setIsDrivePickerOpen(true); setIsAttachMenuOpen(false); }} className="w-full flex items-center space-x-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg><span>Attach from My Drive</span></button></li>
                                <li><button type="button" onClick={() => { setIsPaymentModalOpen(true); setIsAttachMenuOpen(false); }} disabled={!!payment} className="w-full flex items-center space-x-3 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01M12 16v-1m0 1v.01M12 8a4 4 0 00-4 4h8a4 4 0 00-4-4z"></path></svg><span>Attach Payment</span></button></li>
                            </ul>
                        </div>
                    )}
                    <button type="button" onClick={() => setIsAttachMenuOpen(p => !p)} className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors" title="Attach" disabled={isSending}>
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                    </button>
                </div>

                <div className="flex items-center space-x-3">
                    <button type="button" onClick={onCancel} disabled={isSending} className="text-gray-600 font-bold px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 disabled:opacity-50">Cancel</button>
                    <button
                        type="submit"
                        disabled={isSending || recipients.length === 0 || !subject.trim()}
                        className="bg-[#FF3142] text-white font-bold px-6 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSending ? 'Sending...' : 'Send'}
                    </button>
                </div>
            </div>
            
            {isPaymentModalOpen && (
                <AttachPaymentModal 
                    onClose={() => setIsPaymentModalOpen(false)}
                    onAttach={(p) => { setPayment(p); setIsPaymentModalOpen(false); }}
                />
            )}
            {isDrivePickerOpen && (
                <DrivePickerModal
                    files={driveFiles}
                    isLoading={isLoadingDrive}
                    onClose={() => setIsDrivePickerOpen(false)}
                    onAttach={handleAttachFromDrive}
                />
            )}
        </form>
    );
}
import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase.js';

const isValidEthereumAddress = (addr) => { try { return ethers.isAddress(addr); } catch { return false; } };
const shortenAddress = (address) => address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : '';

export default function ShareFileModal({ fileToShare, contacts = [], onClose, onShareSuccess }) {
    const [recipient, setRecipient] = useState('');
    const [isSharing, setIsSharing] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const suggestionsRef = useRef(null);

    useEffect(() => {
        if (recipient.trim() === '') {
            setSuggestions([]);
            return;
        }
        const filteredSuggestions = contacts.filter(contact =>
            (contact.name.toLowerCase().includes(recipient.toLowerCase()) ||
            contact.address.toLowerCase().includes(recipient.toLowerCase())) &&
            !fileToShare.sharedWith.includes(contact.address.toLowerCase())
        );
        setSuggestions(filteredSuggestions);
    }, [recipient, contacts, fileToShare]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
                setSuggestions([]);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [suggestionsRef]);


    const handleShare = async () => {
        const ident = recipient.trim().toLowerCase();
        if (!ident) {
            return toast.error("Please enter a recipient.");
        }

        setIsSharing(true);
        const loadingToast = toast.loading("Sharing file...");

        try {
            // 1. Resolve Recipient Address
            let resolvedAddress = '';
            const contact = contacts.find(c => c.name.toLowerCase() === ident || c.address.toLowerCase() === ident);

            if (contact) {
                resolvedAddress = contact.address.toLowerCase();
            } else if (ident.endsWith('@bridgbox.cloud')) {
                const username = ident.split('@')[0];
                const usernameRef = doc(db, 'usernames', username);
                const usernameSnap = await getDoc(usernameRef);
                if (!usernameSnap.exists()) throw new Error(`Username '${username}' not found.`);
                resolvedAddress = usernameSnap.data().walletAddress;
            } else if (isValidEthereumAddress(ident)) {
                resolvedAddress = ident;
            } else {
                throw new Error("Invalid address or username format.");
            }

            if (fileToShare.sharedWith.includes(resolvedAddress)) {
                throw new Error("File is already shared with this user.");
            }

            // 2. Update the Firestore document
            const fileDocRef = doc(db, 'driveFiles', fileToShare.id);
            await updateDoc(fileDocRef, {
                sharedWith: arrayUnion(resolvedAddress)
            });

            toast.success("File shared successfully!", { id: loadingToast });
            onShareSuccess();
            
        } catch (error) {
            console.error("Error sharing file:", error);
            toast.error(error.message || "Failed to share file.", { id: loadingToast });
        } finally {
            setIsSharing(false);
        }
    };

    const selectSuggestion = (contact) => {
        setRecipient(contact.name);
        setSuggestions([]);
    }

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Share File</h2>
                <p className="text-sm text-gray-500 mb-4 truncate">Sharing: <span className="font-semibold">{fileToShare.fileName}</span></p>

                <div className="relative">
                    <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 mb-1">Recipient</label>
                    <input
                        type="text"
                        name="recipient"
                        id="recipient"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        placeholder="Enter name, username or 0x address"
                        className="w-full p-2 bg-gray-50 border border-gray-300 rounded-md focus:ring-accent focus:border-accent text-gray-900"
                    />
                     {suggestions.length > 0 && (
                        <ul ref={suggestionsRef} className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                            {suggestions.map(contact => (
                                <li
                                    key={contact.id}
                                    onClick={() => selectSuggestion(contact)}
                                    className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                                >
                                    <p className="font-semibold text-gray-900">{contact.name}</p>
                                    <p className="text-xs text-gray-500 font-mono">{shortenAddress(contact.address)}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>


                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} disabled={isSharing} className="text-gray-600 font-bold px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors">Cancel</button>
                    <button onClick={handleShare} disabled={isSharing} className="bg-[#FF3142] text-white font-bold px-6 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50">
                        {isSharing ? 'Sharing...' : 'Share'}
                    </button>
                </div>
            </div>
        </div>
    );
}
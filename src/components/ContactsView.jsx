import React, { useState } from 'react';
import { ethers } from 'ethers';
import { collection, addDoc, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useAppContext } from '../context/AppContext.jsx';
import toast from 'react-hot-toast';
import Skeleton from './Skeleton.jsx';

const shortenAddress = (address) => address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : '';
const isValidEthereumAddress = (addr) => { try { return ethers.isAddress(addr); } catch { return false; } };

const ContactListItemSkeleton = () => (
    <div className="flex justify-between items-center p-4 border-b border-gray-200 animate-pulse">
        <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-3 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="h-8 bg-gray-200 rounded-md w-16"></div>
    </div>
);

const EmptyContactsState = () => (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
        <h2 className="mt-4 text-lg font-medium text-gray-600">No Contacts Yet</h2>
        <p className="mt-1 text-sm text-gray-500">
            Use the form above to add your first contact.
        </p>
    </div>
);

export default function ContactsView({ contacts, isLoading }) {
    const { session } = useAppContext();
    const { wallet } = session;

    const [newName, setNewName] = useState('');
    const [identifier, setIdentifier] = useState('');
    
    const [editingContactId, setEditingContactId] = useState(null);
    const [editingContactName, setEditingContactName] = useState('');

    const handleAddContact = async () => {
        const name = newName.trim();
        const ident = identifier.trim().toLowerCase();

        if (!name || !ident) return toast.error('Please fill out all fields.');
        if (!wallet?.address) return toast.error('Wallet not connected.');

        const loadingToast = toast.loading('Resolving contact...');
        let resolvedAddress = '';

        try {
            // --- THIS IS THE FIX ---
            // The hardcoded value is changed from '@irysmail.cloud' to '@bridgbox.cloud'
            if (ident.endsWith('@bridgbox.cloud')) {
                const username = ident.split('@')[0];
                const usernameRef = doc(db, 'usernames', username);
                const usernameSnap = await getDoc(usernameRef);

                if (usernameSnap.exists()) {
                    resolvedAddress = usernameSnap.data().walletAddress;
                } else {
                    throw new Error(`Username '${username}' not found.`);
                }
            } 
            else if (isValidEthereumAddress(ident)) {
                resolvedAddress = ident;
            } 
            else {
                throw new Error("Invalid address or username format.");
            }

            if (contacts.some(c => c.address.toLowerCase() === resolvedAddress)) {
                throw new Error("This address is already in your contacts.");
            }

            toast.loading('Adding contact...', { id: loadingToast });
            
            const contactsColRef = collection(db, 'users', wallet.address, 'contacts');
            await addDoc(contactsColRef, {
                name: name,
                address: resolvedAddress
            });
            
            setNewName('');
            setIdentifier('');
            toast.success('Contact added!', { id: loadingToast });

        } catch (e) {
            console.error("Error adding contact:", e);
            toast.error(e.message || 'Failed to add contact.', { id: loadingToast });
        }
    };

    const handleDeleteContact = async (contactId) => {
        if (!wallet?.address) return toast.error('Wallet not connected.');
        
        const loadingToast = toast.loading('Deleting contact...');
        try {
            const contactDocRef = doc(db, 'users', wallet.address, 'contacts', contactId);
            await deleteDoc(contactDocRef);
            toast.success('Contact deleted!', { id: loadingToast });
        } catch (e) {
            console.error("Error deleting contact:", e);
            toast.error('Failed to delete contact.', { id: loadingToast });
        }
    };

    const handleSaveEdit = async (contactId) => {
        if (!editingContactName.trim()) {
            return toast.error("Contact name cannot be empty.");
        }
        if (!wallet?.address) return toast.error('Wallet not connected.');

        const loadingToast = toast.loading('Saving contact...');
        try {
            const contactDocRef = doc(db, 'users', wallet.address, 'contacts', contactId);
            await updateDoc(contactDocRef, {
                name: editingContactName.trim()
            });
            toast.success('Contact updated!', { id: loadingToast });
            setEditingContactId(null);
        } catch (e) {
            console.error("Error updating contact:", e);
            toast.error('Failed to update contact.', { id: loadingToast });
        }
    };
    
    const startEditing = (contact) => {
        setEditingContactId(contact.id);
        setEditingContactName(contact.name);
    };

    const cancelEditing = () => {
        setEditingContactId(null);
        setEditingContactName('');
    };

    return (
        <div className="h-full p-6 flex flex-col bg-white text-gray-800">
            <h1 className="text-3xl font-bold border-b border-gray-200 pb-4 mb-6 text-gray-900">My Contacts</h1>
            
            <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50 shadow-sm">
                <h2 className="text-xl font-semibold mb-3 text-gray-900">Add New Contact</h2>
                <div className="space-y-3">
                    <input 
                        type="text" 
                        value={newName} 
                        onChange={(e) => setNewName(e.target.value)} 
                        placeholder="Contact Name (e.g., Alice)" 
                        className="w-full p-2 bg-white border border-gray-300 rounded-md focus:ring-[#FF3142] focus:border-[#FF3142]"
                    />
                    <input 
                        type="text" 
                        value={identifier} 
                        onChange={(e) => setIdentifier(e.target.value)} 
                        placeholder="Username (e.g., alice@bridgbox.cloud) or 0x..." 
                        className="w-full p-2 bg-white border border-gray-300 rounded-md focus:ring-[#FF3142] focus:border-[#FF3142]"
                    />
                    <div className="flex justify-end">
                        <button onClick={handleAddContact} className="bg-[#FF3142] text-white font-bold px-6 py-2 rounded-lg hover:opacity-90 transition-colors">
                            Add Contact
                        </button>
                    </div>
                </div>
            </div>

            <h2 className="text-xl font-semibold mb-3 text-gray-900">Contact List ({contacts.length})</h2>
            <div className="flex-grow overflow-y-auto border border-gray-200 rounded-lg bg-white">
                {isLoading ? (
                    <div>{[...Array(5)].map((_, i) => <ContactListItemSkeleton key={i} />)}</div>
                ) : contacts.length === 0 ? (
                    <EmptyContactsState />
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {contacts.map((contact) => (
                            <li key={contact.id} className="flex justify-between items-center p-4 hover:bg-gray-50">
                                {editingContactId === contact.id ? (
                                    <>
                                        <div className="flex-1">
                                            <input 
                                                type="text"
                                                value={editingContactName}
                                                onChange={(e) => setEditingContactName(e.target.value)}
                                                className="w-full p-2 bg-white border border-gray-300 rounded-md focus:ring-[#FF3142] focus:border-[#FF3142] text-gray-800"
                                            />
                                        </div>
                                        <div className="flex items-center space-x-2 ml-4">
                                            <button onClick={() => handleSaveEdit(contact.id)} className="text-green-600 hover:text-green-500 font-semibold text-sm">Save</button>
                                            <button onClick={cancelEditing} className="text-gray-500 hover:text-gray-800 font-semibold text-sm">Cancel</button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <p className="font-semibold text-gray-900">{contact.name}</p>
                                            <p className="text-sm text-gray-500">{shortenAddress(contact.address)}</p>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <button onClick={() => startEditing(contact)} className="text-blue-600 hover:text-blue-500 text-sm font-semibold">
                                                Edit
                                            </button>
                                            <button onClick={() => handleDeleteContact(contact.id)} className="text-red-600 hover:text-red-500 text-sm font-semibold">
                                                Delete
                                            </button>
                                        </div>
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
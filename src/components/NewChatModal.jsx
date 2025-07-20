// src/components/NewChatModal.jsx
import React from 'react';

const shortenAddress = (address) => address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : '';

export default function NewChatModal({ contacts, onClose, onSelectContact }) {
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md h-[60vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Start a New Chat</h2>
                <div className="flex-grow overflow-y-auto border-y border-gray-200 -mx-6 px-6 py-2">
                    {contacts.length === 0 ? <p>You have no contacts to chat with.</p> : (
                        <ul className="divide-y divide-gray-200">
                            {contacts.map(contact => (
                                <li 
                                    key={contact.id} 
                                    onClick={() => onSelectContact(contact)}
                                    className="flex items-center space-x-4 p-3 rounded-md hover:bg-gray-100 cursor-pointer"
                                >
                                    <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0"></div>
                                    <div>
                                        <p className="font-semibold text-gray-900">{contact.name}</p>
                                        <p className="text-sm text-gray-500 font-mono">{shortenAddress(contact.address)}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="text-gray-600 font-bold px-6 py-2 rounded-lg hover:bg-gray-100">Cancel</button>
                </div>
            </div>
        </div>
    );
}
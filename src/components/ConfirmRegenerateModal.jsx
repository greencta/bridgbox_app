import React, { useState } from 'react';

export default function ConfirmRegenerateModal({ onConfirm, onCancel }) {
    const [confirmationText, setConfirmationText] = useState('');
    const isConfirmed = confirmationText === 'regenerate';

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onCancel}>
            <div 
                className="bg-[#1F2129] p-6 rounded-lg shadow-xl w-full max-w-md border border-red-500/30" 
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-900/50 flex items-center justify-center">
                        <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-white">Are you absolutely sure?</h3>
                        <p className="text-sm text-red-300/80 mt-2">
                            This action will make all of your past encrypted messages and files **permanently unreadable**. This cannot be undone.
                        </p>
                        <p className="text-sm text-gray-400 mt-4">
                            To confirm, please type "<span className="font-bold text-red-400">regenerate</span>" in the box below.
                        </p>
                        <input 
                            type="text"
                            value={confirmationText}
                            onChange={(e) => setConfirmationText(e.target.value)}
                            className="w-full p-2 mt-2 bg-gray-800 border border-gray-700 rounded-md focus:ring-red-500 focus:border-red-500 text-white"
                        />
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onCancel} className="text-gray-400 font-bold px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors">
                        Cancel
                    </button>
                    <button 
                        onClick={onConfirm} 
                        disabled={!isConfirmed}
                        className="bg-red-600 text-white font-bold px-6 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-800 disabled:cursor-not-allowed"
                    >
                        I understand, Regenerate Key
                    </button>
                </div>
            </div>
        </div>
    );
}
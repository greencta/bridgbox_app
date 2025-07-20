import React, { useState } from 'react';
import toast from 'react-hot-toast';

export default function RenameFileModal({ file, onClose, onRename }) {
    // Initialize the state with the file's current name, without the extension
    const getInitialName = () => {
        if (!file?.fileName) return '';
        const lastDotIndex = file.fileName.lastIndexOf('.');
        if (lastDotIndex === -1) return file.fileName; // No extension
        return file.fileName.substring(0, lastDotIndex);
    };

    const getExtension = () => {
        if (!file?.fileName) return '';
        const lastDotIndex = file.fileName.lastIndexOf('.');
        if (lastDotIndex === -1) return ''; // No extension
        return file.fileName.substring(lastDotIndex); // Includes the dot
    };

    const [newName, setNewName] = useState(getInitialName());
    const fileExtension = getExtension();

    const handleConfirm = () => {
        const finalName = (newName.trim() + fileExtension).trim();
        if (!newName.trim()) {
            return toast.error("File name cannot be empty.");
        }
        if (finalName === file.fileName) {
            return onClose(); // No change was made
        }
        onRename(finalName);
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Rename File</h2>
                
                <div>
                    <label htmlFor="fileName" className="block text-sm font-medium text-gray-700 mb-1">
                        Enter new name
                    </label>
                    <div className="flex items-center">
                         <input
                            type="text"
                            name="fileName"
                            id="fileName"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full p-2 bg-gray-50 border border-gray-300 rounded-l-md focus:ring-[#FF3142] focus:border-[#FF3142] text-gray-900"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                        />
                        {fileExtension && (
                            <span className="inline-flex items-center px-3 h-[42px] rounded-r-md border border-l-0 border-gray-300 bg-gray-100 text-gray-500 text-sm">
                                {fileExtension}
                            </span>
                        )}
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="text-gray-600 font-bold px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleConfirm} className="bg-[#FF3142] text-white font-bold px-6 py-2 rounded-lg hover:opacity-90 transition-opacity">
                        Rename
                    </button>
                </div>
            </div>
        </div>
    );
}
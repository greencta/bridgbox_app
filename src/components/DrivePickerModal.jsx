// src/components/DrivePickerModal.jsx

import React, { useState } from 'react';

const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function DrivePickerModal({ files = [], isLoading, onClose, onAttach }) {
    const [selectedFiles, setSelectedFiles] = useState([]);

    const handleToggleSelect = (file) => {
        setSelectedFiles(prev =>
            prev.some(f => f.id === file.id)
                ? prev.filter(f => f.id !== file.id)
                : [...prev, file]
        );
    };

    const handleAttachClick = () => {
        onAttach(selectedFiles);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Attach from My Drive</h2>
                <div className="flex-grow overflow-y-auto border-y border-gray-200 -mx-6 px-6 py-2">
                    {isLoading ? <p>Loading files...</p> :
                     files.length === 0 ? <p>Your drive is empty.</p> :
                     <ul className="divide-y divide-gray-200">
                        {files.map(file => (
                            <li key={file.id} className="flex items-center space-x-4 p-2 rounded-md hover:bg-gray-50">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-gray-300 text-[#FF3142] focus:ring-[#FF3142]"
                                    checked={selectedFiles.some(f => f.id === file.id)}
                                    onChange={() => handleToggleSelect(file)}
                                />
                                <div className="flex-1">
                                    <p className="font-medium text-gray-800">{file.fileName}</p>
                                    <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                                </div>
                            </li>
                        ))}
                     </ul>
                    }
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="text-gray-600 font-bold px-6 py-2 rounded-lg hover:bg-gray-100">Cancel</button>
                    <button onClick={handleAttachClick} disabled={selectedFiles.length === 0} className="bg-[#FF3142] text-white font-bold px-6 py-2 rounded-lg hover:opacity-90 disabled:opacity-50">
                        Attach {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}
                    </button>
                </div>
            </div>
        </div>
    );
}
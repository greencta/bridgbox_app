import React from 'react';

const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function FilePickerModal({ files = [], isLoading, onClose, onSelectFile }) {
    
    const handleSelect = (file) => {
        onSelectFile(file);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Select a File from My Drive</h2>
                <div className="flex-grow overflow-y-auto border-y border-gray-200 -mx-6 px-6 py-2">
                    {isLoading ? <p>Loading files...</p> :
                     files.length === 0 ? <p>Your drive is empty.</p> :
                     <ul className="divide-y divide-gray-200">
                        {files.map(file => (
                            <li 
                                key={file.id} 
                                onClick={() => handleSelect(file)}
                                className="flex items-center justify-between space-x-4 p-3 rounded-md hover:bg-gray-100 cursor-pointer"
                            >
                                <div className="flex-1">
                                    <p className="font-medium text-gray-800">{file.fileName}</p>
                                    <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                                </div>
                                <button className="text-sm font-semibold text-white bg-[#FF3142] px-3 py-1 rounded-md hover:opacity-90">
                                    Select
                                </button>
                            </li>
                        ))}
                     </ul>
                    }
                </div>
                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="text-gray-600 font-bold px-6 py-2 rounded-lg hover:bg-gray-100">Cancel</button>
                </div>
            </div>
        </div>
    );
}
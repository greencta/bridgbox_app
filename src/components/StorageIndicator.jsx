// src/components/StorageIndicator.jsx

import React from 'react';

const formatFileSize = (bytes) => {
    if (typeof bytes !== 'number' || isNaN(bytes) || bytes < 0) {
        return '...';
    }
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function StorageIndicator({ used, total }) {
    const areNumbersReady = typeof used === 'number' && typeof total === 'number';
    const percentage = areNumbersReady && total > 0 ? Math.min((used / total) * 100, 100) : 0;

    return (
        <div className="px-4 py-1">
            <h4 className="text-xs font-semibold text-gray-400 mb-2">Storage Capacity</h4>
            <div className="w-full bg-gray-700 rounded-full h-2 mb-1">
                <div 
                    className="bg-accent h-2 rounded-full" 
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
            <div className="text-xs text-gray-500">
                {/* --- THIS IS THE FIX --- */}
                {/* This will now show a "Loading..." state until the numbers are ready. */}
                {areNumbersReady ? (
                    <>
                        <span className="font-semibold text-gray-400">{formatFileSize(used)}</span> of {formatFileSize(total)} used
                    </>
                ) : (
                    <span>Loading...</span>
                )}
            </div>
        </div>
    );
}
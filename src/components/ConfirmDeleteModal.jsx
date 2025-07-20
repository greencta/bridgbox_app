import React from 'react';

export default function ConfirmDeleteModal({ onConfirm, onCancel }) {
  return (
    // The modal container, which covers the entire screen
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onCancel}>
      {/* The modal panel itself */}
      <div 
        className="bg-[#1F2129] p-6 rounded-lg shadow-xl w-full max-w-sm border border-red-500/30" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start space-x-4">
          {/* Icon */}
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-900/50 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
          </div>
          {/* Content */}
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white">Delete Conversation?</h3>
            <p className="text-sm text-gray-400 mt-2">
              This action can't be undone. Your mail will be deleted forever.
            </p>
            <p className="text-sm text-gray-400 mt-1 font-semibold">
              Are you sure?
            </p>
          </div>
        </div>
        {/* Action Buttons */}
        <div className="mt-6 flex justify-end space-x-3">
          <button 
            onClick={onCancel} 
            className="text-gray-400 font-bold px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm} 
            className="bg-red-600 text-white font-bold px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
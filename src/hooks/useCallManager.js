// src/hooks/useCallManager.js

import { useState, useEffect, useRef, useCallback } from 'react';
import { ref, onValue, set, remove } from 'firebase/database';
import { doc, getDoc } from 'firebase/firestore';
import { db, rtdb } from '../firebase';
import Peer from 'simple-peer';

export const useCallManager = (wallet) => {
    const [callState, setCallState] = useState({ isActive: false, isReceiving: false, recipient: null, caller: null, signalData: null });
    const [incomingCall, setIncomingCall] = useState(null);
    
    const mediaStreamRef = useRef(null);
    const peerRef = useRef(null);
    const ringtoneRef = useRef(null);
    const userAudioRef = useRef(null);
    const myAudioRef = useRef(null);

    const callStateRef = useRef(callState);
    useEffect(() => { callStateRef.current = callState; }, [callState]);
    
    const incomingCallRef = useRef(incomingCall);
    useEffect(() => { incomingCallRef.current = incomingCall; }, [incomingCall]);

    const stopMediaStream = useCallback(() => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
    }, []);

    const stopRingtone = useCallback(() => {
        if (ringtoneRef.current) {
            ringtoneRef.current.pause();
            ringtoneRef.current.currentTime = 0;
        }
    }, []);

    const cleanupCall = useCallback(() => {
        stopMediaStream();
        stopRingtone();
        if (peerRef.current) {
            peerRef.current.destroy();
            peerRef.current = null;
        }
        if (wallet?.address) {
            const myAddress = wallet.address.toLowerCase();
            remove(ref(rtdb, `calls/${myAddress}`));
        }
        setCallState({ isActive: false, isReceiving: false, recipient: null, caller: null, signalData: null });
        setIncomingCall(null);
    }, [wallet?.address, stopMediaStream, stopRingtone]);

    const handleInitiateCall = async (recipientAddress) => {
        if (callStateRef.current.isActive || incomingCallRef.current) {
            alert("You are already in a call or have an incoming call.");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            mediaStreamRef.current = stream;
            if (myAudioRef.current) myAudioRef.current.srcObject = stream;
            setCallState({ isActive: true, isReceiving: false, recipient: recipientAddress, caller: wallet.address.toLowerCase() });
        } catch (error) {
            console.error("Failed to get media for outgoing call", error);
            cleanupCall();
            alert("Could not start call. Please check microphone permissions.");
        }
    };
    
    const handleAcceptCall = async () => {
        if (!incomingCallRef.current) return;
        stopRingtone();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            mediaStreamRef.current = stream;
            if(myAudioRef.current) myAudioRef.current.srcObject = stream;
            setCallState({
                isActive: true,
                isReceiving: true,
                caller: incomingCallRef.current.from,
                recipient: wallet.address.toLowerCase(),
                signalData: incomingCallRef.current.signal,
            });
            setIncomingCall(null);
        } catch (error) {
            console.error("Failed to get media for incoming call", error);
            cleanupCall();
            alert("Could not answer call. Please check microphone permissions.");
        }
    };

    // --- THIS IS THE FIX ---
    // The order of operations is corrected. We stop the ringtone *first*,
    // before any state changes cause components to unmount.
    const handleDeclineCall = useCallback(() => {
        if (!incomingCallRef.current) return;
        
        // 1. Stop the sound immediately.
        stopRingtone();

        // 2. Notify the other user.
        const callerRef = ref(rtdb, `calls/${incomingCallRef.current.from}`);
        set(callerRef, { type: 'reject' });

        // 3. Clean up local state.
        cleanupCall();
    }, [cleanupCall, stopRingtone]);

    const handleEndCall = useCallback(() => {
        const otherPartyAddress = callStateRef.current.isReceiving ? callStateRef.current.caller : callStateRef.current.recipient;
        if (otherPartyAddress) {
            const otherPartyRef = ref(rtdb, `calls/${otherPartyAddress}`);
            set(otherPartyRef, { type: 'end' });
        }
        cleanupCall();
    }, [cleanupCall]);

    // Effect for creating the peer connection.
    useEffect(() => {
        if (!callState.isActive || !mediaStreamRef.current) return;
        
        const newPeer = new Peer({
            initiator: !callState.isReceiving,
            trickle: false,
            stream: mediaStreamRef.current,
        });

        newPeer.on('signal', signalData => {
            const recipient = callState.isReceiving ? callState.caller : callState.recipient;
            if(recipient) {
                const signalRef = ref(rtdb, `calls/${recipient}`);
                set(signalRef, { from: wallet.address.toLowerCase(), signal: signalData, type: callState.isReceiving ? 'answer' : 'offer' });
            }
        });

        newPeer.on('stream', userStream => {
            if (userAudioRef.current) userAudioRef.current.srcObject = userStream;
        });
        
        newPeer.on('close', cleanupCall);
        newPeer.on('error', (err) => {
            console.error("Peer error:", err);
            cleanupCall();
        });

        if (callState.isReceiving && callState.signalData) {
            newPeer.signal(callState.signalData);
        }
        peerRef.current = newPeer;
        
        return () => {
            if (newPeer) newPeer.destroy();
        };
    }, [callState, wallet?.address, cleanupCall]);
    
    // Main listener effect.
    useEffect(() => {
        if (!wallet?.address) return;
        const myAddress = wallet.address.toLowerCase();
        const callRef = ref(rtdb, `calls/${myAddress}`);

        const unsubscribe = onValue(callRef, async (snapshot) => {
            const data = snapshot.val();
            const localCallState = callStateRef.current;
            const localIncomingCall = incomingCallRef.current;

            if (!data) {
                if (localCallState.isActive || localIncomingCall) {
                    cleanupCall();
                }
                return;
            }

            switch (data.type) {
                case 'offer':
                    if (localCallState.isActive || localIncomingCall) {
                        set(ref(rtdb, `calls/${data.from}`), { type: 'reject', reason: 'User is busy' });
                        return;
                    }
                    const callerProfileSnap = await getDoc(doc(db, 'users', data.from));
                    setIncomingCall({
                        from: data.from,
                        signal: data.signal,
                        profile: callerProfileSnap.exists() ? callerProfileSnap.data() : {},
                    });
                    if (ringtoneRef.current) ringtoneRef.current.play().catch(e => console.error("Ringtone play failed:", e));
                    break;
                case 'answer':
                    if (peerRef.current) peerRef.current.signal(data.signal);
                    break;
                case 'reject':
                case 'end':
                    cleanupCall();
                    break;
            }
        });

        return () => unsubscribe();
    }, [wallet?.address, cleanupCall]);

    return {
        callState,
        incomingCall,
        myAudioRef,
        userAudioRef,
        ringtoneRef,
        handleInitiateCall,
        handleAcceptCall,
        handleDeclineCall,
        handleEndCall
    };
};
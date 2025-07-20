// src/utils/irys.js
import { WebIrys } from "@irys/sdk";
import { ethers } from "ethers";
import toast from 'react-hot-toast';

const getIrys = async () => {
	if (!window.ethereum) {
        console.error("No Ethereum provider found. Please install MetaMask.");
        toast.error("MetaMask is not installed. Please install it to continue.");
        return null;
    }

	try {
		const provider = new ethers.BrowserProvider(window.ethereum);
        
        
		const irysConfig = {
			url: "https://devnet.irys.xyz", 
			token: "ethereum", 
			wallet: {
				name: "ethersv6",
				provider: provider,
			},
		};

		const irys = new WebIrys(irysConfig);
		await irys.ready();

		console.log("Irys client is ready for address:", irys.address);
		return irys;
	} catch (error) {
		console.error("Error initializing Irys client:", error);
        toast.error("Error initializing Irys client. Check the console for details.");
		return null;
	}
};

export default getIrys;
// import * as LitJsSdk from "@lit-protocol/lit-node-client";

// This is the main Lit Protocol client instance
// const client = new LitJsSdk.LitNodeClient({
//   litNetwork: "datil-test", 
//   debug: false,
// });

class Lit {
  // A placeholder to prevent errors when other files try to access the client.
  litNodeClient = null;

  async connect() {
    // We'll no longer connect to the Lit Protocol network.
    console.log("Lit Protocol connection disabled.");
  }

  // A getter to access the client from anywhere in the app
  get client() {
    // Returning null will help us identify where the client is being used.
    return this.litNodeClient;
  }
}

// Export a single instance for the entire application to use
export default new Lit();
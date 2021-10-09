/**
 * Module to access the azure cosmos db 
 */
 const CosmosClient = require("@azure/cosmos").CosmosClient;

 require('dotenv').config();

 const { endpoint, key, databaseId } = {
     endpoint: process.env.COSMOSDBURI,
     key: process.env.COSMOSDBKEY,
     databaseId: process.env.COSMOSDB
 };
 
 const client = new CosmosClient({ endpoint, key });
 const database = client.database(databaseId);
 
 
 module.exports = {
     User: database.container('user'),
     Score: database.container('score'),
     History: database.container('history'),
     Dictionary: database.container('dictionary'),
 }

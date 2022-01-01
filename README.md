# cosmos-db-nodejs
A simple example of user management in Azure Cosmos-DB on a node.js server with passport.js as well as client via vue 3.

A cosmos db is used, the access is done with the "@azure/cosmos" driver and the access tokens of the Azure cloud.
This information is to be stored in the ```.env``` file:
```
COSMOSDBURI = '<cosmos-cd-uri>'
COSMOSDBKEY = '<cosmos-db-key>'
COSMOSDB = '<db-name>'
```

A container "user" is needed, with the fields 
```json
{
    "name": "****",
    "avatar": "****",
    "password": "****",
    "lastLogin": "2021-10-03T19:07:54.011Z",
    "id": "joda",
    "role": "admin",
    "ip": "::1",
}
```
The parameter mapping of ejs was changed because of VUE to
``` 
ejs.openDelimiter = "'<";
ejs.closeDelimiter = ">'";
```
so that the following placeholders for e.g. a varibale "message" are to be defined in the client coding:
```
messages: "'<%= message %>'"
```
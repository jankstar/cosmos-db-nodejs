const graphql = require("graphql");
const db = require('./db');

const UserType = new graphql.GraphQLObjectType({
    name: "user",
    fields: {
        id: { type: graphql.GraphQLString },
        username: { type: graphql.GraphQLString },
        password: { type: graphql.GraphQLString },
        salt: { type: graphql.GraphQLString },
        avatar: { type: graphql.GraphQLString },
        lastLogin: { type: graphql.GraphQLString },
        role: { type: graphql.GraphQLString },
        token: { type: graphql.GraphQLString },
        modified: { type: graphql.GraphQLString },
    }
});

// create a graphql query to select all and by id
var queryType = new graphql.GraphQLObjectType({
    name: 'Query',
    fields: {
        user: {
            type: graphql.GraphQLList(UserType),
            args: {
                offset: { type: graphql.GraphQLInt },
                limit: { type: graphql.GraphQLInt },
            },
            resolve: (root, { offset, limit }, context, info) => {
                return new Promise(async(resolve, reject) => {
                    try {
                        const lOffset = offset || 0;
                        const lLimit = limit || 1000; 
                        const { resources: rows } = await db.User.items
                            .query(`SELECT * FROM c OFFSET ${lOffset} LIMIT ${lLimit}`)
                            .fetchAll();
                        if (rows) { // check if user was found
                            rows.forEach((element) => {
                                element.modified = new Date(element._ts * 1000).toISOString();
                            })
                            resolve(rows);
                        } else {
                            resolve([])
                        }
                    } catch (err) {
                        var error = new graphql.GraphQLError(message = err.message)
                        reject(error)
                    }
                });
            }
        },
        userByName: {
            type: UserType,
            args: {
                username: {
                    type: graphql.GraphQLNonNull(graphql.GraphQLString)
                }
            },
            resolve: (root, { name }, context, info) => {
                return new Promise(async(resolve, reject) => {
                    try {
                        const { resources: rows } = await db.User.items
                            .query(`SELECT * FROM c WHERE c.username = '${name}'`)
                            .fetchAll();
                        if (rows && rows[0]) { // check if user was found
                            resolve(rows[0]);
                        } else {
                            resolve([])
                        }
                    } catch (err) {
                        var error = new graphql.GraphQLError(message = err.message)
                        reject(error)
                    }
                });
            }
        }
    }
});

//mutation type is a type of object to modify data (INSERT,DELETE,UPDATE)
var mutationType = new graphql.GraphQLObjectType({
    name: 'Mutation',
    fields: {
        createUser: {
            type: UserType,
            args: {
                username: { type: graphql.GraphQLNonNull(graphql.GraphQLString) },
                password: { type: graphql.GraphQLNonNull(graphql.GraphQLString)},
                avatar: {type: graphql.GraphQLString },
                role: { type: graphql.GraphQLString }
            },
            resolve: (root, { username, password, avatar, role }) => {
                return new Promise(async(resolve, reject) => {
                    //raw SQL to insert a new user in user table
                    try {
                        //check that the name is not already taken
                        const { resources: rows } = await db.User.items
                            .query(`SELECT * FROM c WHERE c.username = '${username}'`)
                            .fetchAll();
                        if (rows && rows[0]) {throw Error(`User with this name '${username}'already exists.`)}    
                        const { resource: createdItem } = await db.User.items
                            .create({ 
                                "id": username, 
                                "username": username, 
                                "password": password, 
                                "avatar": avatar, 
                                "role": role
                            });
                        resolve(createdItem)
                    } catch (err) {
                        var error = new graphql.GraphQLError(message = err.message)
                        reject(error)
                    }
                });
            }
        }
    }
});
const schema = new graphql.GraphQLSchema({
    query: queryType,
    mutation: mutationType
});

//export schema to use on index.js
module.exports = {
    schema
}
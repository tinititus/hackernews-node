import * as fs from 'fs'
import * as path from 'path'

import express from 'express'
import { ApolloServer } from 'apollo-server-express'
import ws from 'ws' // yarn add ws
import { useServer } from 'graphql-ws/lib/use/ws'
import pkg from '@prisma/client'
import { PrismaClient } from '@prisma/client'
import { createClient, ServerOptions } from 'graphql-ws'

import { getUserId } from './utils'
import Query from './resolvers/Query'
import Mutation from './resolvers/Mutation'
import User from './resolvers/User'
import Link from './resolvers/Link'
import Subscription from './resolvers/Subscription'
import Vote from './resolvers/Vote'

async function* sayHiInLanguages() {
  for (const hi of ['Hi', 'Bonjour', 'Hola', 'Ciao', 'Oi']) {
    yield { greetings: hi }
  }
}

const typeDefs = `
type Query {
  info: String!
  feed(filter: String, skip: Int, take: Int, orderBy: LinkOrderByInput): Feed!
}

type Mutation {
  post(url: String!, description: String!): Link!
  signup(email: String!, password: String!, name: String!): AuthPayload
  login(email: String!, password: String!): AuthPayload
  vote(linkId: ID!): Vote
}

type Link {
  id: ID!
  description: String!
  url: String!
  postedBy: User
  createdAt: DateTime!
  votes: [Vote!]!
}

type AuthPayload {
  token: String
  user: User
}

type User {
  id: ID!
  name: String!
  email: String!
  links: [Link!]!
}

type Subscription {
  newLink: Link
  newVote: Vote
  greetings: String
}

type Vote {
  id: ID!
  link: Link!
  user: User!
}

type Feed {
  links: [Link!]!
  count: Int!
}

input LinkOrderByInput {
  description: Sort
  url: Sort
  createdAt: Sort
}

enum Sort {
  asc
  desc
}

scalar DateTime
`

const resolvers = {
  Query,
  Mutation,
  // Subscription,
  Subscription: {
    greetings: {
      subscribe: () => sayHiInLanguages(),
    },
  },
  User,
  Link,
  Vote,
}

const prisma = new PrismaClient()

async function startServer() {
  // create express
  const app = express()

  // create apollo server
  const apolloServer = new ApolloServer({
    typeDefs: fs.readFileSync(path.join(__dirname, 'schema.graphql'), 'utf8'),
    resolvers,
    context: ({ req }) => {
      return {
        ...req,
        prisma,
        userId: req && req.headers.authorization ? getUserId(req) : null,
      }
    },
  })
  await apolloServer.start()

  // apply middleware
  apolloServer.applyMiddleware({ app })

  const server = app.listen(4000, () => {
    // create and use the websocket server
    const wsServer = new ws.Server({
      server,
      path: '/graphql',
    })

    useServer(
      {
        typeDefs: fs.readFileSync(
          path.join(__dirname, 'schema.graphql'),
          'utf8'
        ),
        resolvers,
      } as ServerOptions,
      wsServer
    )
  })
}
startServer()

// import WebSocketLink from './Websocket'

// const link = new WebSocketLink({
//   url: 'ws://where.is:4000/graphql',
//   // connectionParams: () => {
//   //   const session = getSession()
//   //   if (!session) {
//   //     return {}
//   //   }
//   //   return {
//   //     Authorization: `Bearer ${session.token}`,
//   //   }
//   // },
// })

// // const { createClient } = require('graphql-ws')

// const client = createClient({
//   url: 'ws://localhost:4000/graphql',
// })

// // query
// async function testQuery() {
//   const result = await new Promise((resolve, reject) => {
//     let result: any
//     client.subscribe(
//       {
//         query: '{ info }',
//       },
//       {
//         next: (data) => (result = data),
//         error: reject,
//         complete: () => resolve(result),
//       }
//     )
//   })

//   // expect(result).toEqual({ hello: 'This is GraphQL API' })
//   console.log(result)
// }

// testQuery()

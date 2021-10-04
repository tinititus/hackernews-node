import * as fs from 'fs'
import * as path from 'path'

import express from 'express'
import { ApolloServer } from 'apollo-server-express'
import ws from 'ws' // yarn add ws
import { useServer } from 'graphql-ws/lib/use/ws'
import { PrismaClient } from '@prisma/client'
import { ServerOptions } from 'graphql-ws'
import { PubSub } from 'graphql-subscriptions'

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
const pubsub = new PubSub()

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
        pubsub,
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

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { APP_SECRET, getUserId } from '../utils.js'

async function signup(parent: any, args: any, context: any, info: any) {
  const password = await bcrypt.hash(args.password, 10)
  const user = await context.prisma.user.create({ data: { ...args, password } })
  const token = jwt.sign({ userId: user.id }, APP_SECRET)
  return {
    token,
    user,
  }
}

async function login(parent: any, args: any, context: any, info: any) {
  const user = await context.prisma.user.findUnique({
    where: { email: args.email },
  })
  if (!user) {
    throw new Error('No such user found')
  }
  const valid = await bcrypt.compare(args.password, user.password)
  if (!valid) {
    throw new Error('Invalid password')
  }
  const token = jwt.sign({ userId: user.id }, APP_SECRET)
  return {
    token,
    user,
  }
}

async function post(parent: any, args: any, context: any, info: any) {
  const { userId } = context

  const newLink = await context.prisma.link.create({
    data: {
      url: args.url,
      description: args.description,
      postedBy: { connect: { id: userId } },
    },
  })
  // context.pubsub.publish('NEW_LINK', newLink)

  return newLink
}

async function vote(parent: any, args: any, context: any, info: any) {
  const userId = context.userId
  const vote = await context.prisma.vote.findUnique({
    where: {
      linkId_userId: {
        linkId: Number(args.linkId),
        userId: userId,
      },
    },
  })

  if (Boolean(vote)) {
    throw new Error(`Already voted for link: ${args.linkId}`)
  }

  const newVote = context.prisma.vote.create({
    data: {
      user: { connect: { id: userId } },
      link: { connect: { id: Number(args.linkId) } },
    },
  })
  // context.pubsub.publish('NEW_VOTE', newVote)

  return newVote
}

async function deletePost(parent: any, args: any, context: any, info: any) {
  const { userId } = context
  const post = await context.prisma.link.findUnique({
    where: {
      id: Number(args.linkId),
    },
    select: {
      postedById: true,
    },
  })
  if (!Boolean(post) || post.postedById !== userId) {
    return 'Could not find post for current user'
  }
  const deletedPost = await context.prisma.link.delete({
    where: {
      id: Number(args.linkId),
    },
  })
  if (!Boolean(deletedPost)) {
    return 'Could not delete post'
  }
  return 'Post was deleted'
}

export default {
  signup,
  login,
  post,
  vote,
  deletePost,
}

async function* newLinkSubscribe(
  parent?: any,
  args?: any,
  context?: any,
  info?: any
) {
  // return context.pubsub.asyncIterator("NEW_LINK")
  for await (const x of ['NEW_LINK', 'NEW_LINK', 'NEW_LINK']) {
    yield x
  }
}

const newLink = {
  subscribe: () => newLinkSubscribe(),
  resolve: (payload: any) => {
    return payload
  },
}

function newVoteSubscribe(parent: any, args: any, context: any, info: any) {
  return context.pubsub.asyncIterator('NEW_VOTE')
}

const newVote = {
  subscribe: newVoteSubscribe,
  resolve: (payload: any) => {
    return payload
  },
}

export default {
  newLink,
  newVote,
}

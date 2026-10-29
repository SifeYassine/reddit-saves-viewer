const PROFILE_PREFIX = "u_";

// Reddit stores profile posts in a hidden "u_name" subreddit, though its site shows them under /user/name
function getProfileName(subreddit) {
  return subreddit?.startsWith(PROFILE_PREFIX) ? subreddit.slice(PROFILE_PREFIX.length) : null;
}

export function getCommunityLabel(subreddit) {
  const profileName = getProfileName(subreddit);
  return profileName ? `u/${profileName}` : `r/${subreddit}`;
}

export function getCommunityUrl(subreddit) {
  const profileName = getProfileName(subreddit);
  return `https://www.reddit.com/${profileName ? `user/${profileName}` : `r/${subreddit}`}`;
}

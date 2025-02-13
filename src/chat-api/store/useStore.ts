import useAccount from "./useAccount";
import useChannels from "./useChannels";
import useFriends from "./useFriends";
import useInbox from "./useInbox";
import useMention from "./useMention";
import useMessages from "./useMessages";
import useServerMembers from "./useServerMembers";
import useServerRoles from "./useServerRoles";
import useServers from "./useServers";
import useHeader from "./useHeader";
import useUsers from "./useUsers";
import useChannelProperties from "./useChannelProperties";
import { usePosts } from "./usePosts";
import useVoiceUsers from "./useVoiceUsers";


export default function useStore() {
  const account = useAccount();
  const serverMembers = useServerMembers();
  const servers = useServers();
  const users = useUsers();
  const channels = useChannels();
  const header = useHeader();
  const messages = useMessages();
  const friends = useFriends();
  const inbox = useInbox();
  const mentions = useMention();
  const serverRoles = useServerRoles();
  const channelProperties = useChannelProperties()
  const posts = usePosts();
  const voiceUsers = useVoiceUsers();


  return {
    account,
    servers,
    serverMembers,
    serverRoles,
    users,
    channels,
    header,
    messages,
    friends,
    inbox,
    mentions,
    channelProperties,
    posts,
    voiceUsers
  }
}
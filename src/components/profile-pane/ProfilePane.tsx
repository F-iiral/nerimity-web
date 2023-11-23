import styles from "./styles.module.scss";
import { A, Link, useParams } from "@solidjs/router";
import {
  createEffect,
  createResource,
  createSignal,
  For,
  on,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { FriendStatus, RawUser } from "@/chat-api/RawData";
import {
  blockUser,
  followUser,
  getFollowers,
  getFollowing,
  getUserDetailsRequest,
  unblockUser,
  unfollowUser,
  updatePresence,
  UserDetails,
} from "@/chat-api/services/UserService";
import useStore from "@/chat-api/store/useStore";
import { avatarUrl, bannerUrl, User } from "@/chat-api/store/useUsers";
import {
  calculateTimeElapsedForActivityStatus,
  formatTimestamp,
  getDaysAgo,
} from "../../common/date";
import RouterEndpoints from "../../common/RouterEndpoints";
import { userStatusDetail, UserStatuses } from "../../common/userStatus";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import DropDown from "@/components/ui/drop-down/DropDown";
import Icon from "@/components/ui/icon/Icon";
import UserPresence from "@/components/user-presence/UserPresence";
import { css, styled } from "solid-styled-components";
import Text from "../ui/Text";
import { FlexColumn, FlexRow } from "../ui/Flexbox";
import { useWindowProperties } from "@/common/useWindowProperties";
import { addFriend } from "@/chat-api/services/FriendService";
import { useDrawer } from "../ui/drawer/Drawer";
import { PostsArea } from "../PostsArea";
import { CustomLink } from "../ui/CustomLink";
import { classNames, conditionalClass } from "@/common/classNames";
import { Banner } from "../ui/Banner";
import { Markup } from "../Markup";
import { t } from "i18next";
import { USER_BADGES, hasBit } from "@/chat-api/Bitwise";
import Modal from "../ui/Modal";
import { useCustomPortal } from "../ui/custom-portal/CustomPortal";
import { getLastSelectedChannelId } from "@/common/useLastSelectedServerChannel";
import ItemContainer from "../ui/Item";

const ActionButtonsContainer = styled(FlexRow)`
  align-self: center;
  justify-content: center;
  margin-left: auto;
  flex-wrap: wrap;
`;

const ActionButtonContainer = styled(FlexRow)`
  align-items: center;
  border-radius: 8px;
  padding: 5px;
  cursor: pointer;
  user-select: none;
  transition: 0.2s;
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const ActionButton = (props: {
  icon?: string;
  label: string;
  color?: string;
  onClick?: () => void;
}) => {
  return (
    <ActionButtonContainer gap={5} onclick={props.onClick}>
      <Icon color={props.color} size={18} name={props.icon} />
      <Text size={12} opacity={0.9}>
        {props.label}
      </Text>
    </ActionButtonContainer>
  );
};

export default function ProfilePane() {
  const params = useParams();
  const { users, friends, account, header } = useStore();
  const drawer = useDrawer();
  const { width, isMobileWidth } = useWindowProperties();
  const isMe = () => account.user()?.id === params.userId;
  const [userDetails, setUserDetails] = createSignal<UserDetails | null>(null);

  createEffect(
    on(
      () => params.userId,
      async (userId) => {
        setUserDetails(null);
        drawer?.goToMain();
        fetchUserDetails(userId);
      }
    )
  );

  const fetchUserDetails = async (userId: string) => {
    const userDetails = await getUserDetailsRequest(userId);
    setUserDetails(userDetails);
  };

  const user = () => {
    if (userDetails()) return userDetails()?.user;
    if (isMe()) return account.user();
    const user = users.get(params.userId);
    if (user) return user;
  };

  createEffect(
    on(user, () => {
      if (!user()) return;
      header.updateHeader({
        subName: "Profile",
        title: user()!.username,
        iconName: "person",
      });
    })
  );

  return (
    <Show when={user()}>
      <div class={styles.profilePane}>
        <div class={styles.topArea}>
          <Banner
            maxHeight={200}
            animate
            margin={0}
            hexColor={user()?.hexColor}
            url={bannerUrl(user()!)}
          ></Banner>
          <FlexColumn>
            <FlexRow>
              <Avatar
                class={classNames(
                  styles.avatar,
                  css`
                    margin-top: -${width() <= 500 ? "40" : "52"}px;
                  `
                )}
                animate
                user={user()!}
                size={width() <= 500 ? 72 : 98}
              />
              <Show when={!isMe() && !isMobileWidth()}>
                <ActionButtons
                  updateUserDetails={() => fetchUserDetails(params.userId)}
                  userDetails={userDetails()}
                  user={user()}
                />
              </Show>
            </FlexRow>

            <div class={styles.informationContainer}>
              <div class={styles.details}>
                <div class={styles.usernameTag}>
                  <span class={styles.username}>{user()!.username}</span>
                  <span class={styles.tag}>{`:${user()!.tag}`}</span>
                </div>
                <div>
                  <span class={styles.pronouns}>
                    {userDetails()?.profile.pronouns ? userDetails().profile.pronouns : 'Rather not say'}
                  </span>
                </div>
                <UserPresence
                  hideActivity
                  animate
                  userId={user()!.id}
                  showOffline={true}
                />
                <Show when={userDetails()}>
                  <Badges user={userDetails()!} />
                </Show>
                <div class={styles.followingAndFollowersContainer}>
                  <div>
                    {userDetails()?.user._count.following.toLocaleString()}{" "}
                    <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>
                      Following
                    </span>
                  </div>
                  <div>
                    {userDetails()?.user._count.followers.toLocaleString()}{" "}
                    <span style={{ color: "rgba(255, 255, 255, 0.6)" }}>
                      Followers
                    </span>
                  </div>
                </div>
              </div>

              <Show when={userDetails()?.profile?.bio}>
                <BioContainer userDetails={userDetails()!} />
              </Show>
            </div>
          </FlexColumn>
        </div>
        <Show when={!isMe() && isMobileWidth()}>
          <div style={{ "align-self": "center", margin: "4px" }}>
            <ActionButtons
              updateUserDetails={() => fetchUserDetails(params.userId)}
              userDetails={userDetails()}
              user={user()}
            />
          </div>
        </Show>
        <Show when={userDetails()}>
          <Content user={userDetails()!} />
        </Show>
      </div>
    </Show>
  );
}

const ActionButtons = (props: {
  class?: string;
  updateUserDetails(): void;
  userDetails?: UserDetails | null;
  user?: RawUser | null;
}) => {
  const params = useParams<{ userId: string }>();
  const { friends, users, account } = useStore();

  const friend = () => friends.get(params.userId);

  const isBlocked = () => friend()?.status === FriendStatus.BLOCKED;

  const friendExists = () => !!friend();
  const isPending = () =>
    friendExists() && friend().status === FriendStatus.PENDING;
  const isSent = () => friendExists() && friend().status === FriendStatus.SENT;
  const isFriend = () =>
    friendExists() && friend().status === FriendStatus.FRIENDS;

  const showAddFriend = () => !friendExists() && !isBlocked();

  const acceptClicked = () => {
    friend().acceptFriendRequest();
  };

  const removeClicked = () => {
    friend().removeFriend();
  };

  const addClicked = () => {
    if (!props.user) return;
    addFriend({
      username: props.user.username,
      tag: props.user.tag,
    }).catch((err) => {
      alert(err.message);
    });
  };

  const onMessageClicked = () => {
    users.openDM(params.userId);
  };

  const followClick = async () => {
    await followUser(params.userId);
    props.updateUserDetails();
  };

  const unfollowClick = async () => {
    await unfollowUser(params.userId);
    props.updateUserDetails();
  };

  const isFollowing = () => props.userDetails?.user.followers.length;

  const blockClicked = async () => {
    await blockUser(params.userId);
  };
  const unblockClicked = async () => {
    await unblockUser(params.userId);
  };

  return (
    <ActionButtonsContainer class={props.class} gap={3}>
      <Show when={account.hasModeratorPerm()}>
        <CustomLink href={"/app/moderation/users/" + params.userId}>
          <ActionButton
            icon="security"
            label="Admin Panel"
            color="var(--primary-color)"
          />
        </CustomLink>
      </Show>

      {!isFollowing() && (
        <ActionButton
          icon="add_circle"
          label={t("profile.followButton")}
          onClick={followClick}
          color="var(--primary-color)"
        />
      )}
      {isFollowing() && (
        <ActionButton
          icon="add_circle"
          label={t("profile.unfollowButton")}
          onClick={unfollowClick}
          color="var(--alert-color)"
        />
      )}
      {isFriend() && (
        <ActionButton
          icon="person_add_disabled"
          label={t("profile.removeFriendButton")}
          color="var(--alert-color)"
          onClick={removeClicked}
        />
      )}
      {showAddFriend() && (
        <ActionButton
          icon="group_add"
          label={t("profile.addFriendButton")}
          color="var(--primary-color)"
          onClick={addClicked}
        />
      )}
      {isSent() && (
        <ActionButton
          icon="close"
          label={t("profile.pendingRequest")}
          color="var(--alert-color)"
          onClick={removeClicked}
        />
      )}
      {isPending() && (
        <ActionButton
          icon="done"
          label={t("profile.acceptRequestButton")}
          color="var(--success-color)"
          onClick={acceptClicked}
        />
      )}

      <Show when={isBlocked()}>
        <ActionButton
          icon="block"
          label="Unblock"
          color="var(--alert-color)"
          onClick={unblockClicked}
        />
      </Show>
      <Show when={!isBlocked()}>
        <ActionButton
          icon="block"
          label="Block"
          color="var(--alert-color)"
          onClick={blockClicked}
        />
      </Show>

      <ActionButton
        icon="flag"
        label="Report (WIP)"
        color="var(--alert-color)"
      />
      <ActionButton
        icon="mail"
        label={t("profile.messageButton")}
        color="var(--primary-color)"
        onClick={onMessageClicked}
      />
    </ActionButtonsContainer>
  );
};

function Content(props: { user: UserDetails }) {
  return (
    <div class={styles.content}>
      <PostsContainer user={props.user} />
      <SideBar user={props.user} />
    </div>
  );
}

function BioContainer(props: { userDetails: UserDetails }) {
  return (
    <div class={styles.bioContainer}>
      <Text size={13}>
        <Markup text={props.userDetails?.profile?.bio!} />
      </Text>
    </div>
  );
}

function SideBar(props: { user: UserDetails }) {
  const [toggleJoinedDateType, setToggleJoinedDateType] = createSignal(false);
  const joinedAt = () => {
    if (!toggleJoinedDateType()) return getDaysAgo(props.user.user.joinedAt!);
    return formatTimestamp(props.user.user.joinedAt!);
  };

  return (
    <div class={styles.sidePane}>
      <UserActivity userId={props.user.user.id} />
      <SidePaneItem
        icon="event"
        label="Joined"
        value={joinedAt()}
        onClick={() => setToggleJoinedDateType(!toggleJoinedDateType())}
      />
      <MutualFriendList mutualFriendIds={props.user.mutualFriendIds} />
      <MutualServerList mutualServerIds={props.user.mutualServerIds} />
    </div>
  );
}

const UserActivity = (props: { userId: string }) => {
  const { users } = useStore();
  const user = () => users.get(props.userId);
  const activity = () => user()?.presence?.activity;
  const [playedFor, setPlayedFor] = createSignal("");

  createEffect(
    on(activity, () => {
      if (!activity()) return;

      setPlayedFor(
        calculateTimeElapsedForActivityStatus(activity()?.startedAt!)
      );
      const intervalId = setInterval(() => {
        setPlayedFor(
          calculateTimeElapsedForActivityStatus(activity()?.startedAt!)
        );
      }, 1000);

      onCleanup(() => {
        clearInterval(intervalId);
      });
    })
  );

  return (
    <Show when={activity()}>
      <FlexRow
        gap={6}
        class={css`
          margin-top: 4px;
          margin-bottom: 4px;
          margin-left: 5px;
        `}
      >
        <Icon
          class={css`
            margin-top: 2px;
          `}
          name="games"
          size={18}
          color="var(--primary-color)"
        />
        <FlexColumn>
          <FlexRow gap={4}>
            <Text size={14}>{activity()?.action}</Text>
            <Text size={14} opacity={0.6}>
              {activity()?.name}
            </Text>
          </FlexRow>
          <Text size={14}>For {playedFor()}</Text>
        </FlexColumn>
      </FlexRow>
    </Show>
  );
};

function MutualFriendList(props: { mutualFriendIds: string[] }) {
  const { users } = useStore();
  const { isMobileWidth } = useWindowProperties();
  const [show, setShow] = createSignal(false);

  return (
    <div
      class={classNames(
        styles.block,
        conditionalClass(isMobileWidth(), styles.mobileBlock)
      )}
    >
      <div class={styles.title} onClick={() => setShow(!show())}>
        <Icon name="group" size={18} class={styles.icon} />
        <Text size={14} style={{ "margin-right": "auto" }}>
          {t("profile.mutualFriends", { count: props.mutualFriendIds.length })}
        </Text>
        <Show when={isMobileWidth()}>
          <Icon size={18} name="expand_more" />
        </Show>
      </div>
      <Show when={!isMobileWidth() || show()}>
        <div class={styles.list}>
          <For each={props.mutualFriendIds}>
            {(id: string) => {
              const user = () => users.get(id);
              return (
                <Show when={user()}>
                  <Link
                    href={RouterEndpoints.PROFILE(user().id)}
                    class={styles.item}
                  >
                    <Avatar user={user()} size={20} />
                    <div class={styles.name}>{user().username}</div>
                  </Link>
                </Show>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
}
function MutualServerList(props: { mutualServerIds: string[] }) {
  const { servers } = useStore();
  const { isMobileWidth } = useWindowProperties();
  const [show, setShow] = createSignal(false);

  return (
    <div
      class={classNames(
        styles.block,
        conditionalClass(isMobileWidth(), styles.mobileBlock)
      )}
    >
      <div class={styles.title} onClick={() => setShow(!show())}>
        <Icon name="dns" size={18} class={styles.icon} />
        <Text size={14} style={{ "margin-right": "auto" }}>
          {t("profile.mutualServers", { count: props.mutualServerIds.length })}
        </Text>
        <Show when={isMobileWidth()}>
          <Icon size={18} name="expand_more" />
        </Show>
      </div>
      <Show when={!isMobileWidth() || show()}>
        <div class={styles.list}>
          <For each={props.mutualServerIds}>
            {(id: string) => {
              const server = () => servers.get(id);
              return (
                <Show when={server()}>
                  <Link
                    href={RouterEndpoints.SERVER_MESSAGES(
                      server()!.id,
                      getLastSelectedChannelId(
                        server()!.id,
                        server()!.defaultChannelId
                      )
                    )}
                    class={styles.item}
                  >
                    <Avatar server={server()} size={20} />
                    <div class={styles.name}>{server()!.name}</div>
                  </Link>
                </Show>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
}

function SidePaneItem(props: {
  icon: string;
  label: string;
  value: string;
  onClick?: () => void;
}) {
  return (
    <div class={styles.SidePaneItem} onClick={props.onClick}>
      <Icon name={props.icon} size={18} color="var(--primary-color)" />
      <FlexColumn>
        <div class={styles.label}>{props.label}</div>
        <div class={styles.value}>{props.value}</div>
      </FlexColumn>
    </div>
  );
}

function PostsContainer(props: { user: UserDetails }) {
  const {account} = useStore();
  const [currentPage, setCurrentPage] = createSignal(0); // posts | with replies | liked | Following | Followers

  const postCount = () => props.user.user._count.posts.toLocaleString();
  const likeCount = () => props.user.user._count.likedPosts.toLocaleString();
  return (
    <div class={styles.postsContainer}>
      <FlexRow gap={5} style={{ "margin-bottom": "10px", "flex-wrap": "wrap" }}>
        <ItemContainer
          handlePosition="bottom"
          class={styles.postsTabButton}
          selected={currentPage() === 0}
          onClick={() => setCurrentPage(0)}
        >
          <Text
            size={14}
            color={currentPage() === 0 ? "white" : "rgba(255,255,255,0.6)"}
          >
            {t("profile.postsTab")}
          </Text>
        </ItemContainer>
        <ItemContainer
          handlePosition="bottom"
          class={styles.postsTabButton}
          selected={currentPage() === 1}
          onClick={() => setCurrentPage(1)}
        >
          <Text
            size={14}
            color={currentPage() === 1 ? "white" : "rgba(255,255,255,0.6)"}
          >
            {t("profile.postsAndRepliesTab", { count: postCount() })}
          </Text>
        </ItemContainer>
        <ItemContainer
          handlePosition="bottom"
          class={styles.postsTabButton}
          selected={currentPage() === 2}
          onClick={() => setCurrentPage(2)}
        >
          <Text
            size={14}
            color={currentPage() === 2 ? "white" : "rgba(255,255,255,0.6)"}
          >
            {t("profile.likedPostsTab", { count: likeCount() })}
          </Text>
        </ItemContainer>
        <ItemContainer
          handlePosition="bottom"
          class={styles.postsTabButton}
          selected={currentPage() === 3}
          onClick={() => setCurrentPage(3)}
        >
          <Text
            size={14}
            color={currentPage() === 3 ? "white" : "rgba(255,255,255,0.6)"}
          >
            {t("profile.followingTab")}
          </Text>
        </ItemContainer>
        <ItemContainer
          handlePosition="bottom"
          class={styles.postsTabButton}
          selected={currentPage() === 4}
          onClick={() => setCurrentPage(4)}
        >
          <Text
            size={14}
            color={currentPage() === 4 ? "white" : "rgba(255,255,255,0.6)"}
          >
            {t("profile.followersTab")}
          </Text>
        </ItemContainer>
      </FlexRow>
      <Show when={props.user && currentPage() <= 2}>
        <PostsArea
          showLiked={currentPage() === 2}
          showReplies={currentPage() === 1}
          style={{ width: "100%" }}
          userId={props.user.user.id}
          showCreateNew={account.user()?.id === props.user.user.id && currentPage() === 0}
        />
      </Show>
      <Show when={props.user && currentPage() === 3}>
        <FollowingArea userId={props.user.user.id} />
      </Show>
      <Show when={props.user && currentPage() === 4}>
        <FollowersArea userId={props.user.user.id} />
      </Show>
    </div>
  );
}

function FollowersArea(props: { userId: string }) {
  const [followers, setFollowers] = createSignal<RawUser[]>([]);
  onMount(() => {
    getFollowers(props.userId).then((newFollowers) =>
      setFollowers(newFollowers)
    );
  });

  return <UsersList users={followers()} />;
}
function FollowingArea(props: { userId: string }) {
  const [following, setFollowing] = createSignal<RawUser[]>([]);
  onMount(() => {
    getFollowing(props.userId).then((newFollowing) =>
      setFollowing(newFollowing)
    );
  });

  return <UsersList users={following()} />;
}

const UserItemContainer = styled(FlexRow)`
  align-items: center;
  padding: 5px;
  border-radius: 8px;
  transition: 0.2s;
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

function UsersList(props: { users: RawUser[] }) {
  return (
    <FlexColumn>
      <For each={props.users}>
        {(user) => (
          <CustomLink href={RouterEndpoints.PROFILE(user.id)}>
            <UserItemContainer gap={5}>
              <Avatar user={user} size={20} />
              <Text>{user.username}</Text>
            </UserItemContainer>
          </CustomLink>
        )}
      </For>
    </FlexColumn>
  );
}

type Badge = typeof USER_BADGES.FOUNDER;

const BadgeContainer = styled("button")<{ color: string }>`
  background-color: ${(props) => props.color};
  border-radius: 4px;
  padding: 3px;
  color: rgba(0, 0, 0, 0.7);
  font-weight: bold;
  font-size: 12px;
  border: none;
  cursor: pointer;
`;

function Badge(props: { badge: Badge; user: UserDetails }) {
  const { createPortal } = useCustomPortal();

  const onClick = () =>
    createPortal((close) => <BadgeDetailModal {...props} close={close} />);

  return (
    <BadgeContainer {...{ onClick }} color={props.badge.color}>
      {props.badge.name}
    </BadgeContainer>
  );
}

const BadgesContainer = styled(FlexRow)`
  flex-wrap: wrap;
  margin-top: 5px;
`;

function Badges(props: { user: UserDetails }) {
  const allBadges = Object.values(USER_BADGES);

  const hasBadges = () =>
    allBadges.filter((badge) => hasBit(props.user.user.badges || 0, badge.bit));

  return (
    <Show when={hasBadges().length}>
      <BadgesContainer gap={3}>
        <For each={hasBadges()}>
          {(badge) => <Badge {...{ badge }} {...props} />}
        </For>
      </BadgesContainer>
    </Show>
  );
}

const BadgeDetailsModalContainer = styled(FlexColumn)`
  align-items: center;
  justify-content: center;
  min-height: 200px;
  min-width: 250px;
`;

function BadgeDetailModal(props: {
  badge: Badge;
  user: UserDetails;
  close(): void;
}) {
  const user = () => ({ ...props.user.user, badges: props.badge.bit });

  return (
    <Modal title={`${props.badge.name} Badge`} close={props.close}>
      <BadgeDetailsModalContainer gap={30}>
        <Avatar user={user()} size={80} animate />
        <Text>{props.badge.description}</Text>
      </BadgeDetailsModalContainer>
    </Modal>
  );
}

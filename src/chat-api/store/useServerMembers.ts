import { update } from 'idb-keyval';
import { Accessor, createMemo, mapArray } from 'solid-js';
import {createStore, reconcile} from 'solid-js/store';
import { addBit, Bitwise, hasBit, ROLE_PERMISSIONS } from '../Bitwise';
import { RawServerMember } from '../RawData';
import useServerRoles, { ServerRole } from './useServerRoles';
import useServers from './useServers';
import useStore from './useStore';
import useUsers, { User } from './useUsers';
import useAccount from './useAccount';
import useVoiceUsers from './useVoiceUsers';


export type ServerMember = Omit<RawServerMember, 'user'> & {
  userId: string
  user: User
  update: (this: ServerMember, update: Partial<ServerMember>) => void;
  roles: () => (ServerRole | undefined)[] ;
  hasRole:  (this: ServerMember, roleId: string) => boolean;
  permissions: () => number;
  hasPermission:  (this: ServerMember, bitwise: Bitwise, ignoreAdmin?: boolean) => boolean | void;
  topRole: () => ServerRole;
  roleColor: string;
  unhiddenRole: () => ServerRole;
  amIServerCreator: () => boolean;
  isServerCreator: () => boolean
}

const [serverMembers, setMember] = createStore<Record<string, Record<string, ServerMember | undefined> | undefined>>({});


const set = (member: RawServerMember) => {
  const users = useUsers();

  users.set(member.user);
  if (!serverMembers[member.serverId]) {
    setMember(member.serverId, {});
  }

  let topRole: Accessor<any>;
  let unhiddenRole: Accessor<any>;
  let permissions: Accessor<any>;
  setMember(member.serverId, {[member.user.id]: {
    ...member,
    userId: member.user.id,
    get user() {
      return users.get(member.user.id);
    },
    update(updated) {
      setMember(this.serverId, this.userId, updated);
    },
    get roles(){
      const servers = useServers();
      const server = servers.get(member.serverId);
      const roleIds = () => this.roleIds;
      return mapArray(roleIds, id => {
        const {serverRoles} = useStore();
        return serverRoles.get(member.serverId, id);
      })
    },
    hasRole(roleId) {
      const servers = useServers();
      const server = servers.get(member.serverId);
      if (server?.defaultRoleId === roleId) return true;
      return this.roleIds.includes(roleId);
    },
    get permissions () {
      if (permissions) return permissions();
      permissions = createMemo(() => {
        const servers = useServers();
        const roles = useServerRoles();
        const defaultRoleId = () => servers.get(member.serverId)?.defaultRoleId;
        const defaultRole = () => roles.get(member.serverId, defaultRoleId()!);

        return () => {
          let currentPermissions = 0;
          currentPermissions = addBit(currentPermissions, defaultRole()?.permissions || 0);
          const rolesArr = this.roles();
          for (let i = 0; i < rolesArr.length; i++) {
            const role = rolesArr[i];
            currentPermissions = addBit(currentPermissions, role?.permissions || 0);
          }
          return currentPermissions
        };
      });
      return permissions();
    },
    hasPermission(bitwise: Bitwise, ignoreAdmin = false) {
      if (!ignoreAdmin) {
        if (hasBit(this.permissions(), ROLE_PERMISSIONS.ADMIN.bit)) return true;
      }
      return hasBit(this.permissions(), bitwise.bit)
    },
    amIServerCreator() {
      const servers = useServers();
      const account = useAccount();
      const server = servers.get(this.serverId);

      return server!.createdById === account.user()?.id;
    },
    isServerCreator() {
      const servers = useServers();
      const server = servers.get(this.serverId);
      return server?.createdById === this.userId
    },
    get topRole() {
      if (topRole) return topRole();
      topRole = createMemo(() => {
        const servers = useServers();
        const roles = useServerRoles();
        const sortedRoles = () => this.roles().sort((a, b) => b?.order! - a?.order!);
        const defaultRoleId = () => servers.get(member.serverId)?.defaultRoleId;
        const defaultRole = () => roles.get(member.serverId, defaultRoleId()!);
        return () => sortedRoles()[0] || defaultRole();
      });
      return topRole();
    },
    get roleColor() {
      return this.topRole().hexColor;
    },
    get unhiddenRole() {
      if (unhiddenRole) return unhiddenRole();
      unhiddenRole = createMemo(() => {
        const sortedRoles = () => this.roles().sort((a, b) => b?.order! - a?.order!);
        return () => sortedRoles().find(role => !role?.hideRole)
      });
      return unhiddenRole();
    }
  }});


}

const remove = (serverId: string, userId: string) => {
  const users = useUsers();
  const voiceUsers = useVoiceUsers();
  const user = users.get(userId);
  
  const voiceChannelId = user?.voiceChannelId;
  voiceChannelId && voiceUsers.removeUserInVoice(voiceChannelId, userId);

  setMember(serverId, userId, undefined);
}

const removeAllServerMembers = (serverId: string) => {
  setMember(serverId, undefined);
}

const array = (serverId: string) => Object.values(serverMembers?.[serverId] || []);
const get = (serverId: string, userId: string) => serverMembers[serverId]?.[userId];

export default function useServerMembers() {
  return {
    array,
    set,
    remove,
    removeAllServerMembers,
    get
  }
}